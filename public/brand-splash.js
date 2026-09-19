// Run before the first paint so refreshes never swap or hide the splash.
;(() => {
  const key = '2fa-brand-splash-session'
  const choices = [
    '.hot',
    'More blocks!',
    'Never dig down!',
    'Creeper?!',
    'Got diamonds?',
    'Stay blocky!',
    'Respawn!',
    'Time to mine!',
    'Loot found!',
    'Redstone!',
    'Touch grass!',
    'Level up!'
  ]
  let text = '.hot'
  try {
    const current = sessionStorage.getItem(key)
    if (current && choices.includes(current)) text = current
    else {
      if (localStorage.getItem('2fa-brand-visited'))
        text = choices[Math.floor(Math.random() * choices.length)]
      sessionStorage.setItem(key, text)
      localStorage.setItem('2fa-brand-visited', '1')
    }
  } catch {
    /* Storage restrictions keep the default logo. */
  }
  const root = document.documentElement
  root.dataset.brandSplash = text === '.hot' ? 'hot' : 'message'
  root.style.setProperty('--brand-splash-message', JSON.stringify(text))
})()
