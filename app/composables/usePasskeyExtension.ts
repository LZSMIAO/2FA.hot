import {
  readPasskeySummaries,
  type PasskeyOperation,
  type PasskeySummary
} from '~~/shared/passkey-manager'
import { passkeyBrowser } from '~/utils/passkey-platform'
const namespace = '2fa.hot/passkeys/site/v1'
interface Reply {
  ok: boolean
  version?: string
  managerProtocol?: number
  token?: string
  done?: boolean
  cancelled?: boolean
  records?: unknown
}

export function usePasskeyExtension() {
  const status = shallowRef<'checking' | 'installed' | 'missing' | 'unsupported'>('checking')
  const version = shallowRef('')
  const supportedManager = shallowRef(false)
  const browser = shallowRef<'chrome' | 'edge' | 'other'>('other')
  const records = shallowRef<PasskeySummary[] | null>(null)
  const managing = shallowRef(false)
  const outcome = shallowRef<'failed' | 'cancelled' | 'completed' | ''>('')
  let requestToken = '',
    disposed = false,
    requestEpoch = 0
  let expiry: ReturnType<typeof setTimeout> | undefined
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  const pending = new Map<
    string,
    { finish: (data: Reply) => void; timer: ReturnType<typeof setTimeout> }
  >()

  function receive(event: MessageEvent) {
    const data = event.data
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      data?.namespace !== namespace ||
      data.direction !== 'response'
    )
      return
    const request = pending.get(data.id)
    if (!request) return
    clearTimeout(request.timer)
    pending.delete(data.id)
    request.finish(data)
  }
  function send(action: string, values: Record<string, unknown> = {}) {
    return new Promise<Reply>((finish) => {
      const id = crypto.randomUUID()
      const timer = setTimeout(() => {
        pending.delete(id)
        finish({ ok: false })
      }, 5000)
      pending.set(id, { finish, timer })
      try {
        window.postMessage(
          { namespace, direction: 'request', id, action, ...values },
          location.origin
        )
      } catch {
        clearTimeout(timer)
        pending.delete(id)
        finish({ ok: false })
      }
    })
  }
  function clearList() {
    clearTimeout(expiry)
    records.value = null
  }
  function cancel() {
    requestEpoch++
    outcome.value = 'cancelled'
    clearTimeout(pollTimer)
    if (requestToken) void send('cancel', { token: requestToken })
    requestToken = ''
    managing.value = false
  }
  function lock() {
    cancel()
    clearList()
    outcome.value = ''
  }
  async function check() {
    if (managing.value || pending.size || disposed) return
    if (status.value !== 'installed') status.value = 'checking'
    const response = await send('status')
    if (disposed) return
    version.value = typeof response.version === 'string' ? response.version.slice(0, 32) : ''
    supportedManager.value = response.managerProtocol === 1
    status.value = response.ok ? 'installed' : browser.value === 'other' ? 'unsupported' : 'missing'
    if (!response.ok) clearList()
  }
  async function poll(token: string, deadline: number) {
    if (disposed || token !== requestToken) return
    const response = await send('result', { token })
    if (disposed || token !== requestToken) return
    if (!response.ok || Date.now() > deadline) {
      cancel()
      outcome.value = 'failed'
      return
    }
    if (!response.done) {
      pollTimer = setTimeout(() => void poll(token, deadline), 600)
      return
    }
    managing.value = false
    requestToken = ''
    if (response.cancelled) {
      outcome.value = 'cancelled'
      return
    }
    const list = readPasskeySummaries(response.records)
    if (!list) {
      outcome.value = 'failed'
      return
    }
    clearList()
    records.value = list
    expiry = setTimeout(clearList, 5 * 60000)
    outcome.value = 'completed'
  }
  async function manage(operation: PasskeyOperation, ids: string[] = []) {
    if (managing.value || !supportedManager.value) return
    const epoch = ++requestEpoch
    managing.value = true
    outcome.value = ''
    const response = await send('manage', { operation, ids: [...ids] })
    if (disposed || epoch !== requestEpoch) {
      if (response.token) void send('cancel', { token: response.token })
      return
    }
    if (!response.ok || typeof response.token !== 'string') {
      managing.value = false
      outcome.value = 'failed'
      return
    }
    requestToken = response.token
    void poll(requestToken, Date.now() + 5 * 60000)
  }
  onMounted(() => {
    browser.value = passkeyBrowser(
      navigator.userAgent,
      navigator.platform,
      navigator.maxTouchPoints
    )
    window.addEventListener('message', receive)
    window.addEventListener('focus', check)
    window.addEventListener('pagehide', lock)
    void check()
  })
  onBeforeUnmount(() => {
    disposed = true
    lock()
    window.removeEventListener('message', receive)
    window.removeEventListener('focus', check)
    window.removeEventListener('pagehide', lock)
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.finish({ ok: false })
    }
    pending.clear()
  })
  return {
    status,
    version,
    browser,
    supportedManager,
    records,
    managing,
    outcome,
    check,
    manage,
    lock,
    cancel
  }
}
