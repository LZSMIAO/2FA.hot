import { createCredential, getCredential, matches, validateRequest } from './webauthn.js'
import { checkPassword, mergeRecords, publicRecords, seal, unseal } from './vault.js'
import { exportBitwarden, parseImport } from './migration.js'
import { isCompanionOrigin } from './site-access.js'

const uiUrl = chrome.runtime.getURL('ui.html')
// Never expose local/session storage to content scripts.
const storageReady = Promise.all([
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
])
const load = async () => (await chrome.storage.local.get('vault')).vault
const pending = async () => (await chrome.storage.session.get('request')).request
const internal = (sender) =>
  sender.id === chrome.runtime.id && sender.url?.split(/[?#]/)[0] === uiUrl
const sameCaller = (r, sender) =>
  r &&
  sender.tab?.id === r.tabId &&
  sender.frameId === 0 &&
  sender.documentId === r.documentId &&
  sender.origin === r.origin
async function update(records, password) {
  await chrome.storage.local.set({ vault: await seal(records, password) })
}
async function requireRequest(token) {
  const r = await pending()
  if (!r || r.token !== token || r.result || r.expires <= Date.now())
    throw new Error('请求已结束，请返回网站重新操作。')
  const frame = await chrome.webNavigation.getFrame({ tabId: r.tabId, frameId: 0 })
  if (!frame || frame.documentId !== r.documentId || new URL(frame.url).origin !== r.origin)
    throw new Error('来源网站已经改变，请重新操作。')
  return r
}
async function complete(r, result) {
  await chrome.storage.session.set({ request: { ...r, result } })
}
async function handle(message, sender) {
  await storageReady
  if (!message || typeof message.action !== 'string') throw new Error('请求不正确。')
  const { action } = message
  if (action === 'site-status' || action === 'site-open') {
    if (
      sender.id !== chrome.runtime.id ||
      sender.frameId !== 0 ||
      !sender.tab ||
      !sender.documentId ||
      !isCompanionOrigin(sender.origin) ||
      new URL(sender.url).origin !== sender.origin
    )
      throw new Error('只有本站可以连接扩展。')
    const frame = await chrome.webNavigation.getFrame({ tabId: sender.tab.id, frameId: 0 })
    if (
      !frame ||
      frame.documentId !== sender.documentId ||
      new URL(frame.url).origin !== sender.origin
    )
      throw new Error('来源网站已经改变，请刷新页面。')
    if (action === 'site-open') await chrome.runtime.openOptionsPage()
    return { version: chrome.runtime.getManifest().version }
  }
  if (action === 'begin') {
    if (
      sender.id !== chrome.runtime.id ||
      sender.frameId !== 0 ||
      !sender.tab ||
      !sender.documentId ||
      !sender.origin ||
      new URL(sender.url).origin !== sender.origin
    )
      return { fallback: true }
    const old = await pending()
    // Keep a completed result until its caller consumes it; a second tab must not overwrite it.
    if (old && old.expires > Date.now()) return { fallback: true }
    try {
      validateRequest(message.kind, message.options, sender.origin)
    } catch {
      return { fallback: true }
    }
    if ((await chrome.storage.local.get('paused')).paused) return { fallback: true }
    const r = {
      token: crypto.randomUUID(),
      kind: message.kind,
      options: message.options,
      origin: sender.origin,
      tabId: sender.tab.id,
      documentId: sender.documentId,
      expires: Date.now() + 120000
    }
    await chrome.storage.session.set({ request: r })
    try {
      const win = await chrome.windows.create({
        url: `${uiUrl}?request=${r.token}`,
        type: 'popup',
        width: 480,
        height: 700
      })
      await chrome.storage.session.set({ request: { ...r, windowId: win.id } })
    } catch {
      await chrome.storage.session.remove('request')
      return { fallback: true }
    }
    return { token: r.token }
  }
  if (action === 'poll' || action === 'cancel') {
    const r = await pending()
    if (!sameCaller(r, sender) || r.token !== message.token)
      return { done: true, result: { error: '请求已失效。' } }
    if (action === 'cancel') {
      await complete(r, { error: '请求已取消。' })
      if (r.windowId) chrome.windows.remove(r.windowId).catch(() => {})
      return {}
    }
    if (r.result || r.expires <= Date.now()) {
      await chrome.storage.session.remove('request')
      return { done: true, result: r.result ?? { error: '请求已超时。' } }
    }
    return { done: false }
  }
  // Page-world messages can never invoke any management operation.
  if (!internal(sender)) throw new Error('只有扩展管理页可以执行此操作。')
  if (action === 'status') {
    const r = message.token ? await requireRequest(message.token) : null
    return {
      exists: !!(await load()),
      paused: !!(await chrome.storage.local.get('paused')).paused,
      request: r && {
        kind: r.kind,
        origin: r.origin,
        rpId:
          r.kind === 'create'
            ? (r.options.rp.id ?? new URL(r.origin).hostname)
            : (r.options.rpId ?? new URL(r.origin).hostname),
        userName: r.options.user?.name,
        expires: r.expires
      }
    }
  }
  if (action === 'fallback' || action === 'deny') {
    const r = await requireRequest(message.token)
    await complete(r, action === 'fallback' ? { fallback: true } : { error: '用户取消了操作。' })
    return {}
  }
  if (action === 'setup') {
    if (await load()) throw new Error('已有密钥库，请使用原主口令。')
    checkPassword(message.password)
    await update([], message.password)
    return {}
  }
  const envelope = await load()
  if (!envelope) throw new Error('请先创建本地密钥库。')
  const records = await unseal(envelope, message.password)
  if (action === 'list') {
    if (!message.token) return { records: publicRecords(records) }
    const r = await requireRequest(message.token)
    const rpId = validateRequest(r.kind, r.options, r.origin)
    return { records: publicRecords(r.kind === 'get' ? matches(records, r.options, rpId) : []) }
  }
  if (action === 'approve') {
    const r = await requireRequest(message.token)
    const selected = records.find(
      (v) =>
        v.credentialId === message.credentialId &&
        v.rpId === (r.options.rpId ?? new URL(r.origin).hostname)
    )
    if (r.kind === 'get' && !selected) throw new Error('请选择此网站的通行密钥。')
    if (r.kind === 'create' && records.length >= 1000) throw new Error('最多保存 1000 条通行密钥。')
    const value =
      r.kind === 'create'
        ? await createCredential(r.options, r.origin, records)
        : await getCredential(r.options, r.origin, selected)
    // Recheck expiry after crypto; sign only for the still-active request.
    await requireRequest(message.token)
    const next =
      r.kind === 'create'
        ? [...records, value.record]
        : records.map((v) => (v === selected ? value.record : v))
    await update(next, message.password)
    await complete(r, { value: value.response })
    return { kind: r.kind }
  }
  if (action === 'pause') {
    await chrome.storage.local.set({ paused: !!message.paused })
    return {}
  }
  if (action === 'remove') {
    if (!Array.isArray(message.ids) || !message.ids.length) throw new Error('请选择要移除的凭据。')
    await update(
      records.filter((r) => !message.ids.includes(`${r.rpId}:${r.credentialId}`)),
      message.password
    )
    return {}
  }
  if (action === 'password') {
    checkPassword(message.nextPassword)
    await update(records, message.nextPassword)
    return {}
  }
  if (action === 'inspect' || action === 'import') {
    const incoming = await parseImport(message.text, message.backupPassword)
    const merged = mergeRecords(records, incoming.records)
    if (action === 'import') await update(merged.records, message.password)
    return {
      added: merged.added,
      duplicates: merged.duplicates,
      skipped: incoming.skipped,
      source: incoming.source,
      records: publicRecords(incoming.records)
    }
  }
  if (action === 'export') {
    const selected = records.filter((r) => message.ids?.includes(`${r.rpId}:${r.credentialId}`))
    if (!selected.length) throw new Error('请选择要导出的通行密钥。')
    if (message.format === 'bitwarden') {
      if (message.confirmPlaintext !== true) throw new Error('请确认明文文件包含通行密钥私钥。')
      return { text: exportBitwarden(selected), filename: '2fa-hot-passkeys-bitwarden.json' }
    }
    checkPassword(message.backupPassword)
    return {
      text: JSON.stringify(await seal(selected, message.backupPassword)),
      filename: '2fa-hot-passkeys.2fapasskeys'
    }
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
    (error) => respond({ ok: false, error: error.message || '无法完成操作。' })
  )
  return true
})
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage())
chrome.windows.onRemoved.addListener((id) => {
  queue = queue
    .then(async () => {
      const r = await pending()
      if (r?.windowId === id && !r.result) await complete(r, { error: '用户关闭了确认窗口。' })
    })
    .catch(() => {})
})
chrome.alarms.create('expire', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener(() => {
  queue = queue
    .then(async () => {
      const r = await pending()
      if (r && r.expires + 60000 < Date.now()) await chrome.storage.session.remove('request')
    })
    .catch(() => {})
})
