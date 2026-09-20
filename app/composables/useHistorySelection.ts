import { computed, onBeforeUnmount, shallowRef, watch, type Ref } from 'vue'
import { selectionRange } from '../utils/selection-range'

export function useHistorySelection(
  ids: Ref<string[]>,
  selected: Ref<string[]>,
  rangeIds: Ref<string[]> = ids,
  /**
   * A collapsed batch occupies one row while standing in for every record it
   * holds, so a range drawn over the rows on screen has to expand back out to
   * the records those rows represent.
   */
  expand: (unit: string) => string[] = (unit) => [unit]
) {
  const surface = shallowRef<HTMLElement | null>(null)
  const selectedSet = computed(() => new Set(selected.value))
  const allSelected = computed(
    () => ids.value.length > 0 && ids.value.every((id) => selectedSet.value.has(id))
  )
  let anchor = ''
  let drag: {
    pointer: number
    start: string
    baseline: string[]
    checked: boolean
    x: number
    y: number
    target: HTMLElement
  } | null = null
  let frame = 0
  let lastEnd = ''
  let scrollContainer: HTMLElement | null = null

  /**
   * A range only ever walks the rows currently on screen, but rows hidden in a
   * collapsed batch can already be selected. Fold those back in so picking one
   * row never silently clears another group's selection.
   */
  function applyRange(baseline: readonly string[], from: string, to: string, checked: boolean) {
    const units = selectionRange(rangeIds.value, [], from, to, true)
    const next = new Set(baseline)
    for (const unit of units)
      for (const id of expand(unit)) checked ? next.add(id) : next.delete(id)
    return ids.value.filter((id) => next.has(id))
  }
  const unitSelected = (unit: string) => expand(unit).every((id) => selectedSet.value.has(id))

  function stop() {
    const previous = drag
    drag = null
    scrollContainer = null
    cancelAnimationFrame(frame)
    if (previous?.target.hasPointerCapture(previous.pointer))
      previous.target.releasePointerCapture(previous.pointer)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    window.removeEventListener('blur', stop)
  }
  function end(event: PointerEvent) {
    if (event.pointerId === drag?.pointer) stop()
  }
  function update() {
    if (!drag || !surface.value) return
    const bounds = surface.value.getBoundingClientRect()
    if (drag.x < bounds.left || drag.x > bounds.right) return
    const elements = [...surface.value.querySelectorAll<HTMLElement>('[data-selection-id]')].filter(
      (el) => el.getClientRects().length && rangeIds.value.includes(el.dataset.selectionId || '')
    )
    const row =
      elements.find((el) => drag!.y <= el.getBoundingClientRect().bottom) ?? elements.at(-1)
    const id = row?.dataset.selectionId
    if (id && id !== lastEnd) {
      selected.value = applyRange(drag.baseline, drag.start, id, drag.checked)
      lastEnd = id
    }
  }
  function tick() {
    if (!drag) return
    const bounds = surface.value?.getBoundingClientRect()
    if (bounds && drag.x >= bounds.left && drag.x <= bounds.right) {
      const scrollBounds = scrollContainer?.getBoundingClientRect()
      const top = Math.max(0, scrollBounds?.top ?? 0)
      const bottom = Math.min(window.innerHeight, scrollBounds?.bottom ?? window.innerHeight)
      const edge = Math.min(64, (bottom - top) / 4)
      const delta =
        drag.y < top + edge
          ? -Math.min(16, (top + edge - drag.y) / 4)
          : drag.y > bottom - edge
            ? Math.min(16, (drag.y - bottom + edge) / 4)
            : 0
      if (delta) (scrollContainer ?? window).scrollBy({ top: delta, behavior: 'instant' })
      update()
    }
    frame = requestAnimationFrame(tick)
  }
  function move(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointer) return
    if (event.pointerType === 'mouse' && !event.buttons) return stop()
    event.preventDefault()
    drag.x = event.clientX
    drag.y = event.clientY
    update()
  }
  function start(event: PointerEvent, id: string) {
    if (!event.isPrimary || event.button !== 0 || drag) return
    event.preventDefault()
    scrollContainer = null
    for (let node = surface.value; node; node = node.parentElement) {
      if (
        node.scrollHeight > node.clientHeight &&
        /auto|scroll/.test(getComputedStyle(node).overflowY)
      ) {
        scrollContainer = node
        break
      }
    }
    const target = event.currentTarget as HTMLElement
    target.focus({ preventScroll: true })
    const from = event.shiftKey && rangeIds.value.includes(anchor) ? anchor : id
    drag = {
      pointer: event.pointerId,
      start: from,
      baseline: [...selected.value],
      checked: !unitSelected(id),
      x: event.clientX,
      y: event.clientY,
      target
    }
    selected.value = applyRange(drag.baseline, from, id, drag.checked)
    lastEnd = id
    if (!event.shiftKey) anchor = id
    target.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    window.addEventListener('blur', stop)
    frame = requestAnimationFrame(tick)
  }
  function click(event: MouseEvent, id: string) {
    // Pointer input was handled on press; detail=0 is keyboard/assistive activation.
    if (event.detail !== 0) return
    const from = event.shiftKey && rangeIds.value.includes(anchor) ? anchor : id
    selected.value = applyRange(selected.value, from, id, !unitSelected(id))
    if (!event.shiftKey) anchor = id
  }
  function toggleAll() {
    selected.value = allSelected.value ? [] : [...ids.value]
    anchor = ''
  }
  function cancelSelection(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return
    const target = event.target as HTMLElement | null
    if (target?.matches?.('[role="checkbox"], input[type="checkbox"]')) target.blur()
    if (!selected.value.length && !drag) return
    event.preventDefault()
    event.stopPropagation()
    if (drag) stop()
    anchor = ''
    lastEnd = ''
    selected.value = []
  }
  // These lists are computed, so they hand back a fresh array on every
  // re-evaluation. Compare contents: an identical list must not interrupt a
  // drag that is still in progress, and only a drag whose anchor row actually
  // disappeared has lost its reference point.
  const same = (a: readonly string[], b: readonly string[] | undefined) =>
    !!b && a.length === b.length && a.every((id, index) => id === b[index])
  watch(rangeIds, (next, previous) => {
    if (same(next, previous)) return
    if (drag && !next.includes(drag.start)) stop()
    if (!next.includes(anchor)) anchor = ''
  })
  watch(ids, (next, previous) => {
    if (same(next, previous)) return
    if (drag && !next.includes(drag.start)) stop()
    selected.value = selected.value.filter((id) => next.includes(id))
    if (!next.includes(anchor)) anchor = ''
  })
  onBeforeUnmount(() => {
    if (drag) stop()
  })
  return { surface, selectedSet, allSelected, start, click, toggleAll, cancelSelection }
}
