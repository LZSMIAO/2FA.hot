import { isCompanionOrigin } from './site-access.js'

export const companionOperations = ['list', 'import', 'export', 'remove']
// Only the metadata needed by the website is allowed across this boundary.
export function companionRecords(records) {
  return records.map(
    ({ rpId, credentialId, userName, userDisplayName, createdAt, lastUsedAt }) => ({
      rpId,
      credentialId,
      userName,
      userDisplayName,
      createdAt,
      lastUsedAt
    })
  )
}

export function createCompanion(chrome, uiUrl) {
  const load = async () => (await chrome.storage.session.get('companion')).companion
  const save = (r) => chrome.storage.session.set({ companion: r })
  const sameCaller = (r, sender) =>
    r &&
    sender.tab?.id === r.tabId &&
    sender.frameId === 0 &&
    sender.documentId === r.documentId &&
    sender.origin === r.origin
  async function current(r) {
    const frame = await chrome.webNavigation.getFrame({ tabId: r.tabId, frameId: 0 })
    if (!frame || frame.documentId !== r.documentId || new URL(frame.url).origin !== r.origin)
      throw new Error('来源页面已经改变，请返回网站重新操作。')
  }
  async function requireRequest(token) {
    const r = await load()
    if (!r || r.token !== token || r.result || r.expires <= Date.now())
      throw new Error('请求已结束，请返回网站重新操作。')
    await current(r)
    return r
  }
  async function close(r) {
    if (r?.windowId) await chrome.windows.remove(r.windowId).catch(() => {})
  }
  async function site(message, sender) {
    if (
      sender.id !== chrome.runtime.id ||
      sender.frameId !== 0 ||
      !sender.tab ||
      !sender.documentId ||
      !isCompanionOrigin(sender.origin) ||
      new URL(sender.url).origin !== sender.origin
    )
      throw new Error('只有本站可以连接扩展。')
    await current({ tabId: sender.tab.id, documentId: sender.documentId, origin: sender.origin })
    const { action } = message
    if (action === 'site-status')
      return { version: chrome.runtime.getManifest().version, managerProtocol: 1 }
    // Compatibility for older companion pages; never returns vault data.
    if (action === 'site-open') {
      await chrome.runtime.openOptionsPage()
      return {}
    }
    const old = await load()
    if (action === 'site-manage') {
      if (!companionOperations.includes(message.operation)) throw new Error('不支持此操作。')
      if (old && old.expires > Date.now())
        throw new Error('另一个管理请求正在进行，请先完成或取消。')
      const ids = message.ids ?? []
      if (
        !Array.isArray(ids) ||
        ids.length > 1000 ||
        ids.some((id) => typeof id !== 'string' || id.length > 1800) ||
        (['export', 'remove'].includes(message.operation) && !ids.length)
      )
        throw new Error('请选择要操作的通行密钥。')
      await close(old)
      const r = {
        token: crypto.randomUUID(),
        operation: message.operation,
        ids: [...new Set(ids)],
        tabId: sender.tab.id,
        documentId: sender.documentId,
        origin: sender.origin,
        expires: Date.now() + 5 * 60000
      }
      await save(r)
      try {
        const win = await chrome.windows.create({
          url: `${uiUrl}?companion=${r.token}`,
          type: 'popup',
          width: 520,
          height: 740
        })
        await save({ ...r, windowId: win.id })
      } catch (error) {
        await chrome.storage.session.remove('companion')
        throw error
      }
      return { token: r.token }
    }
    if (!sameCaller(old, sender) || old.token !== message.token) throw new Error('请求已失效。')
    if (action === 'site-cancel' || old.expires <= Date.now()) {
      await chrome.storage.session.remove('companion')
      await close(old)
      return { done: true, cancelled: true }
    }
    if (action === 'site-result') {
      if (!old.result) return { done: false }
      await chrome.storage.session.remove('companion')
      return { done: true, ...old.result }
    }
    throw new Error('不支持此操作。')
  }
  async function finish(token, records) {
    const r = await requireRequest(token)
    await save({ ...r, result: { records: companionRecords(records) } })
    return {}
  }
  async function cancelled(windowId) {
    const r = await load()
    if (r?.windowId === windowId && !r.result) await save({ ...r, result: { cancelled: true } })
  }
  async function expire() {
    const r = await load()
    if (r && r.expires <= Date.now()) {
      await chrome.storage.session.remove('companion')
      await close(r)
    }
  }
  return { site, requireRequest, finish, cancelled, expire }
}
