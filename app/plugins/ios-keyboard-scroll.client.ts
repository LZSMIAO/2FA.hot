/**
 * iOS moves the page to centre a field when its keyboard opens, even a field
 * already in plain view, and the fixed backdrop and sticky header move with
 * it. When the keyboard closes those layers snap back while the page stays
 * moved, and the content jumps against them. Measured in the iOS 27
 * simulator: a native tap moved everything by the distance to Safari's centre
 * line; the same keyboard opened by focus({ preventScroll: true }) from the
 * tap moved nothing, on the way in or out.
 *
 * Putting the page back afterwards cannot hide the jump: iOS undoes its own
 * move on dismissal whatever the page did, so any correction shows as a
 * second step. The fix is to stop the move. It applies only to a quick tap on
 * a text field that will still be in view above the keyboard; a field lower
 * down is left to Safari, which has to scroll it into view.
 */
export default defineNuxtPlugin(() => {
  const found = window.visualViewport
  if (!found || !document.documentElement.hasAttribute('data-ios')) return
  const viewport = found

  const textTypes = new Set(['', 'text', 'password', 'search', 'email', 'url', 'tel', 'number'])
  /** Height of the page left above the keyboard, from the last time it was up. */
  let keyboardFree = 0
  let start: {
    field: HTMLInputElement | HTMLTextAreaElement
    x: number
    y: number
    at: number
  } | null = null

  function textField(target: EventTarget | null) {
    const field = target instanceof Element ? target.closest('input, textarea') : null
    if (field instanceof HTMLTextAreaElement) return field
    if (field instanceof HTMLInputElement && textTypes.has(field.type)) return field
    return null
  }
  function keyboardUp() {
    return viewport.height < window.innerHeight - 100
  }
  viewport.addEventListener('resize', () => {
    if (keyboardUp()) keyboardFree = viewport.height
  })
  /** Whether the field will sit wholly between the page's top and the keyboard. */
  function staysInView(field: Element) {
    const rect = field.getBoundingClientRect()
    // Before any keyboard has been seen, assume it takes a little over half.
    const free = keyboardUp() ? viewport.height : keyboardFree || window.innerHeight * 0.45
    return rect.top >= 0 && rect.bottom <= free - 16
  }

  addEventListener(
    'touchstart',
    (event: TouchEvent) => {
      const field = event.touches.length === 1 ? textField(event.target) : null
      const touch = event.touches[0]
      start =
        field && touch && field !== document.activeElement
          ? { field, x: touch.clientX, y: touch.clientY, at: performance.now() }
          : null
    },
    { capture: true, passive: true }
  )
  addEventListener(
    'touchend',
    (event: TouchEvent) => {
      const tap = start
      start = null
      const touch = event.changedTouches[0]
      if (!tap || !touch || event.touches.length) return
      const { field } = tap
      // A long press or a drag keeps Safari's own handling: its menu, selection or scroll.
      if (performance.now() - tap.at > 400) return
      if (Math.hypot(touch.clientX - tap.x, touch.clientY - tap.y) > 10) return
      if (field.disabled || field.readOnly || field === document.activeElement) return
      // Focus from script puts the caret at the end, not under the finger; in a
      // list someone taps into to edit a line, that would be the wrong place.
      if (field instanceof HTMLTextAreaElement && field.value) return
      if (!staysInView(field)) return
      event.preventDefault()
      field.focus({ preventScroll: true })
    },
    { capture: true }
  )
})
