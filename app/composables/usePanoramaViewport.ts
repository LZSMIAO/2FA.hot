import type { Ref } from 'vue'

/** Keep the decorative camera's dimensions independent of the software keyboard. */
export function usePanoramaViewport(
  backdrop: Readonly<Ref<HTMLElement | null>>,
  mobile: Readonly<Ref<boolean>>
) {
  let touch: MediaQueryList | undefined
  let width = 0
  let frame = 0
  const editable = (element: Element | null) =>
    !!element?.matches('input, textarea, [contenteditable="true"]')
  const enabled = () =>
    document.documentElement.hasAttribute('data-ios') && mobile.value && !!touch?.matches

  function size() {
    const element = backdrop.value
    if (!element) return
    if (!enabled()) {
      cancelAnimationFrame(frame)
      frame = 0
      width = 0
      element.style.removeProperty('--panorama-height')
      return
    }
    if (width === window.innerWidth || (width && editable(document.activeElement))) return
    // iOS can resize lvh itself with the keyboard. Preserve camera dimensions
    // across height-only changes, and remeasure an orientation change after blur.
    element.style.removeProperty('--panorama-height')
    const height = element.getBoundingClientRect().height
    if (!height) return
    element.style.setProperty('--panorama-height', `${height}px`)
    width = window.innerWidth
  }

  function tick() {
    frame = 0
    size()
  }

  function viewportChanged() {
    if (!enabled()) return
    if (!frame && width !== window.innerWidth) frame = requestAnimationFrame(tick)
  }

  watch(mobile, size, { flush: 'post' })
  onMounted(() => {
    if (!document.documentElement.hasAttribute('data-ios')) return
    touch = window.matchMedia('(pointer: coarse)')
    size()
    window.addEventListener('resize', viewportChanged, { passive: true })
    document.addEventListener('focusout', viewportChanged)
  })
  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    window.removeEventListener('resize', viewportChanged)
    document.removeEventListener('focusout', viewportChanged)
  })
}
