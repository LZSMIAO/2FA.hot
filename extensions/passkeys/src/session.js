import { decode, encode } from './encoding.js'

/** Minutes a vault stays unlocked after its last use; 0 asks every time, -1 until the browser closes. */
export const lockChoices = [0, 5, 15, 60, -1]
export const promptChoices = ['page', 'window']
export const defaultSettings = { lockAfter: 15, prompt: 'page' }

export function readSettings(value) {
  const settings = { ...defaultSettings }
  if (lockChoices.includes(value?.lockAfter)) settings.lockAfter = value.lockAfter
  if (promptChoices.includes(value?.prompt)) settings.prompt = value.prompt
  return settings
}

/*
 * The unlocked vault key is kept in session storage only: in memory, readable
 * by the extension's trusted pages, and gone when the browser closes. Every
 * use pushes the deadline out, so it behaves like an idle timeout.
 */
export function createSession(chrome) {
  async function settings() {
    return readSettings((await chrome.storage.local.get('settings')).settings)
  }
  const deadline = (lockAfter) => (lockAfter < 0 ? null : Date.now() + lockAfter * 60000)
  async function remember(key) {
    const { lockAfter } = await settings()
    // "Ask every time" still needs the key for the request being approved; it is dropped after.
    await chrome.storage.session.set({
      unlocked: {
        key: encode(key),
        until: lockAfter === 0 ? Date.now() + 120000 : deadline(lockAfter),
        once: lockAfter === 0
      }
    })
  }
  async function recall() {
    const { unlocked } = await chrome.storage.session.get('unlocked')
    if (!unlocked) return null
    if (unlocked.until !== null && unlocked.until <= Date.now()) {
      await forget()
      return null
    }
    if (!unlocked.once) {
      const { lockAfter } = await settings()
      await chrome.storage.session.set({ unlocked: { ...unlocked, until: deadline(lockAfter) } })
    }
    return decode(unlocked.key, 32)
  }
  /** After a request completes, a vault set to ask every time locks again. */
  async function settle() {
    const { unlocked } = await chrome.storage.session.get('unlocked')
    if (unlocked?.once) await forget()
  }
  async function unlocked() {
    const { unlocked } = await chrome.storage.session.get('unlocked')
    return !!unlocked && (unlocked.until === null || unlocked.until > Date.now())
  }
  const forget = () => chrome.storage.session.remove('unlocked')
  return { settings, remember, recall, settle, unlocked, forget }
}
