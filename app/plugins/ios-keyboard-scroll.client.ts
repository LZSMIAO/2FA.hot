/**
 * iOS scrolls the page to make room for the keyboard and leaves it there when
 * the keyboard closes, while fixed and sticky layers return to their places.
 * Measured on iOS 27: focusing the secret scrolled the page 16px and shifted
 * the backdrop and header up with it; on dismissal only they came back, so the
 * content read as jumping up against them. The page goes back to where it was
 * in the same event as the viewport's return, unless the reader scrolled while
 * typing.
 */
export default defineNuxtPlugin(() => {
  const found = window.visualViewport
  if (!found || !document.documentElement.hasAttribute('data-ios')) return
  const viewport = found

  const editable = (target: EventTarget | null) =>
    target instanceof Element && target.matches('input, textarea, select, [contenteditable="true"]')
  /** Where the page was before the keyboard, while a field has focus. */
  let before: number | null = null
  /** Where to put it back once the viewport returns. */
  let restore: number | null = null
  let scrolled = false

  function settle() {
    if (restore === null || viewport.offsetTop > 0.5) return
    const top = restore
    restore = null
    if (Math.abs(window.scrollY - top) > 0.5) window.scrollTo(window.scrollX, top)
  }

  document.addEventListener('focusin', (event) => {
    if (!editable(event.target)) return
    // Moving from one field to the next keeps the position from before the first.
    if (restore !== null) before = restore
    else if (before === null) {
      before = window.scrollY
      scrolled = false
    }
    restore = null
  })
  document.addEventListener('focusout', (event) => {
    if (!editable(event.target) || before === null) return
    restore = scrolled ? null : before
    before = null
    // A field taking focus next runs first; otherwise settle now if the
    // viewport is already home, or when it gets there.
    queueMicrotask(settle)
  })
  addEventListener(
    'touchmove',
    () => {
      if (before !== null) scrolled = true
    },
    { passive: true }
  )
  // A later touch is the reader's; never move the page under it.
  addEventListener(
    'touchstart',
    () => {
      restore = null
    },
    { passive: true }
  )
  viewport.addEventListener('scroll', settle)
  viewport.addEventListener('resize', settle)
})
