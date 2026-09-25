<script setup lang="ts">
/** The Ore-style on/off switch, shared by the settings under the tool. */
defineProps<{ checked: boolean; label: string; disabled?: boolean }>()
defineEmits<{ toggle: [] }>()
</script>
<template>
  <button
    type="button"
    role="switch"
    class="history-switch"
    :aria-checked="checked"
    :aria-label="label"
    :disabled="disabled"
    @click="$emit('toggle')"
  >
    <span class="history-switch-thumb" />
  </button>
</template>
<style scoped>
.history-switch {
  position: relative;
  flex: 0 0 3rem;
  width: 3rem;
  height: 1.625rem;
  padding: 0;
  border: 2px solid var(--ore-outline);
  border-radius: 0;
  background: var(--wash);
  box-shadow:
    var(--ore-inset),
    0 2px 0 var(--ore-outline);
  cursor: pointer;
}
.history-switch[aria-checked='true'] {
  background: #3c8527;
}
.history-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.125rem;
  height: 1.125rem;
  background: #c6c6c6;
  box-shadow:
    var(--ore-bevel),
    1px 1px 0 var(--ore-outline);
}
.history-switch[aria-checked='true'] .history-switch-thumb {
  left: calc(100% - 1.125rem - 2px);
}
.history-switch:hover:not(:disabled) .history-switch-thumb {
  background: #eee;
}
.history-switch:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 4px;
}
.history-switch:disabled {
  cursor: default;
  opacity: var(--ore-disabled-opacity);
}
</style>
