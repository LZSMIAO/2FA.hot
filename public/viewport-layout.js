// Reserve the native scrollbar width before the page's first paint.
;(function () {
  var probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none'
  document.documentElement.appendChild(probe)
  document.documentElement.style.setProperty(
    '--page-scrollbar-width',
    probe.offsetWidth - probe.clientWidth + 'px'
  )
  probe.remove()
})()

// The passkey extension exists only for desktop Chrome and Edge. Decide before
// the first paint so the button never appears and then disappears.
;(function () {
  var agent = navigator.userAgent
  var mobile =
    /Android|iPhone|iPad|Mobile/i.test(agent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!mobile && (/Edg\//.test(agent) || /Chrome\//.test(agent)))
    document.documentElement.setAttribute('data-passkey-host', '')
})()

// The prerendered page cannot read the playback cookie, so mark it here and let
// CSS pick the icon; the control then never changes shape after the first paint.
;(function () {
  if (/(^|;\s*)2fa-panorama-paused=false(\s*;|$)/.test(document.cookie))
    document.documentElement.setAttribute('data-panorama-playing', '')
})()
