import {
  createCredential,
  excluded,
  getCredential,
  matches,
  named,
  validateRequest
} from './webauthn.js'
import {
  changeVaultPassword,
  checkPassword,
  createVault,
  mergeRecords,
  openVault,
  publicRecords,
  readVault,
  seal,
  unwrapWithSecret,
  wrapWithSecret,
  writeVault
} from './vault.js'
import { exportBitwarden, parseImport } from './migration.js'
import { createCompanion } from './companion.js'
import { createSession, lockChoices, promptChoices, readSettings } from './session.js'
import { buildIndex, mayMatch } from './site-index.js'
import { decode } from './encoding.js'

const firefox = typeof __PASSKEYS_FIREFOX__ !== 'undefined' && __PASSKEYS_FIREFOX__
const uiUrl = chrome.runtime.getURL('ui.html')
const promptUrl = chrome.runtime.getURL('prompt.html')
const companion = createCompanion(chrome, uiUrl)
const session = createSession(chrome)
// Never expose local/session storage to content scripts.
const storageReady = Promise.all([
  chrome.storage.local.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.session.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' })
]).catch(() => {})
const load = async () => (await chrome.storage.local.get('vault')).vault
const pending = async () => (await chrome.storage.session.get('request')).request
/*
 * One of this extension's own pages. Content scripts report the website's URL,
 * and other extensions reach onMessageExternal, never this listener, so an
 * extension-scheme URL here is ours; the path says which page.
 */
const scheme = new URL(uiUrl).protocol
function page(sender, url) {
  if (sender.id !== chrome.runtime.id || typeof sender.url !== 'string') return false
  try {
    const from = new URL(sender.url)
    return from.protocol === scheme && from.pathname === new URL(url).pathname
  } catch {
    return false
  }
}
/** The extension's own manager page, in its own tab or window. */
const manager = (sender) => page(sender, uiUrl)
/** The confirmation shown inside a website, or in the small window opened for it. */
const prompt = (sender) => page(sender, promptUrl)
/*
 * Chrome names the exact document behind a message. Firefox does not, so a
 * Firefox request is tied to its tab, frame and origin, and a navigation in
 * that frame ends it (see onCommitted below).
 */
const documentOf = (sender) => (typeof sender.documentId === 'string' ? sender.documentId : null)
const sameCaller = (r, sender) =>
  r &&
  sender.tab?.id === r.tabId &&
  sender.frameId === r.frameId &&
  documentOf(sender) === r.documentId &&
  sender.origin === r.origin
async function stillThere(r) {
  const frame = await chrome.webNavigation.getFrame({ tabId: r.tabId, frameId: r.frameId })
  if (
    !frame ||
    (frame.documentId ?? null) !== r.documentId ||
    new URL(frame.url).origin !== r.origin
  )
    throw new Error('来源网站已经改变，请重新操作。')
}
async function requireRequest(token, sender) {
  const r = await pending()
  if (!r || r.token !== token || r.result || r.expires <= Date.now())
    throw new Error('请求已结束，请返回网站重新操作。')
  // A prompt answers only its own request: inside the asking tab, or in the window opened for it.
  if (
    sender &&
    prompt(sender) &&
    (r.mode === 'page' ? sender.tab?.id !== r.tabId : sender.tab?.windowId !== r.windowId)
  )
    throw new Error('确认窗口与请求来源不一致。')
  await stillThere(r)
  return r
}
async function complete(r, result) {
  await chrome.storage.session.set({ request: { ...r, result } })
}
const requestRpId = (r) =>
  r.kind === 'create'
    ? (r.options.rp.id ?? new URL(r.origin).hostname)
    : (r.options.rpId ?? new URL(r.origin).hostname)

async function store(envelope, records) {
  const { index } = await chrome.storage.local.get('index')
  await chrome.storage.local.set({ vault: envelope, index: await buildIndex(records, index) })
}
async function write(records, key) {
  await store(await writeVault(await load(), records, key), records)
}
/*
 * The unlocked vault. A password opens it and starts a quick-unlock session;
 * without one, the key kept in session memory is used. `fresh` insists on the
 * password for the operations that should never ride on an open session.
 */
async function vault(message, { fresh = false } = {}) {
  const envelope = await load()
  if (!envelope) throw new Error('请先创建本地密钥库。')
  if (typeof message.password === 'string' && message.password) {
    const opened = await openVault(envelope, message.password)
    if (opened.upgraded) await store(opened.upgraded, opened.records)
    await session.remember(opened.key)
    return { key: opened.key, records: opened.records }
  }
  if (fresh) throw named('请输入主口令确认此操作。', 'PasswordRequired')
  const key = await session.recall()
  if (!key || envelope.version !== 2) throw named('密钥库已锁定，请先解锁。', 'Locked')
  return { key, records: await readVault(envelope, key) }
}
async function settings() {
  return readSettings((await chrome.storage.local.get('settings')).settings)
}

async function begin(message, sender) {
  const documentId = documentOf(sender)
  if (
    sender.id !== chrome.runtime.id ||
    !sender.tab ||
    !Number.isInteger(sender.frameId) ||
    (!documentId && !firefox) ||
    !sender.origin ||
    new URL(sender.url).origin !== sender.origin
  )
    return null
  let rpId
  try {
    rpId = validateRequest(message.kind, message.options, sender.origin)
  } catch {
    return null
  }
  if ((await chrome.storage.local.get('paused')).paused) return null
  // A site the vault holds nothing for goes straight to the browser, locked or not.
  if (
    !(await mayMatch(
      (await chrome.storage.local.get('index')).index,
      message.kind,
      message.options,
      rpId
    ))
  )
    return null
  let topOrigin = null
  if (sender.frameId !== 0) {
    const top = await chrome.webNavigation.getFrame({ tabId: sender.tab.id, frameId: 0 })
    if (!top?.url) return null
    topOrigin = new URL(top.url).origin
  }
  return { rpId, documentId, topOrigin }
}

async function handle(message, sender) {
  await storageReady
  if (!message || typeof message.action !== 'string') throw new Error('请求不正确。')
  const { action } = message
  if (action.startsWith('site-')) return companion.site(message, sender)
  if (action === 'probe') {
    // Conditional (autofill) requests only ask whether to offer this vault at all.
    const context = await begin({ ...message, kind: 'get' }, sender)
    return { match: !!context }
  }
  if (action === 'begin') {
    const context = await begin(message, sender)
    if (!context) return { fallback: true }
    const old = await pending()
    // Keep a completed result until its caller consumes it; a second tab must not overwrite it.
    if (old && old.expires > Date.now()) return { fallback: true }
    const { prompt: where } = await settings()
    // Inside the page needs the visibility checks only Chrome has, and a top-level frame to sit in.
    const mode = where === 'page' && sender.frameId === 0 && !firefox ? 'page' : 'window'
    const r = {
      token: crypto.randomUUID(),
      kind: message.kind,
      options: message.options,
      origin: sender.origin,
      topOrigin: context.topOrigin,
      tabId: sender.tab.id,
      frameId: sender.frameId,
      documentId: context.documentId,
      mode,
      expires: Date.now() + 120000
    }
    await chrome.storage.session.set({ request: r })
    if (mode === 'window')
      try {
        const win = await chrome.windows.create({
          url: `${promptUrl}?request=${r.token}`,
          type: 'popup',
          width: 480,
          height: 700
        })
        await chrome.storage.session.set({ request: { ...r, windowId: win.id } })
      } catch {
        await chrome.storage.session.remove('request')
        return { fallback: true }
      }
    return { token: r.token, mode }
  }
  if (action === 'poll' || action === 'cancel') {
    const r = await pending()
    if (!sameCaller(r, sender) || r.token !== message.token)
      return { done: true, result: { error: '请求已失效。' } }
    if (action === 'cancel') {
      // The caller has cancelled and will not consume a result (including pagehide).
      await chrome.storage.session.remove('request')
      if (r.windowId) chrome.windows.remove(r.windowId).catch(() => {})
      return {}
    }
    if (r.result || r.expires <= Date.now()) {
      await chrome.storage.session.remove('request')
      return { done: true, result: r.result ?? { error: '请求已超时。' } }
    }
    return { done: false }
  }
  // Everything below reads or changes the vault, so it must come from the extension's own pages.
  const fromPrompt = prompt(sender)
  if (!manager(sender) && !fromPrompt) throw new Error('只有扩展管理页可以执行此操作。')
  // The in-page prompt answers one website request; it can unlock, choose and confirm, nothing more.
  if (
    fromPrompt &&
    (!message.token ||
      ![
        'status',
        'unlock',
        'device-unlock',
        'list',
        'approve',
        'exists',
        'fallback',
        'deny'
      ].includes(action))
  )
    throw new Error('此窗口不能执行该操作。')
  const management =
    !fromPrompt && message.companion ? await companion.requireRequest(message.companion) : null
  if (management) {
    const allowed = {
      list: [],
      import: ['inspect', 'import'],
      export: ['export'],
      remove: ['remove'],
      rename: ['rename']
    }
    if (
      !['status', 'unlock', 'device-unlock', 'list', 'companion-finish'].includes(action) &&
      !allowed[management.operation].includes(action)
    )
      throw new Error('此窗口不能执行该操作。')
    if (['export', 'remove'].includes(action)) message = { ...message, ids: management.ids }
    if (action === 'rename')
      message = { ...message, id: management.ids[0], label: management.label }
  }
  if (action === 'status') {
    const r = message.token ? await requireRequest(message.token, sender) : null
    const envelope = await load()
    const { device } = await chrome.storage.local.get('device')
    return {
      exists: !!envelope,
      unlocked: envelope?.version === 2 && (await session.unlocked()),
      paused: !!(await chrome.storage.local.get('paused')).paused,
      settings: await settings(),
      device:
        device && envelope?.version === 2
          ? { credentialId: device.credentialId, salt: device.salt }
          : null,
      companion: management && {
        operation: management.operation,
        ids: management.ids,
        label: management.label,
        origin: management.origin
      },
      request: r && {
        kind: r.kind,
        origin: r.origin,
        topOrigin: r.topOrigin,
        rpId: requestRpId(r),
        userName: r.options.user?.name,
        mode: r.mode,
        expires: r.expires
      }
    }
  }
  if (action === 'fallback' || action === 'deny') {
    const r = await requireRequest(message.token, sender)
    await complete(r, action === 'fallback' ? { fallback: true } : { error: '用户取消了操作。' })
    await session.settle()
    return {}
  }
  if (action === 'setup') {
    if (await load()) throw new Error('已有密钥库，请使用原主口令。')
    const created = await createVault([], message.password)
    await store(created.envelope, [])
    await session.remember(created.key)
    return {}
  }
  if (action === 'lock') {
    await session.forget()
    return {}
  }
  if (action === 'settings') {
    const next = { ...(await settings()) }
    if (message.lockAfter !== undefined) {
      if (!lockChoices.includes(message.lockAfter)) throw new Error('不支持此自动锁定时间。')
      next.lockAfter = message.lockAfter
    }
    if (message.prompt !== undefined) {
      if (!promptChoices.includes(message.prompt)) throw new Error('不支持此确认方式。')
      next.prompt = message.prompt
    }
    await chrome.storage.local.set({ settings: next })
    // A shorter timeout applies from now, not from the next unlock.
    const key = await session.recall()
    if (key) await session.remember(key)
    return { settings: next }
  }
  if (action === 'pause') {
    await chrome.storage.local.set({ paused: !!message.paused })
    return {}
  }
  if (action === 'device-unlock') {
    const envelope = await load()
    const { device } = await chrome.storage.local.get('device')
    if (!envelope || envelope.version !== 2 || !device) throw new Error('尚未启用设备解锁。')
    if (message.credentialId !== device.credentialId) throw new Error('设备凭据不匹配。')
    const key = await unwrapWithSecret(device.box, message.secret)
    await readVault(envelope, key)
    await session.remember(key)
    if (message.token) await requireRequest(message.token, sender)
    return {}
  }
  if (action === 'device-disable') {
    await chrome.storage.local.remove('device')
    return {}
  }
  const { key, records } = await vault(message, {
    fresh: ['export', 'password', 'device-enable'].includes(action)
  })
  if (management) await companion.requireRequest(message.companion)
  if (action === 'unlock') {
    if (message.token) await requireRequest(message.token, sender)
    return {}
  }
  if (action === 'device-enable') {
    if (typeof message.credentialId !== 'string' || !decode(message.credentialId, 1024).length)
      throw new Error('设备凭据不正确。')
    if (decode(message.salt, 64).length !== 32) throw new Error('设备凭据不正确。')
    await chrome.storage.local.set({
      device: {
        credentialId: message.credentialId,
        salt: message.salt,
        box: await wrapWithSecret(key, message.secret),
        createdAt: Date.now()
      }
    })
    return {}
  }
  if (action === 'companion-finish') {
    if (!management) throw new Error('没有网站管理请求。')
    return companion.finish(message.companion, records)
  }
  if (action === 'list') {
    if (!message.token) return { records: publicRecords(records) }
    const r = await requireRequest(message.token, sender)
    const rpId = validateRequest(r.kind, r.options, r.origin)
    if (r.kind === 'create') return { records: [], excluded: excluded(r.options, rpId, records) }
    return { records: publicRecords(matches(records, r.options, rpId)) }
  }
  if (action === 'exists') {
    // The site learns the account already has a passkey here only after the user has unlocked.
    const r = await requireRequest(message.token, sender)
    if (
      r.kind !== 'create' ||
      !excluded(r.options, validateRequest(r.kind, r.options, r.origin), records)
    )
      throw new Error('此请求不是重复创建。')
    await complete(r, {
      error: '此账号已有保存在这里的通行密钥。',
      name: 'InvalidStateError'
    })
    await session.settle()
    return {}
  }
  if (action === 'approve') {
    const r = await requireRequest(message.token, sender)
    const rpId = requestRpId(r)
    const selected =
      r.kind === 'get'
        ? records.find((v) => v.credentialId === message.credentialId && v.rpId === rpId)
        : null
    if (r.kind === 'get' && !selected) throw new Error('请选择此网站的通行密钥。')
    if (r.kind === 'create' && records.length >= 1000) throw new Error('最多保存 1000 条通行密钥。')
    const context = { topOrigin: r.topOrigin }
    const value =
      r.kind === 'create'
        ? await createCredential(r.options, r.origin, records, context)
        : await getCredential(r.options, r.origin, selected, context)
    // Recheck expiry after crypto; sign only for the still-active request.
    await requireRequest(message.token, sender)
    const next =
      r.kind === 'create'
        ? [...records, value.record]
        : records.map((v) => (v === selected ? value.record : v))
    await write(next, key)
    await complete(r, { value: value.response })
    await session.settle()
    return { kind: r.kind }
  }
  if (action === 'rename') {
    const label = typeof message.label === 'string' ? message.label.trim() : ''
    if (label.length > 256) throw new Error('名称最多 256 个字符。')
    const index = records.findIndex((r) => `${r.rpId}:${r.credentialId}` === message.id)
    if (index < 0) throw new Error('找不到这把通行密钥。')
    const next = records.map((r, i) => (i === index ? { ...r, label: label || null } : r))
    await write(next, key)
    return { records: publicRecords(next) }
  }
  if (action === 'remove') {
    if (!Array.isArray(message.ids) || !message.ids.length) throw new Error('请选择要移除的凭据。')
    await write(
      records.filter((r) => !message.ids.includes(`${r.rpId}:${r.credentialId}`)),
      key
    )
    return {}
  }
  if (action === 'password') {
    // Only the wrap around the vault key changes; the records and any device unlock stay valid.
    const envelope = await changeVaultPassword(await load(), key, message.nextPassword)
    await store(envelope, records)
    return {}
  }
  if (action === 'inspect' || action === 'import') {
    const incoming = await parseImport(message.text, message.backupPassword)
    const merged = mergeRecords(records, incoming.records)
    if (management) await companion.requireRequest(message.companion)
    if (action === 'import') await write(merged.records, key)
    return {
      added: merged.added,
      duplicates: merged.duplicates,
      skipped: incoming.skipped,
      source: incoming.source,
      records: publicRecords(incoming.records)
    }
  }
  if (action === 'export') {
    const ids = message.ids ?? []
    const selected = records.filter((r) => ids.includes(`${r.rpId}:${r.credentialId}`))
    if (!selected.length) throw new Error('请选择要导出的通行密钥。')
    let file
    if (message.format === 'bitwarden') {
      if (message.confirmPlaintext !== true) throw new Error('请确认明文文件包含通行密钥私钥。')
      file = { text: exportBitwarden(selected), filename: '2fa-hot-passkeys-bitwarden.json' }
    } else {
      checkPassword(message.backupPassword)
      file = {
        text: JSON.stringify(await seal(selected, message.backupPassword)),
        filename: '2fa-hot-passkeys.2fapasskeys'
      }
    }
    // A copy now exists outside this vault: its "backed up" flag tells sites so from the next sign-in.
    await write(
      records.map((r) =>
        ids.includes(`${r.rpId}:${r.credentialId}`) ? { ...r, backupState: true } : r
      ),
      key
    )
    return file
  }
  throw new Error('不支持此操作。')
}
// Serialize mutations so two extension windows cannot lose records or roll back counters.
let queue = Promise.resolve()
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  const job = queue.then(() => handle(message, sender))
  queue = job.catch(() => {})
  job.then(
    (value) => respond({ ok: true, ...value }),
    (error) =>
      respond({
        ok: false,
        error: error.message || '无法完成操作。',
        code: ['Locked', 'PasswordRequired'].includes(error.name) ? error.name : undefined
      })
  )
  return true
})
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage())
chrome.windows.onRemoved.addListener((id) => {
  queue = queue
    .then(async () => {
      await companion.cancelled(id)
      const r = await pending()
      if (r?.windowId === id && !r.result) await complete(r, { error: '用户关闭了确认窗口。' })
    })
    .catch(() => {})
})
// Locking the computer locks the vault.
chrome.idle?.onStateChanged.addListener((state) => {
  if (state === 'locked') queue = queue.then(() => session.forget()).catch(() => {})
})
if (firefox)
  chrome.webNavigation.onCommitted.addListener(({ tabId, frameId }) => {
    queue = queue
      .then(async () => {
        const r = await pending()
        if (r && r.tabId === tabId && r.frameId === frameId && !r.result)
          await complete(r, { error: '来源网站已经改变，请重新操作。' })
      })
      .catch(() => {})
  })
chrome.alarms.create('expire', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener(() => {
  queue = queue
    .then(async () => {
      await companion.expire()
      if (!(await session.unlocked())) await session.forget()
      const r = await pending()
      if (r && r.expires + 60000 < Date.now()) await chrome.storage.session.remove('request')
    })
    .catch(() => {})
})
