/** Handle native paste outside editors without requesting clipboard permissions. */
export function usePagePaste(options: {
  enabled: () => boolean
  input: () => HTMLInputElement | undefined
  text: (value: string) => void
  image: (file: File) => void
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

    const image = Array.from(event.clipboardData.items)
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile()
    if (image) {
      event.preventDefault()
      options.image(image)
      return
    }
    // The input's own handler preserves selection and replacement semantics.
    if (editor) return
    const text = event.clipboardData.getData('text/plain')
    if (!text.trim()) return
    event.preventDefault()
    options.text(text)
  }
  onMounted(() => document.addEventListener('paste', handlePaste))
  onBeforeUnmount(() => document.removeEventListener('paste', handlePaste))
}
