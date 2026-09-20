const arrivalTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()
let activeAnchor: HTMLElement | undefined

/** Give documentation anchors a visible arrival cue without shifting layout. */
export function focusAnchor(element: HTMLElement) {
  if (!element.matches('h1, h2, h3, h4, h5, h6')) return
  if (activeAnchor) {
    clearTimeout(arrivalTimers.get(activeAnchor))
    arrivalTimers.delete(activeAnchor)
    activeAnchor.classList.remove('anchor-arrival-active')
  }
  activeAnchor = element
  element.classList.add('anchor-arrival-target')
  element.addEventListener('blur', () => element.classList.remove('anchor-arrival-target'), {
    once: true
  })
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1')
    element.addEventListener('blur', () => element.removeAttribute('tabindex'), { once: true })
  }
  element.focus({ preventScroll: true })
  clearTimeout(arrivalTimers.get(element))
  element.classList.remove('anchor-arrival-active')
  // Restart the cue when the same anchor is activated again.
  void element.offsetWidth
  element.classList.add('anchor-arrival-active')
  arrivalTimers.set(
    element,
    setTimeout(() => {
      element.classList.remove('anchor-arrival-active')
      arrivalTimers.delete(element)
      if (activeAnchor === element) activeAnchor = undefined
    }, 2550)
  )
}
