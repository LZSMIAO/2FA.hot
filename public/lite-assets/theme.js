;(function () {
  'use strict'
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null
  function apply() {
    var preference = 'system'
    try {
      preference = window.localStorage.getItem('2fa-hot-theme') || 'system'
    } catch (error) {}
    var dark = preference === 'dark' || (preference !== 'light' && !!media && media.matches)
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }
  apply()
  window.addEventListener('pageshow', apply)
  window.addEventListener('storage', function (event) {
    if (event.key === '2fa-hot-theme' || event.key === null) apply()
  })
  if (media) {
    if (media.addEventListener) media.addEventListener('change', apply)
    else if (media.addListener) media.addListener(apply)
  }
})()
