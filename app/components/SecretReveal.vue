<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'

defineProps<{ secret: string; labelId?: string }>()
const { tx } = useMessages()
const revealed = shallowRef(false)
const reducedMotion = useReducedMotion()
</script>

<template>
  <motion.div
    class="secret-reveal"
    :initial="false"
    :animate="{ opacity: reducedMotion ? 1 : revealed ? [0.5, 1] : [0.65, 1] }"
    :transition="{ duration: reducedMotion ? 0 : 0.22 }"
  >
    <UInput
      :model-value="revealed ? secret : '****************'"
      type="text"
      :aria-label="labelId ? undefined : tx('密钥')"
      :aria-labelledby="labelId"
      readonly
      autocomplete="off"
      spellcheck="false"
      dir="ltr"
      size="xl"
      class="w-full"
      :ui="{ base: revealed ? 'font-mono pr-14' : 'secret-pixel-mask pr-14' }"
    >
      <template #trailing>
        <button
          type="button"
          class="secret-visibility"
          :aria-label="tx(revealed ? '隐藏密钥' : '查看密钥')"
          :aria-pressed="revealed"
          @click="revealed = !revealed"
        >
          <UIcon :name="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
        </button>
      </template>
    </UInput>
  </motion.div>
</template>

<style scoped>
.secret-reveal {
  margin-top: 1rem;
  min-width: 0;
}
.secret-visibility {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.secret-visibility .iconify {
  width: 22px;
  height: 22px;
}
.secret-visibility:hover {
  color: var(--ui-text-highlighted);
}
.secret-visibility:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}
</style>
