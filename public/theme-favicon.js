// The page is served with the grass-block key, the icon of the default theme
// that follows the system. A visitor who chose light or dark gets the sun or
// moon here instead, before the browser asks for an icon, so the tab never
// shows the key first and swaps once the app starts. The icon's link is placed
// ahead of this script in <head> for that reason.
;(() => {
  let theme = null
  try {
    theme = localStorage.getItem('2fa-hot-theme')
  } catch {
    // Without storage the theme follows the system, and so does the key.
  }
  if (theme !== 'light' && theme !== 'dark') return
  const icon = document.querySelector('link[rel="icon"]')
  if (icon) icon.setAttribute('href', `/favicon-${theme}.svg`)
})()
