import { shallowRef } from 'vue'
import { transferText } from '../utils/transfer-text.ts'
import { hasImageDrop } from '../utils/dropped-image.ts'

/** Highlight the secret field during text drags; only accept drops inside it. */
export function usePageTextDrop(options: {
  enabled: () => boolean
  input: () => HTMLInputElement | undefined
  target: () => HTMLElement | null | undefined
  text: (value: string) => void
}) {
  const dragging = shallowRef(false)
  function reset() {
    dragging.value = false
  }
  function leave(event: DragEvent) {
    if (!event.relatedTarget) reset()
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') reset()
  }
  function accepts(event: DragEvent) {
    const data = event.dataTransfer
    if (event.defaultPrevented || !options.enabled() || !data) return false
    if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return false
    if (!Array.from(data.types).some((type) => type === 'text/plain' || type === 'text/html'))
      return false
    if (hasImageDrop(data)) return false
    const editor =
      event.target instanceof Element
        ? event.target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
          )
        : null
    return !editor || editor === options.input()
  }
  function inTarget(event: DragEvent) {
    return event.target instanceof Element && !!options.target()?.contains(event.target)
  }

  function over(event: DragEvent) {
    dragging.value = accepts(event)
    if (!dragging.value) return
    event.preventDefault()
    event.dataTransfer!.dropEffect = inTarget(event) ? 'copy' : 'none'
  }

  function drop(event: DragEvent) {
    reset()
    if (!accepts(event)) return
    event.preventDefault()
    if (!inTarget(event)) return
    const text = transferText(event.dataTransfer!)
    if (!text.trim()) return
    options.input()?.focus()
    options.text(text)
  }

  onMounted(() => {
    document.addEventListener('dragenter', over)
    document.addEventListener('dragover', over)
    document.addEventListener('dragleave', leave)
    document.addEventListener('dragend', reset)
    document.addEventListener('keydown', keydown)
    document.addEventListener('drop', drop)
  })
  onBeforeUnmount(() => {
    reset()
    document.removeEventListener('dragenter', over)
    document.removeEventListener('dragover', over)
    document.removeEventListener('dragleave', leave)
    document.removeEventListener('dragend', reset)
    document.removeEventListener('keydown', keydown)
    document.removeEventListener('drop', drop)
  })
  return { dragging }
}
