const namespace = '2fa.hot/passkeys/site/v1'

export function usePasskeyExtension() {
  const status = shallowRef<'checking' | 'installed' | 'missing' | 'unsupported'>('checking')
  const version = shallowRef('')
  const opening = shallowRef(false)
  const openResult = shallowRef<'opened' | 'failed' | ''>('')
  const browser = shallowRef<'chrome' | 'edge' | 'other'>('other')
  const pending = new Map<
    string,
    {
      finish: (data: { ok: boolean; version?: string }) => void
      timer: ReturnType<typeof setTimeout>
    }
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
    request.finish({
      ok: data.ok === true,
      version: typeof data.version === 'string' ? data.version.slice(0, 32) : undefined
    })
  }

  function send(action: 'status' | 'open') {
    return new Promise<{ ok: boolean; version?: string }>((finish) => {
      const id = crypto.randomUUID()
      const timer = setTimeout(() => {
        pending.delete(id)
        finish({ ok: false })
      }, 2000)
      pending.set(id, { finish, timer })
      window.postMessage({ namespace, direction: 'request', id, action }, location.origin)
    })
  }

  async function check() {
    if (pending.size) return
    status.value = 'checking'
    const response = await send('status')
    version.value = response.version || ''
    status.value = response.ok ? 'installed' : browser.value === 'other' ? 'unsupported' : 'missing'
  }

  async function open() {
    if (opening.value) return
    opening.value = true
    openResult.value = ''
    try {
      const response = await send('open')
      openResult.value = response.ok ? 'opened' : 'failed'
    } finally {
      opening.value = false
    }
  }

  onMounted(() => {
    const agent = navigator.userAgent
    if (!/Android|iPhone|iPad|Mobile/i.test(agent)) {
      browser.value = /Edg\//.test(agent) ? 'edge' : /Chrome\//.test(agent) ? 'chrome' : 'other'
    }
    window.addEventListener('message', receive)
    window.addEventListener('focus', check)
    void check()
  })
  onBeforeUnmount(() => {
    window.removeEventListener('message', receive)
    window.removeEventListener('focus', check)
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.finish({ ok: false })
    }
    pending.clear()
  })
  return { status, version, browser, opening, openResult, check, open }
}
