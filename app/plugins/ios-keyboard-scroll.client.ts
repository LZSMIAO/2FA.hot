/**
 * iOS pans the page to make room for the keyboard, carrying fixed and sticky
 * layers with it, and on dismissal hands those layers back to their places
 * while the page stays panned. Measured on iOS 27: focusing the secret moved
 * everything up 16px; when the keyboard closed the backdrop and header came
 * back down and the content did not, so it read as jumping up against them.
 *
 * Putting the page back after Safari's hand-back is a frame late and shows as
 * a second jump. So it goes back as the field loses focus, while the keyboard
 * is still up: page and layers return together, in one step. The viewport's
 * return then finishes the job if iOS moved anything after all.
 */
export default defineNuxtPlugin(() => {
  const found = window.visualViewport
  if (!found || !document.documentElement.hasAttribute('data-ios')) return
  const viewport = found

  const editable = (target: EventTarget | null) =>
    target instanceof Element && target.matches('input, textarea, select, [contenteditable="true"]')
  /** Where the page was before the keyboard, while a field has focus. */
  let before: number | null = null
  /** Where it belongs until the viewport is back. */
  let restore: number | null = null
  let scrolled = false
  let expiry = 0

  function returnPage() {
    if (restore !== null && Math.abs(window.scrollY - restore) > 0.5)
      window.scrollTo(window.scrollX, restore)
  }
  function settle() {
    if (restore === null || viewport.offsetTop > 0.5) return
    returnPage()
    // Keep watching until the keyboard has fully gone.
    if (viewport.height >= window.innerHeight - 1) restore = null
  }

  document.addEventListener('focusin', (event) => {
    if (!editable(event.target) || before !== null) return
    before = window.scrollY
    scrolled = false
    restore = null
  })
  document.addEventListener('focusout', (event) => {
    if (!editable(event.target) || before === null) return
    // Moving straight to another field keeps the position from before the first.
    if (editable(event.relatedTarget)) return
    const top = before
    before = null
    // The reader scrolled while typing; where they went is where they stay.
    if (scrolled) return
    restore = top
    returnPage()
    clearTimeout(expiry)
    expiry = window.setTimeout(() => (restore = null), 1500)
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
