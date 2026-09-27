;(() => {
  const namespace = '2fa.hot/passkeys/v1',
    // Page request id -> background token (null while starting).
    active = new Map(),
    // Conditional (autofill) request id -> its options, while the site waits.
    offers = new Map()
  const reply = (id, value) =>
    window.postMessage({ namespace, direction: 'response', id, ...value }, location.origin)
  const send = (message) => chrome.runtime.sendMessage(message)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const withdraw = (token) => send({ action: 'cancel', token }).catch(() => {})
  const permitted = (kind) =>
    window.isSecureContext &&
    document.featurePolicy?.allowsFeature(`publickey-credentials-${kind}`) !== false

  /*
   * The confirmation inside the page: the extension's own prompt page in an
   * iframe, held in the browser's top layer above anything the site draws.
   * The site cannot read into it, and the prompt refuses to confirm while
   * anything covers it (see prompt.js).
   */
  function mount(token) {
    const host = document.createElement('div')
    host.setAttribute('popover', 'manual')
    host.style.cssText =
      'all:initial;display:block;position:fixed;inset:16px 16px auto auto;' +
      'width:min(400px,calc(100vw - 32px));height:min(560px,calc(100vh - 32px));' +
      'margin:0;padding:0;border:0;background:transparent;overflow:visible;z-index:2147483647'
    const root = host.attachShadow({ mode: 'closed' })
    const frame = document.createElement('iframe')
    frame.src = chrome.runtime.getURL(`prompt.html?request=${encodeURIComponent(token)}`)
    // Lets the prompt unlock with Touch ID or Windows Hello from inside the page.
    frame.allow = 'publickey-credentials-get *'
    frame.title = '2fa.hot 通行密钥'
    frame.setAttribute(
      'style',
      'display:block;width:100%;height:100%;border:0;border-radius:12px;' +
        'box-shadow:0 18px 48px rgba(0,0,0,.35);background:transparent;color-scheme:normal'
    )
    root.append(frame)
    document.documentElement.append(host)
    try {
      host.showPopover()
    } catch {}
    frame.addEventListener('load', () => frame.focus(), { once: true })
    return host
  }

  /** Runs one request through the background and answers with its result, or null if the page left. */
  async function perform(id, kind, options) {
    if (active.size) return { fallback: true }
    active.set(id, null)
    let overlay
    try {
      const started = await send({ action: 'begin', kind, options })
      if (!active.has(id)) {
        if (started.token) withdraw(started.token)
        return null
      }
      if (!started.token) return { fallback: true }
      active.set(id, started.token)
      if (started.mode === 'page') overlay = mount(started.token)
      while (active.has(id)) {
        await sleep(400)
        const status = await send({ action: 'poll', token: started.token })
        if (status.done) return status.result
      }
      return null
    } catch {
      return { fallback: true }
    } finally {
      active.delete(id)
      overlay?.remove()
    }
  }

  window.addEventListener('message', async (event) => {
    const data = event.data
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      data?.namespace !== namespace ||
      typeof data.id !== 'string'
    )
      return
    if (data.direction === 'cancel') {
      const token = active.get(data.id)
      active.delete(data.id)
      if (token) withdraw(token)
      if (offers.delete(data.id)) refreshOffer()
      return
    }
    if (data.direction === 'conditional') {
      if (!permitted('get')) return
      try {
        const probe = await send({ action: 'probe', options: data.options })
        if (!probe?.match) return
      } catch {
        return
      }
      offers.set(data.id, data.options)
      refreshOffer()
      return
    }
    if (data.direction !== 'request') return
    if (!['create', 'get'].includes(data.kind) || !permitted(data.kind)) {
      reply(data.id, { fallback: true })
      return
    }
    const result = await perform(data.id, data.kind, data.options)
    if (result) reply(data.id, result)
  })
  window.addEventListener('pagehide', () => {
    for (const token of active.values()) if (token) withdraw(token)
    active.clear()
    offers.clear()
  })

  /*
   * The autofill offer. A site that asks for conditional sign-in marks its
   * username field with autocomplete="… webauthn"; while that field has focus,
   * a button under it signs in with this vault. The browser's own suggestions
   * for passkeys held elsewhere stay where they are.
   */
  let offer = null,
    field = null
  const eligible = (element) =>
    element instanceof HTMLInputElement &&
    (element.autocomplete || element.getAttribute('autocomplete') || '')
      .toLowerCase()
      .split(/\s+/)
      .includes('webauthn')
  function buildOffer() {
    const host = document.createElement('div')
    host.setAttribute('popover', 'manual')
    host.style.cssText =
      'all:initial;display:block;position:fixed;margin:0;padding:0;border:0;' +
      'background:transparent;overflow:visible;z-index:2147483647'
    const root = host.attachShadow({ mode: 'closed' })
    const style = document.createElement('style')
    style.textContent =
      'button{all:initial;box-sizing:border-box;display:flex;align-items:center;gap:8px;' +
      'min-height:40px;padding:8px 12px;border-radius:8px;cursor:pointer;' +
      'font:500 14px/1.3 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
      'color:#f4f4f5;background:#18181b;box-shadow:0 8px 24px rgba(0,0,0,.28);border:1px solid #3f3f46}' +
      'button:hover,button:focus-visible{background:#27272a;outline:2px solid #4ade80;outline-offset:1px}' +
      'span{font-weight:700;color:#4ade80}'
    const button = document.createElement('button')
    button.type = 'button'
    const mark = document.createElement('span')
    mark.textContent = '2fa.hot'
    button.append(mark, '使用保存在这里的通行密钥登录')
    // Keep focus in the field: a mousedown on the offer must not blur it away first.
    button.addEventListener('pointerdown', (event) => event.preventDefault())
    button.addEventListener('click', (event) => {
      if (!event.isTrusted) return
      signIn()
    })
    root.append(style, button)
    return host
  }
  function place() {
    if (!offer || !field) return
    const box = field.getBoundingClientRect()
    offer.style.left = `${Math.max(8, box.left)}px`
    offer.style.top = `${Math.min(window.innerHeight - 48, box.bottom + 6)}px`
  }
  function hideOffer() {
    offer?.remove()
    field = null
  }
  function showOffer(target) {
    if (!offers.size || active.size) return hideOffer()
    offer ??= buildOffer()
    field = target
    if (!offer.isConnected) {
      document.documentElement.append(offer)
      try {
        offer.showPopover()
      } catch {}
    }
    place()
  }
  function refreshOffer() {
    const focused = document.activeElement
    if (offers.size && eligible(focused)) showOffer(focused)
    else hideOffer()
  }
  async function signIn() {
    const entry = [...offers].at(-1)
    if (!entry) return hideOffer()
    const [id, options] = entry
    hideOffer()
    const result = await perform(id, 'get', options)
    // Only a signed-in result answers the site; declining leaves the offer for another try.
    if (result?.value && offers.delete(id)) reply(id, result)
  }
  document.addEventListener(
    'focusin',
    (event) => (offers.size && eligible(event.target) ? showOffer(event.target) : hideOffer()),
    true
  )
  document.addEventListener(
    'focusout',
    () => setTimeout(() => eligible(document.activeElement) || hideOffer(), 150),
    true
  )
  document.addEventListener('keydown', (event) => event.key === 'Escape' && hideOffer(), true)
  window.addEventListener('scroll', place, { capture: true, passive: true })
  window.addEventListener('resize', place, { passive: true })
})()
