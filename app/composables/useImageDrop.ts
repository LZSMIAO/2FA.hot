import { hasImageDrop, readDroppedImage } from '../utils/dropped-image.ts'

export function useImageDrop(options: {
  enabled: () => boolean
  target: () => HTMLElement | null | undefined
  outside?: () => void
  enter?: () => void
  image: (file: File) => void | Promise<void>
  images?: (files: File[]) => void | Promise<void>
  issue: (message: string) => void
}) {
  const dragging = shallowRef(false)
  const loading = shallowRef(false)
  let controller: AbortController | undefined
  let depth = 0
  let active = true
  function reset() {
    depth = 0
    dragging.value = false
  }
  function cancel() {
    controller?.abort()
    controller = undefined
    loading.value = false
    reset()
  }
  function inTarget(event: DragEvent) {
    return event.target instanceof Node && !!options.target()?.contains(event.target)
  }
  function accepts(event: DragEvent) {
    return options.enabled() && !!event.dataTransfer && hasImageDrop(event.dataTransfer)
  }
  function enter(event: DragEvent) {
    if (!accepts(event)) return
    event.preventDefault()
    depth++
    dragging.value = true
    if (depth === 1) options.enter?.()
  }
  function over(event: DragEvent) {
    if (!accepts(event)) return
    event.preventDefault()
    dragging.value = true
    event.dataTransfer!.dropEffect = inTarget(event) ? 'copy' : 'none'
  }
  function leave() {
    depth = Math.max(0, depth - 1)
    // External file drags may never dispatch dragend on this document.
    // Close the drag-opened dialog when the last entered element is left.
    if (!depth) end()
  }
  function end() {
    if (!dragging.value) return
    cancel()
    options.outside?.()
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') end()
  }
  async function drop(event: DragEvent) {
    reset()
    if (!accepts(event) || event.defaultPrevented) return
    event.preventDefault()
    if (!inTarget(event)) {
      cancel()
      options.outside?.()
      return
    }
    if (loading.value) return
    const request = new AbortController()
    controller = request
    const timeout = setTimeout(() => request.abort(), 15000)
    loading.value = true
    try {
      // Snapshot all files before awaiting: browser drag data is only readable during drop.
      const files = Array.from(event.dataTransfer!.files)
      if (!files.length) files.push(await readDroppedImage(event.dataTransfer!, request.signal))
      if (active && !request.signal.aborted && options.enabled()) {
        if (options.images) await options.images(files)
        else await options.image(files[0]!)
      }
    } catch {
      if (active && controller === request && options.enabled())
        options.issue('暂时无法识别，请尝试图片导入。')
    } finally {
      clearTimeout(timeout)
      if (controller === request) {
        controller = undefined
        loading.value = false
      }
    }
  }
  onMounted(() => {
    document.addEventListener('dragenter', enter)
    document.addEventListener('dragover', over)
    document.addEventListener('dragleave', leave)
    document.addEventListener('drop', drop)
    document.addEventListener('dragend', end)
    document.addEventListener('keydown', keydown)
  })
  onBeforeUnmount(() => {
    active = false
    controller?.abort()
    document.removeEventListener('dragenter', enter)
    document.removeEventListener('dragover', over)
    document.removeEventListener('dragleave', leave)
    document.removeEventListener('drop', drop)
    document.removeEventListener('dragend', end)
    document.removeEventListener('keydown', keydown)
  })
  return { dragging, loading, cancel }
}
