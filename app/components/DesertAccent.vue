<script setup lang="ts">
import scene from '~/assets/art/desert-interactive.svg?raw'
const props = defineProps<{ open: boolean }>()
const { tx } = useMessages()
// Nuxt state survives component/route changes, but is recreated on a full page refresh.
// Deliberately not stored in localStorage/sessionStorage.
const annoyed = useState<boolean>('desert-annoyed', () => false)
const { active, playing, reaction, tip, motionDuration, greet, hover, dismiss } = useDesertGreeting(
  () => props.open,
  {
    annoyed,
    reducedMotion: () => matchMedia('(prefers-reduced-motion: reduce)').matches
  }
)
watch(reaction, () => {
  if (active.value)
    window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: tip.value.sound }))
})
function focusGreet(event: FocusEvent) {
  // Pointer focus is followed by click; don't consume two tips for a single tap.
  if ((event.currentTarget as HTMLElement).matches(':focus-visible') && !active.value) greet()
}
function hoverGreet(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || active.value || !matchMedia('(hover: hover)').matches) return
  hover()
}
function leave(event: PointerEvent) {
  // Touch emits pointerleave on release: keep its newly opened bubble readable.
  if (event.pointerType === 'mouse') dismiss()
}
/*
 * Opening the scene must not be what gives the page a scrollbar. When the page
 * fits the window with the settings showing, the scene takes only the room
 * that is left and is drawn that much smaller. A page that scrolls anyway, or
 * leaves too little room for a legible drawing, keeps the full size.
 */
const accent = useTemplateRef<HTMLElement>('accent')
const fit = shallowRef(1)
function measureFit() {
  const el = accent.value
  const main = document.getElementById('main-content')
  const stage = el?.parentElement
  if (!el || !main || !stage) return
  const root = document.documentElement
  const fullValue = getComputedStyle(el).getPropertyValue('--desert-full').trim()
  const full = fullValue.endsWith('rem')
    ? parseFloat(fullValue) * parseFloat(getComputedStyle(root).fontSize)
    : parseFloat(fullValue)
  if (!full) return
  // The settings share the scene's cell; the cell never gets shorter than them.
  let base = 0
  for (const child of stage.children)
    if (child !== el) base = Math.max(base, (child as HTMLElement).offsetHeight)
  const extra = Math.max(0, el.offsetHeight - base)
  // The main area stretches to the window; what its content leaves empty is free.
  const box = main.getBoundingClientRect()
  let bottom = box.top
  for (const child of main.children) {
    const style = getComputedStyle(child)
    if (style.display === 'none' || style.position === 'fixed' || style.position === 'absolute')
      continue
    bottom = Math.max(bottom, child.getBoundingClientRect().bottom + parseFloat(style.marginBottom))
  }
  const free = Math.max(0, box.bottom - bottom - parseFloat(getComputedStyle(main).paddingBottom))
  const overflow = Math.max(0, root.scrollHeight - root.clientHeight)
  // The same page with the scene closed.
  if (overflow > extra) {
    fit.value = 1
    return
  }
  const room = Math.floor(base + free + extra - overflow) - 1
  const ratio = Math.min(1, room / full)
  fit.value = ratio < 0.45 ? 1 : ratio
}
// Measure before the scene opens, while the page still has its closed height.
watch(
  () => props.open,
  (open) => {
    if (open) measureFit()
  },
  { flush: 'pre' }
)
let resizeFrame = 0
function onResize() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    if (props.open) measureFit()
  })
}
onMounted(() => {
  if (props.open) measureFit()
  window.addEventListener('resize', onResize, { passive: true })
})
onBeforeUnmount(() => {
  cancelAnimationFrame(resizeFrame)
  window.removeEventListener('resize', onResize)
})
</script>
<template>
  <div
    ref="accent"
    class="desert-accent"
    :class="{ 'is-open': open }"
    :style="{ '--desert-fit': fit }"
    :inert="!open"
    :aria-hidden="!open"
  >
    <button
      type="button"
      class="desert-scene"
      :class="{ active, 'is-reacting': playing }"
      :data-motion="tip.motion"
      :style="{ '--desert-motion-duration': `${motionDuration}ms` }"
      data-sound-custom
      :disabled="!open"
      :aria-label="tx('和丛雨打招呼')"
      @focus="focusGreet"
      @blur="dismiss"
      @click="greet"
      @keydown.esc.stop="dismiss"
    >
      <span class="desert-art" @pointerenter="hoverGreet" @pointerleave="leave" v-html="scene" />
      <span
        class="desert-tip"
        :class="{ 'is-visible': active }"
        :aria-hidden="!active"
        role="status"
        aria-atomic="true"
      >
        <template v-if="tip.motion === 'ciallo'">
          <span>Ciallo～</span><wbr /><span class="desert-emoticon">(∠・ω&lt; )⌒☆</span>
        </template>
        <template v-else>{{ tx(tip.text) }}</template>
      </span>
    </button>
  </div>
</template>
<style scoped>
.desert-accent {
  /* The reserve when there is room for all of it; --desert-fit scales it down. */
  --desert-full: 17rem;
  position: relative;
  /* Closed, it takes no room: the settings beside it set the panel's height. */
  height: 0;
  align-self: start;
  opacity: 0;
  pointer-events: none;
  /*
   * The drawing is large and intricate. Hiding it with visibility let the
   * browser throw its raster away, so opening the panel had to paint the
   * whole scene again on the main thread, which is the hitch you feel in the
   * panel and in the sun swapping for the moon beside it. Held on its own
   * layer it is painted once and the panel only fades it in. It is inert and
   * cannot be reached while it is transparent.
   */
  will-change: opacity;
  transition:
    height 320ms var(--ease-out),
    opacity 200ms ease;
}
.desert-accent.is-open {
  height: calc(var(--desert-full) * var(--desert-fit, 1));
  opacity: 1;
  transition:
    height 320ms var(--ease-out),
    opacity 240ms ease;
}
.desert-scene {
  position: absolute;
  /*
   * Anchored to the panel's foot and drawn taller than it, so the cactus
   * reaches well past the rule above the panel. The drawing is as tall as the
   * box, so a shorter box scales it down around the same foot.
   */
  bottom: -1rem;
  left: 50%;
  width: 100%;
  height: calc(23rem * var(--desert-fit, 1));
  padding: 0;
  border: 0;
  background: transparent;
  transform: translateX(-50%);
  pointer-events: none;
  cursor: default;
}
.desert-art {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.desert-art :deep(.desert-svg) {
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.desert-art :deep(.desert-hit polygon) {
  fill: transparent;
  pointer-events: none;
}
.is-open .desert-art :deep(.desert-hit polygon) {
  pointer-events: all;
  cursor: pointer;
}
.desert-tip {
  position: absolute;
  /* Anchor the top, so longer translations grow down without moving the bubble. */
  top: calc(7rem * var(--desert-fit, 1));
  right: 0;
  z-index: 2;
  width: 48%;
  max-width: 13rem;
  text-align: start;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  background: var(--panel);
  color: var(--ui-text-highlighted);
  box-shadow:
    inset 1px 1px 0 var(--ore-highlight),
    0 2px 0 var(--ore-shade);
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(3px);
  transition:
    opacity 140ms ease-out,
    transform 140ms ease-out,
    visibility 0s 140ms;
}
.desert-tip.is-visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition-delay: 0s;
}
.desert-emoticon {
  display: inline-block;
  white-space: nowrap;
}
.desert-scene:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
/*
 * Closed, the scene should not hold the card open: on a tablet that reserve
 * was most of the air between the parameter rule and the buttons under it.
 */
@media (max-width: 900px) {
  .desert-accent {
    height: 0;
  }
}
@media (max-width: 700px) {
  .desert-accent {
    --desert-full: 10rem;
  }
  .desert-scene {
    bottom: 0;
    height: calc(13.5rem * var(--desert-fit, 1));
  }
  .desert-tip {
    top: calc(4.75rem * var(--desert-fit, 1));
    width: 52%;
  }
}
@media (max-width: 700px), (pointer: coarse) {
  .desert-accent,
  .desert-accent.is-open {
    /* Resolve the panel height once; only opacity animates over the SVG. */
    transition: opacity 180ms ease-out;
  }
}
@media (prefers-reduced-motion: reduce) {
  .desert-accent,
  .desert-accent.is-open,
  .desert-tip {
    transition: none;
  }
  .desert-tip {
    transform: none;
  }
}
</style>
