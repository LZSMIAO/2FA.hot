// Note when this browser first used the site, before anything on this visit
// writes storage. Settings left by earlier visits mean it was here before,
// so notices meant for returning visitors reach it too.
;(() => {
  let first = null
  try {
    first = localStorage.getItem('2fa-first-visit')
    if (first === null) {
      const returning = Object.keys(localStorage).some((key) => key.startsWith('2fa-'))
      first = returning ? '0' : String(Date.now())
      localStorage.setItem('2fa-first-visit', first)
    }
  } catch {
    // Without storage there is nothing to compare; notices treat it as new.
  }
  // Introductory copy under the tool is for a browser's first day here. Mark
  // the page before it paints so returning visitors never see it flash.
  const since = first === null ? 0 : Date.now() - Number(first)
  const fresh = first === null || (first !== '0' && since >= 0 && since < 864e5)
  if (typeof document !== 'undefined')
    document.documentElement.dataset.visitor = fresh ? 'new' : 'returning'
})()
