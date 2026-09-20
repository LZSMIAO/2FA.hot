import { computed, onScopeDispose, readonly, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'

// Shared with the SVG through --desert-motion-duration: every pose returns to rest.
export const DESERT_MOTION_MS = 1200
export const DESERT_CIALLO_MS = 1400
export const DESERT_HOVER_WINDOW_MS = 3000
export const DESERT_HOVER_LIMIT = 4

const angryTip = {
  motion: 'angry',
  text: '哼！别来回晃啦，我生气了！',
  sound: 'character-angry'
}

export function useDesertGreeting(
  isOpen: () => boolean,
  options: { reducedMotion?: () => boolean; annoyed?: Ref<boolean> } = {}
) {
  const active = shallowRef(false)
  const playing = shallowRef(false)
  const index = shallowRef(-1)
  const month = shallowRef(1)
  const annoyed = options.annoyed ?? shallowRef(false)
  const reaction = shallowRef(0)
  let hoverEntries: number[] = []
  let lastAngryReaction = -Infinity
  let queued = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const tips = computed(() => [
    {
      motion: 'look',
      sound: 'character',
      text:
        month.value >= 3 && month.value <= 5
          ? '啊，天气好热啊，明明是春天。'
          : month.value >= 6 && month.value <= 8
            ? '啊，天气好热啊，果然是夏天。'
            : month.value >= 9 && month.value <= 11
              ? '啊，天气好热啊，明明是秋天。'
              : '啊，天气好热啊，明明是冬天。'
    },
    { motion: 'ciallo', text: 'Ciallo～(∠・ω< )⌒☆', sound: 'ciallo' },
    // Original, character-inspired lines — not quotations from the game.
    { motion: 'nod', text: '主人，要不要一起去穗织散散步？', sound: 'character' },
    { motion: 'shake', text: '吾辈可是丛雨丸的管理者，才不是小孩子！', sound: 'character' },
    { motion: 'swing', text: '等验证码的工夫，陪吾辈坐一会儿吧。', sound: 'character' }
  ])
  const tip = computed(() => (annoyed.value ? angryTip : tips.value[Math.max(0, index.value)]!))
  const motionDuration = computed(() =>
    tip.value.motion === 'ciallo' ? DESERT_CIALLO_MS : DESERT_MOTION_MS
  )

  function dismiss() {
    clearTimeout(timer)
    timer = undefined
    queued = false
    active.value = false
    playing.value = false
  }

  function greet() {
    if (disposed || !isOpen()) return
    const reducedMotion = options.reducedMotion?.() ?? false
    if (reducedMotion) {
      clearTimeout(timer)
      timer = undefined
      queued = false
      playing.value = false
    }
    if (playing.value) {
      // Coalesce rapid taps: finish at the rest pose before starting one next action.
      queued = true
      return
    }
    month.value = new Date().getMonth() + 1
    if (!annoyed.value) index.value = (index.value + 1) % tips.value.length
    active.value = true
    if (annoyed.value) {
      // Remain angry until a full refresh, but don't restart sound/motion on every jitter.
      const now = Date.now()
      if (now - lastAngryReaction < DESERT_MOTION_MS) return
      lastAngryReaction = now
    }
    reaction.value++
    if (reducedMotion) return
    playing.value = true
    timer = setTimeout(() => {
      timer = undefined
      playing.value = false
      if (queued) {
        queued = false
        greet()
      }
    }, motionDuration.value)
  }

  function hover() {
    if (disposed || !isOpen() || active.value) return
    const now = Date.now()
    hoverEntries = hoverEntries.filter((at) => now - at <= DESERT_HOVER_WINDOW_MS)
    hoverEntries.push(now)
    if (hoverEntries.length >= DESERT_HOVER_LIMIT) {
      annoyed.value = true
      hoverEntries = []
    }
    greet()
  }

  watch(
    isOpen,
    () => {
      dismiss()
      hoverEntries = []
    },
    { flush: 'sync' }
  )
  onScopeDispose(() => {
    disposed = true
    dismiss()
  })

  return {
    active: readonly(active),
    playing: readonly(playing),
    reaction: readonly(reaction),
    tip,
    motionDuration,
    greet,
    hover,
    dismiss
  }
}
