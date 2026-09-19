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
      :model-value="secret"
      :type="revealed ? 'text' : 'password'"
      :aria-label="labelId ? undefined : tx('密钥')"
      :aria-labelledby="labelId"
      readonly
      autocomplete="off"
      spellcheck="false"
      dir="ltr"
      size="xl"
      class="w-full"
      :ui="{ base: 'font-mono pr-14' }"
    >
      <template #trailing>
        <UButton
          color="neutral"
          variant="ghost"
          :icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          :aria-label="tx(revealed ? '隐藏密钥' : '查看密钥')"
          :aria-pressed="revealed"
          @click="revealed = !revealed"
        />
      </template>
    </UInput>
  </motion.div>
</template>

<style scoped>
.secret-reveal {
  margin-top: 1rem;
  min-width: 0;
}
</style>
