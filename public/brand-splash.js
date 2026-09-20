// Keep one splash across all open tabs; a new browser visit alternates Hot and a message.
;(() => {
  const key = '2fa-brand-splash-visit-v2'
  const lock = '2fa-brand-splash-open-page'
  const choices = [
    'Fresh OTPs!',
    'Too hot to reuse!',
    'OTP, not Oops!',
    'Keep it secret!',
    'Keys stay local!',
    'Copy. Paste. Go!',
    'Got your backup?',
    'Check the clock!',
    'Mind the timer!',
    'New code, who dis?',
    'Secret keeper!',
    'Less typing!',
    'Stay in sync!',
    'Your keys, yours!'
  ]
  const valid = (value) =>
    value && (value.text === '.hot' || choices.includes(value.text)) && typeof value.id === 'string'
  function read(name) {
    try {
      const value = JSON.parse(window[name].getItem(key))
      return valid(value) ? value : null
    } catch {
      return null
    }
  }
  function show(value) {
    const text = value?.text || '.hot'
    document.documentElement.dataset.brandSplash = text === '.hot' ? 'hot' : 'message'
    document.documentElement.style.setProperty('--brand-splash-message', JSON.stringify(text))
  }
  // Restore synchronously on reload, before the first paint.
  show(read('sessionStorage'))
  if (!navigator.locks) return
  let release
  let leaving = false
  async function join() {
    leaving = false
    await navigator.locks
      .request(key, async () => {
        if (leaving) return
        const state = await navigator.locks.query()
        if (leaving) return
        const previous = read('localStorage')
        const own = read('sessionStorage')
        const active = state.held.some((entry) => entry.name === lock)
        let visit = previous
        if (!previous || (!active && own?.id !== previous.id)) {
          visit = {
            id: crypto.randomUUID(),
            text:
              !previous || previous.text !== '.hot'
                ? '.hot'
                : choices[Math.floor(Math.random() * choices.length)]
          }
        }
        try {
          localStorage.setItem(key, JSON.stringify(visit))
          sessionStorage.setItem(key, JSON.stringify(visit))
        } catch {
          return
        }
        show(visit)
        // Acquire before releasing the coordinator, so simultaneous tabs share the visit.
        await new Promise((ready) => {
          navigator.locks.request(lock, { mode: 'shared' }, () => {
            ready()
            return new Promise((resolve) => {
              release = resolve
              if (leaving) resolve()
            })
          })
        })
      })
      .catch(() => {})
  }
  window.addEventListener('pagehide', () => {
    leaving = true
    release?.()
    release = undefined
  })
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) join()
  })
  join()
})()
