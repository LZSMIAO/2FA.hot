// Viewport readout for diagnosing iOS layout jumps. Loaded only with ?debug=viewport.
// Every frame it checks what should stay still: the fixed backdrop's top, the page
// content's position in the document, and the viewport sizes, and logs any change.
;(function () {
  var root = document.documentElement
  var box = document.createElement('div')
  box.setAttribute('aria-hidden', 'true')
  box.style.cssText =
    'position:fixed;left:4px;top:84px;z-index:2147483647;max-width:calc(100vw - 8px);' +
    'padding:4px 6px;font:10px/1.35 ui-monospace,Menlo,monospace;color:#7CFC00;' +
    'background:rgba(0,0,0,.78);white-space:pre;pointer-events:none;overflow:hidden'
  var probes = {}
  ;['100svh', '100lvh', '100dvh'].forEach(function (height) {
    var probe = document.createElement('div')
    probe.style.cssText =
      'position:fixed;top:0;left:-10px;width:1px;visibility:hidden;pointer-events:none;height:' +
      height
    probes[height] = probe
  })
  var inset = document.createElement('div')
  inset.style.cssText =
    'position:fixed;top:0;left:-10px;width:1px;visibility:hidden;pointer-events:none;' +
    'height:env(safe-area-inset-bottom)'
  var log = []
  var start = performance.now()
  var touching = false
  var last = {}

  function note(text) {
    var time = ((performance.now() - start) / 1000).toFixed(2)
    log.unshift(time + ' ' + (touching ? 'T ' : '  ') + text)
    if (log.length > 18) log.length = 18
  }
  function round(value) {
    return Math.round(value * 10) / 10
  }
  function describe(element) {
    if (!element) return '-'
    var name = element.tagName.toLowerCase()
    if (element.id) name += '#' + element.id
    else if (typeof element.className === 'string' && element.className)
      name += '.' + element.className.trim().split(/\s+/)[0]
    return name
  }
  function sample() {
    var viewport = window.visualViewport
    var backdrop = document.querySelector('.title-panorama')
    var content = document.querySelector('#main-content')
    var bottom = document.elementFromPoint(innerWidth / 2, innerHeight - 4)
    return {
      innerHeight: innerHeight,
      vvHeight: viewport ? round(viewport.height) : '-',
      vvTop: viewport ? round(viewport.offsetTop) : '-',
      scrollY: round(scrollY),
      maxScroll: root.scrollHeight - innerHeight,
      docHeight: root.scrollHeight,
      svh: probes['100svh'].offsetHeight,
      lvh: probes['100lvh'].offsetHeight,
      dvh: probes['100dvh'].offsetHeight,
      insetBottom: inset.offsetHeight,
      backdropTop: backdrop ? round(backdrop.getBoundingClientRect().top) : '-',
      backdropHeight: backdrop ? round(backdrop.getBoundingClientRect().height) : '-',
      contentAt: content ? round(content.getBoundingClientRect().top + scrollY) : '-',
      bottom: describe(bottom),
      bottomColor: bottom ? getComputedStyle(bottom).backgroundColor : '-',
      active: describe(document.activeElement)
    }
  }
  function frame() {
    var now = sample()
    if (last.innerHeight !== undefined) {
      // Should never move: the backdrop is fixed at the top, the content has a set place.
      if (now.backdropTop !== last.backdropTop)
        note('BACKDROP top ' + last.backdropTop + ' -> ' + now.backdropTop)
      if (now.contentAt !== last.contentAt)
        note('CONTENT shift ' + last.contentAt + ' -> ' + now.contentAt)
      if (now.innerHeight !== last.innerHeight || now.vvHeight !== last.vvHeight)
        note('viewport ' + now.innerHeight + ' vv ' + now.vvHeight + ' top ' + now.vvTop)
      else if (now.vvTop !== last.vvTop) note('vv top ' + last.vvTop + ' -> ' + now.vvTop)
      if (now.docHeight !== last.docHeight)
        note('doc height ' + last.docHeight + ' -> ' + now.docHeight)
      if (!touching && Math.abs(now.scrollY - last.scrollY) >= 12)
        note('scroll jump ' + last.scrollY + ' -> ' + now.scrollY + ' max ' + now.maxScroll)
      if (now.bottom !== last.bottom) note('bottom now ' + now.bottom + ' ' + now.bottomColor)
    }
    last = now
    box.textContent = [
      'inner ' + now.innerHeight + '  vv ' + now.vvHeight + ' @' + now.vvTop,
      'scroll ' + now.scrollY + ' / max ' + now.maxScroll + '  doc ' + now.docHeight,
      'svh ' + now.svh + ' lvh ' + now.lvh + ' dvh ' + now.dvh + ' inset ' + now.insetBottom,
      'backdrop @' + now.backdropTop + ' h ' + now.backdropHeight,
      'bottom ' + now.bottom + ' ' + now.bottomColor,
      'focus ' + now.active + '  ios ' + root.hasAttribute('data-ios')
    ]
      .concat(log)
      .join('\n')
    requestAnimationFrame(frame)
  }
  function begin() {
    Object.keys(probes).forEach(function (key) {
      document.body.appendChild(probes[key])
    })
    document.body.appendChild(inset)
    document.body.appendChild(box)
    // Every tap, and who handled it: registered in the bubble phase on window,
    // so it runs after the page's own handlers and sees whether they took it.
    var tap = null
    addEventListener(
      'touchstart',
      function (event) {
        touching = true
        var touch = event.touches[0]
        var field = event.target instanceof Element ? event.target.closest('input, textarea') : null
        tap =
          touch && event.touches.length === 1
            ? {
                target: event.target,
                x: touch.clientX,
                y: touch.clientY,
                at: performance.now(),
                focused: !!field && field === document.activeElement
              }
            : null
      },
      { passive: true }
    )
    addEventListener(
      'touchend',
      function (event) {
        touching = false
        var touch = event.changedTouches[0]
        if (!tap || !touch) return
        note(
          'TAP ' +
            describe(tap.target) +
            ' ' +
            Math.round(performance.now() - tap.at) +
            'ms ' +
            Math.round(Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y)) +
            'px' +
            (tap.focused ? ' already-focused' : '') +
            (event.defaultPrevented ? ' -> page' : ' -> safari')
        )
        tap = null
      },
      { passive: true }
    )
    addEventListener(
      'touchcancel',
      function () {
        touching = false
        if (tap) note('TAP cancelled ' + describe(tap.target))
        tap = null
      },
      { passive: true }
    )
    // A native sheet or menu taking over shows up as the window losing focus.
    addEventListener('blur', function () {
      note('WINDOW blur')
    })
    addEventListener('focus', function () {
      note('WINDOW focus')
    })
    document.addEventListener('visibilitychange', function () {
      note('visibility ' + document.visibilityState)
    })
    document.addEventListener('focusin', function (event) {
      note('focusin ' + describe(event.target))
    })
    document.addEventListener('focusout', function (event) {
      note('focusout ' + describe(event.target))
    })
    requestAnimationFrame(frame)
  }
  if (document.body) begin()
  else document.addEventListener('DOMContentLoaded', begin)
})()
