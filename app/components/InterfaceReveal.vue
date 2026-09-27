<script setup lang="ts">
/*
 * While the interface is hidden (useInterfaceHidden), one layer over the
 * window brings it back: a click or tap anywhere, Esc, Enter or Space. A note
 * says so as the page hides and again whenever the pointer moves, then fades
 * with the cursor so nothing sits over the scene.
 */
const { tx } = useMessages()
const hidden = useInterfaceHidden()
const layer = useTemplateRef<HTMLButtonElement>('layer')
const noteShown = shallowRef(false)
let noteTimer = 0
let settleTimer = 0
let scrollBefore = 0
function showNote() {
  noteShown.value = true
  clearTimeout(noteTimer)
  noteTimer = window.setTimeout(() => (noteShown.value = false), 3000)
}
function reveal() {
  hidden.value = false
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') reveal()
}
// Focus stays on the layer, so the keys reach it and Tab finds nothing hidden.
// The menu that hid the page hands focus back to its button as it closes.
function keepFocus(event: FocusEvent) {
  if (event.target !== layer.value) layer.value?.focus({ preventScroll: true })
}
watch(hidden, async (value) => {
  const root = document.documentElement
  root.toggleAttribute('data-ui-hidden', value)
  if (value) {
    scrollBefore = window.scrollY
    /*
     * On iOS the backdrop scrolls with the page and is framed on its first
     * screen (TitlePanorama.vue), so further down it shows only its
     * continuation. Once the page has faded, it goes to the top.
     */
    if (root.hasAttribute('data-ios'))
      settleTimer = window.setTimeout(() => window.scrollTo(0, 0), 500)
    showNote()
    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', keepFocus)
    await nextTick()
    layer.value?.focus({ preventScroll: true })
    return
  }
  clearTimeout(noteTimer)
  clearTimeout(settleTimer)
  noteShown.value = false
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('focusin', keepFocus)
  if (window.scrollY !== scrollBefore) window.scrollTo(0, scrollBefore)
  // Back to the backdrop button in the corner, the one shown on this screen.
  Array.from(document.querySelectorAll<HTMLElement>('.panorama-controls .panorama-control'))
    .find((control) => control.getClientRects().length)
    ?.focus({ preventScroll: true })
})
</script>
<template>
  <button
    v-if="hidden"
    ref="layer"
    type="button"
    class="interface-reveal"
    :class="{ 'is-noted': noteShown }"
    :aria-label="tx('显示界面')"
    @click="reveal"
    @pointermove="showNote"
    @focus="showNote"
  >
    <span class="interface-reveal-note" aria-hidden="true">
      <UIcon name="i-lucide-eye" />
      <span class="interface-reveal-click">{{ tx('点击任意处或按 Esc 返回') }}</span>
      <span class="interface-reveal-tap">{{ tx('轻触任意处返回') }}</span>
    </span>
  </button>
</template>
<style scoped>
.interface-reveal {
  position: fixed;
  inset: 0;
  z-index: var(--layer-header);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem 1rem calc(2rem + env(safe-area-inset-bottom));
  border: 0;
  background: none;
  cursor: none;
  -webkit-tap-highlight-color: transparent;
}
.interface-reveal:focus {
  outline: none;
}
.interface-reveal.is-noted {
  cursor: default;
}
.interface-reveal-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  padding: 0.625rem 1rem;
  border: 1px solid rgb(255 255 255 / 14%);
  background: rgb(12 14 16 / 55%);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow: 0 10px 30px -12px rgb(0 0 0 / 60%);
  color: rgb(255 255 255 / 92%);
  font-size: var(--text-label);
  letter-spacing: 0.02em;
  opacity: 0;
  translate: 0 0.5rem;
  transition:
    opacity 0.6s ease,
    translate 0.6s ease;
}
.interface-reveal.is-noted .interface-reveal-note {
  opacity: 1;
  translate: 0 0;
  transition-duration: 0.3s;
}
.interface-reveal-note .iconify {
  flex-shrink: 0;
  width: 1.125em;
  height: 1.125em;
  opacity: 0.8;
}
.interface-reveal-tap {
  display: none;
}
/*
 * On a touch screen the note drops from the top: iOS Safari draws no fixed
 * layer below the line its bottom bar starts at, so at the foot it was lost.
 */
@media (pointer: coarse) {
  .interface-reveal {
    align-items: flex-start;
    padding: calc(1rem + env(safe-area-inset-top)) 1rem 1rem;
  }
  .interface-reveal-note {
    translate: 0 -0.5rem;
  }
  .interface-reveal-click {
    display: none;
  }
  .interface-reveal-tap {
    display: inline;
  }
}
@media (prefers-reduced-motion: reduce) {
  .interface-reveal-note {
    translate: none;
  }
}
</style>
