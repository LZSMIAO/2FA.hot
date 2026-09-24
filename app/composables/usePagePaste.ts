import { pastedImages, transferText } from '../utils/transfer-text.ts'
/** Handle native paste outside editors without requesting clipboard permissions. */
export function usePagePaste(options: {
  enabled: () => boolean
  input: () => HTMLInputElement | HTMLTextAreaElement | undefined
  text: (value: string) => void
  images?: (files: File[]) => void
}) {
  function handlePaste(event: ClipboardEvent) {
    if (event.defaultPrevented || !options.enabled() || !event.clipboardData) return
    if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
    const target = event.target
    const editor =
      target instanceof HTMLElement
        ? target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
          )
        : null
    const ownInput = options.input()
    if (editor && editor !== ownInput) return

    const images = pastedImages(event.clipboardData)
    if (images.length && options.images) {
      event.preventDefault()
      options.images(images)
      return
    }
    const text = transferText(event.clipboardData)
    if (text.trim()) {
      if (editor) return
      event.preventDefault()
      options.text(text)
    }
  }
  onMounted(() => document.addEventListener('paste', handlePaste))
  onBeforeUnmount(() => document.removeEventListener('paste', handlePaste))
}
