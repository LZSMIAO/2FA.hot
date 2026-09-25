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

/*
 * When the keyboard opens for a field, iOS moves the page to centre the field
 * above it, even a field already in plain view, and the sticky header and the
 * backdrop move too. When the keyboard closes Safari puts the header back but
 * leaves the page where it moved it, so the content jumps against the header.
 * Measured in the iOS 27 simulator, the move is the distance from the field's
 * centre to the middle of the space above the keyboard: 50pt on a test page,
 * 16pt on the phone this was reported on.
 *
 * The move comes with the keyboard of a fresh focus. A field that opens with no
 * keyboard (inputmode="none") and asks for one a moment later gets it without
 * the move, on the way in and out. The tap itself stays Safari's. An earlier
 * version focused the field from script instead, and right after a reload,
 * before the page had system focus, that gave focus with no keyboard; the
 * second tap then went Safari's way and moved the page. This runs before the
 * app does, so a tap during loading is covered too.
 *
 * Only a field that will still show above the keyboard is held back. One lower
 * down is left to Safari, which has to scroll it into view.
 */
;(function () {
  var viewport = window.visualViewport
  if (!viewport || !document.documentElement.hasAttribute('data-ios')) return
  var textTypes = ['', 'text', 'password', 'search', 'email', 'url', 'tel', 'number']
  // Height of the page left above the keyboard, from the last time it was up.
  var keyboardFree = 0
  var held = null
  var previous = null
  var timer = 0

  function textField(target) {
    var field = target instanceof Element ? target.closest('input, textarea') : null
    if (field instanceof HTMLTextAreaElement) return field
    if (field instanceof HTMLInputElement && textTypes.indexOf(field.type) >= 0) return field
    return null
  }
  function keyboardUp() {
    return viewport.height < window.innerHeight - 100
  }
  viewport.addEventListener('resize', function () {
    if (keyboardUp()) keyboardFree = viewport.height
  })
  // Whether the field will sit wholly between the page's top and the keyboard.
  function staysInView(field) {
    var rect = field.getBoundingClientRect()
    // Before any keyboard has been seen, assume it takes a little over half.
    var free = keyboardUp() ? viewport.height : keyboardFree || window.innerHeight * 0.45
    return rect.top >= 0 && rect.bottom <= free - 16
  }
  function release() {
    clearTimeout(timer)
    var field = held
    held = null
    if (!field) return
    if (previous === null) field.removeAttribute('inputmode')
    else field.setAttribute('inputmode', previous)
  }
  // Safari has to have started the field without a keyboard before the
  // keyboard is asked for: two frames after focus was too soon and none came
  // up; 100ms was enough in the simulator.
  function releaseSoon() {
    clearTimeout(timer)
    timer = setTimeout(release, 120)
  }

  window.addEventListener(
    'touchstart',
    function (event) {
      release()
      var field = event.touches.length === 1 ? textField(event.target) : null
      if (!field || field.readOnly || field.disabled) return
      // Moving the caret in a field that is already typing in needs nothing.
      if (field === document.activeElement && keyboardUp()) return
      if (!staysInView(field)) return
      held = field
      previous = field.getAttribute('inputmode')
      field.setAttribute('inputmode', 'none')
      // A tap that never reaches the field still gives its keyboard back.
      timer = setTimeout(release, 1500)
    },
    { capture: true, passive: true }
  )
  // A fresh focus arrives after the finger lifts; a field that kept focus while
  // something else took its keyboard gets none, so the lift itself counts.
  document.addEventListener('focusin', function (event) {
    if (held && event.target === held) releaseSoon()
  })
  window.addEventListener(
    'touchend',
    function () {
      if (held && held === document.activeElement) releaseSoon()
    },
    { capture: true, passive: true }
  )
  // A drag is a scroll or a selection, and Safari's to handle as usual.
  window.addEventListener('touchmove', release, { capture: true, passive: true })
  window.addEventListener('touchcancel', release, { capture: true, passive: true })
})()

// The prerendered page cannot read the playback cookie, so mark it here and let
// CSS pick the icon; the control then never changes shape after the first paint.
;(function () {
  if (/(^|;\s*)2fa-panorama-paused=false(\s*;|$)/.test(document.cookie))
    document.documentElement.setAttribute('data-panorama-playing', '')
})()
