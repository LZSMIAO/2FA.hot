<script setup lang="ts">
import { countdownState } from '~/utils/countdown-state'
import { groupCode, type OtpConfig } from '~/utils/otp'
const props = defineProps<{ config: OtpConfig }>()
const { tx } = useMessages()
const { code, error, remaining, current } = useOtp(computed(() => props.config))
const { copied, message, copy } = useCopy()
const working = shallowRef(false)
async function copyCode() {
  if (working.value) return
  working.value = true
  try {
    await copy(await current())
  } catch (cause) {
    message.value = (cause as Error).message
  } finally {
    working.value = false
  }
}
</script>
<template>
  <div class="history-code">
    <button
      class="history-code-copy"
      :disabled="!code || !!error || working"
      :aria-label="tx('复制验证码')"
      @click="copyCode"
    >
      <span class="history-code-digits" :style="{ width: `${config.digits + 1}ch` }">{{
        code ? groupCode(code) : '— — —'
      }}</span>
      <UIcon :name="copied ? 'i-mc-check' : 'i-lucide-copy'" />
    </button>
    <small
      class="history-countdown"
      :data-countdown-state="countdownState(!!code, remaining, config.period)"
      >{{ code ? String(remaining).padStart(2, '0') : '—' }}s</small
    >
    <span v-if="copied" class="sr-only" role="status">{{ tx('验证码已复制') }}</span>
    <small v-if="error || message" class="history-code-message" role="alert">{{
      tx(error || message)
    }}</small>
  </div>
</template>
<style scoped>
.history-code {
  display: grid;
  grid-template-columns: auto 4ch;
  align-items: center;
  gap: 0.5rem;
  direction: ltr;
  flex-shrink: 0;
}
.history-code-copy {
  display: inline-grid;
  grid-template-columns: auto 1rem;
  align-items: center;
  gap: 0.625rem;
  min-height: 44px;
  padding: 0.375rem 0.625rem;
  border: 2px solid var(--ore-outline);
  background: var(--wash);
  box-shadow: var(--ore-bevel);
  color: var(--ui-text-highlighted);
  cursor: pointer;
}
.history-code-copy:hover:not(:disabled) {
  background: var(--ore-control);
}
.history-code-copy:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 3px;
}
.history-code-copy :deep(.iconify) {
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
}
.history-code .history-code-digits {
  display: block;
  font-family: var(--font-code);
  font-size: 1.875rem;
  line-height: 1.2;
  white-space: pre;
  text-align: center;
}
.history-countdown {
  display: block;
  width: 4ch;
  text-align: end;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}
.history-code-message {
  grid-column: 1 / -1;
  font-size: var(--text-caption);
  max-width: 24rem;
  overflow-wrap: anywhere;
}
@media (max-width: 600px) {
  .history-code .history-code-digits {
    font-size: 1.5625rem;
  }
  .history-code-copy {
    gap: 0.5rem;
    padding-inline: 0.5rem;
  }
}
</style>
