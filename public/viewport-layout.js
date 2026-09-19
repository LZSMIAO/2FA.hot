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
