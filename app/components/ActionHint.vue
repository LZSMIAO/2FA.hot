<script setup lang="ts">
defineProps<{ open: boolean; message: string; icon: string }>()
defineEmits<{ close: [] }>()
const { tx } = useMessages()
function entranceSound() {
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'toast' }))
}
</script>
<template>
  <Teleport to="body">
    <Transition name="hint" appear @enter="entranceSound">
      <aside v-if="open" class="action-hint ore-theme" role="status" aria-live="polite">
        <UIcon :name="icon" class="hint-icon" />
        <span class="hint-message">{{ message }}</span>
        <button type="button" class="touch-reach" :aria-label="tx('关闭')" @click="$emit('close')">
          <UIcon name="i-lucide-x" />
        </button>
      </aside>
    </Transition>
  </Teleport>
</template>
<style scoped>
.action-hint {
  position: fixed;
  z-index: 10000;
  --hint-top: max(20px, env(safe-area-inset-top));
  top: var(--hint-top);
  left: 50vw;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 14px 16px;
  border: 2px solid var(--ore-outline);
  background: var(--panel);
  color: var(--ui-text);
  box-shadow: var(--ore-window-shadow);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}
/* A message may put its details on a second line. */
.hint-message {
  white-space: pre-line;
}
.hint-icon {
  flex-shrink: 0;
  color: var(--accent-ink);
  width: 24px;
  height: 24px;
}
button {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  cursor: pointer;
  border: 2px solid var(--ore-outline);
  background: var(--ore-control);
  box-shadow: var(--ore-button-shadow);
}
button:active {
  transform: translateY(2px);
  box-shadow: var(--ore-bevel);
}
@media (hover: hover) {
  button:hover {
    background: var(--ore-control-hover);
    color: var(--ui-text-highlighted);
  }
}
@media (max-width: 640px) {
  .action-hint {
    --hint-top: max(80px, env(safe-area-inset-top));
    gap: 8px;
    padding: 12px;
  }
}
.hint-enter-active {
  animation: hint-arrive 1546ms steps(24, end) both;
}
.hint-leave-active {
  transition: transform 320ms steps(8, end);
  pointer-events: none;
}
.hint-enter-from,
.hint-leave-to {
  transform: translate(-50%, calc(-100% - var(--hint-top)));
}
.hint-enter-to,
.hint-leave-from {
  transform: translate(-50%, 0);
}
/* Match the original toast's 1.546s duration: slide, settle, then let its tail finish. */
@keyframes hint-arrive {
  0% {
    transform: translate(-50%, calc(-100% - var(--hint-top)));
  }
  40% {
    transform: translate(-50%, 3px);
  }
  60%,
  100% {
    transform: translate(-50%, 0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .hint-enter-active,
  .hint-leave-active {
    animation: none;
    transition: none;
  }
}
</style>
