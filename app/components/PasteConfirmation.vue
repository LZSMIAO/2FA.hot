<script setup lang="ts">
defineProps<{ show: boolean }>()
const { tx } = useMessages()
</script>
<template>
  <p class="paste-confirmation" role="status" aria-live="polite">
    <Transition name="paste-confirmation"
      ><span v-if="show">{{ tx('已粘贴内容') }}</span></Transition
    >
  </p>
</template>
<style scoped>
.paste-confirmation {
  margin: 0;
  color: var(--accent-ink);
  font-size: var(--text-caption);
  pointer-events: none;
}
.paste-confirmation span {
  display: inline-block;
  padding-inline: 0.375rem;
  background: var(--panel);
}
/* The same fade as the notices under the input. */
.paste-confirmation-enter-active,
.paste-confirmation-leave-active {
  transition: opacity 180ms ease;
}
.paste-confirmation-enter-from,
.paste-confirmation-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .paste-confirmation-enter-active,
  .paste-confirmation-leave-active {
    transition: none;
  }
}
</style>
