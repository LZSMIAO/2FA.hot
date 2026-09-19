<script setup lang="ts">
import { useReducedMotion } from 'motion-v'

const props = defineProps<{ defaultHint: string }>()
const { tx, locale } = useMessages()
const tips = computed(() => [
  props.defaultHint,
  `Google Authenticator · ${tx('导入')}`,
  tx('验证码有误？检查时间和参数'),
  tx('按回车可快速复制验证码')
])
const reducedMotion = useReducedMotion()
const root = useTemplateRef<HTMLElement>('root')
const mounted = shallowRef(false)
const visible = shallowRef(true)
const inView = shallowRef(false)
const text = shallowRef(tips.value[0]!)
let observer: IntersectionObserver | undefined

function updateVisibility() {
  visible.value = document.visibilityState === 'visible'
}
onMounted(() => {
  mounted.value = true
  updateVisibility()
  document.addEventListener('visibilitychange', updateVisibility)
  observer = new IntersectionObserver(([entry]) => {
    inView.value = entry?.isIntersecting ?? false
  })
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', updateVisibility)
})

watch(
  [tips, mounted, visible, inView, reducedMotion],
  (_, __, onCleanup) => {
    text.value = tips.value[0]!
    if (!mounted.value || !visible.value || !inView.value || reducedMotion.value) return

    // Segment complete graphemes so translated combining marks are never split.
    const segmenter = new Intl.Segmenter(locale.value, { granularity: 'grapheme' })
    const phrases = tips.value.map((tip) =>
      Array.from(segmenter.segment(tip), ({ segment }) => segment)
    )
    let phrase = 0
    let count = phrases[0]!.length
    let deleting = true
    let timer: ReturnType<typeof setTimeout>
    function tick() {
      const letters = phrases[phrase]!
      count += deleting ? -1 : 1
      text.value = letters.slice(0, count).join('')
      let delay = deleting ? 25 : 65
      if (count === 0) {
        phrase = (phrase + 1) % phrases.length
        deleting = false
        delay = 320
      } else if (count === letters.length && !deleting) {
        deleting = true
        delay = 3200
      }
      timer = setTimeout(tick, delay)
    }
    timer = setTimeout(tick, 3200)
    onCleanup(() => clearTimeout(timer))
  },
  { immediate: true }
)
</script>

<template>
  <span ref="root" class="secret-input-hints" aria-hidden="true">
    <span class="hint-copy" dir="auto"
      >{{ text
      }}<span
        class="hint-caret"
        :class="{ 'is-active': mounted && visible && inView && !reducedMotion }"
    /></span>
  </span>
</template>

<style scoped>
.secret-input-hints {
  position: absolute;
  inset-block: 0;
  /* Hints only appear while the input is empty and its action buttons are hidden. */
  inset-inline: 0.875rem;
  display: flex;
  align-items: center;
  pointer-events: none;
  color: var(--ui-text-muted);
  font-family: var(--font-sans);
  font-size: var(--secret-hint-font-size);
  line-height: 1.35;
}
.hint-copy {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.hint-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-inline-start: 3px;
  vertical-align: -0.12em;
  background: currentColor;
  visibility: hidden;
}
.hint-caret.is-active {
  visibility: visible;
  animation: hint-blink 1.1s step-end infinite;
}
@keyframes hint-blink {
  50% {
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hint-caret.is-active {
    animation: none;
    visibility: hidden;
  }
}
</style>
