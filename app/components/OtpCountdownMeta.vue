<script setup lang="ts">
import { countdownState } from '~/utils/countdown-state'
const props = defineProps<{
  active: boolean
  remaining: number
  period: number
  compact?: boolean
}>()
const state = computed(() => countdownState(props.active, props.remaining, props.period))
const { tx } = useMessages()
</script>

<template>
  <div :data-countdown-state="state">
    <div class="countdown-meta" :class="{ 'is-compact': compact }">
      <span :class="{ 'sr-only': compact }">{{
        tx(active && remaining <= 5 ? '即将更新' : '剩余时间')
      }}</span>
      <span class="countdown-value mono" dir="ltr">
        <span>{{ active ? String(remaining).padStart(2, '0') : '—' }}</span>
        <span>/ {{ period }}s</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.countdown-meta.is-compact {
  margin: 0;
  font-weight: 400;
  white-space: nowrap;
}
</style>
