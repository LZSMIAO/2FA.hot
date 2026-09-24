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

// Decide platform layout before the first paint, including iPad's desktop UA.
// The passkey extension exists only for desktop Chrome and Edge.
;(function () {
  var agent = navigator.userAgent
  var ios =
    /iPhone|iPad|iPod/i.test(agent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  var mobile = ios || /Android|Mobile/i.test(agent)
  if (mobile) document.documentElement.setAttribute('data-mobile', '')
  if (ios) document.documentElement.setAttribute('data-ios', '')
  if (!mobile && (/Edg\//.test(agent) || /Chrome\//.test(agent)))
    document.documentElement.setAttribute('data-passkey-host', '')
})()

// iOS keeps its bounce, which settles the page's end smoothly when Safari's bar
// shrinks; without it the page stayed overscrolled and snapped on the next
// touch. But a pull at the very top then opened pull-to-refresh, sliding the
// page down under a blank strip. Only there is the bounce turned off: in the
// iOS 27 simulator this stopped the pull and kept the end's settle, and the
// switch takes effect within a gesture that starts at the top.
;(function () {
  var root = document.documentElement
  if (!root.hasAttribute('data-ios')) return
  var atTop
  function update() {
    var top = window.scrollY <= 0
    if (top === atTop) return
    atTop = top
    root.style.overscrollBehaviorY = top ? 'none' : ''
  }
  update()
  window.addEventListener('scroll', update, { passive: true })
})()

// The prerendered page cannot read the playback cookie, so mark it here and let
// CSS pick the icon; the control then never changes shape after the first paint.
;(function () {
  if (/(^|;\s*)2fa-panorama-paused=false(\s*;|$)/.test(document.cookie))
    document.documentElement.setAttribute('data-panorama-playing', '')
})()

// ?debug=viewport shows a live readout of viewport sizes and layout jumps, for
// diagnosing iOS Safari on a real device. Nothing loads without it.
;(function () {
  if (!/[?&]debug=viewport(&|$)/.test(location.search)) return
  var script = document.createElement('script')
  script.src = '/viewport-debug.js'
  document.head.appendChild(script)
})()
