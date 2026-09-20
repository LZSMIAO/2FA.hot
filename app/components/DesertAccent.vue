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
</script>
<template>
  <div class="desert-accent" :class="{ 'is-open': open }" :inert="!open" :aria-hidden="!open">
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
  position: relative;
  height: 7rem;
  align-self: start;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  /*
   * Only the fade. Animating the height meant a relayout on every frame for
   * 320ms, which stuttered on a phone, while the scene itself was painted at
   * full size from the first frame - so all that motion bought was the shake.
   * The panel takes its size in one step and she fades over it.
   */
  transition:
    opacity 200ms ease,
    visibility 0s 200ms;
}
.desert-accent.is-open {
  height: 16rem;
  opacity: 1;
  visibility: visible;
  transition:
    opacity 240ms ease,
    visibility 0s;
}
.desert-scene {
  position: absolute;
  /* High enough that the cactus crosses the rule above the panel. */
  top: -2.5rem;
  left: 50%;
  width: 100%;
  height: 18.5rem;
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
  top: 2rem;
  right: 0;
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
  .desert-accent.is-open {
    height: 10rem;
  }
  .desert-scene {
    top: -3.5rem;
    height: 13.5rem;
  }
  .desert-tip {
    top: 0;
    width: 52%;
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
