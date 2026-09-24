// Note when this browser first used the site, before anything on this visit
// writes storage. Settings left by earlier visits mean it was here before,
// so notices meant for returning visitors reach it too.
;(() => {
  try {
    if (localStorage.getItem('2fa-first-visit') !== null) return
    const returning = Object.keys(localStorage).some((key) => key.startsWith('2fa-'))
    localStorage.setItem('2fa-first-visit', returning ? '0' : String(Date.now()))
  } catch {
    // Without storage there is nothing to compare; notices treat it as new.
  }
})()
