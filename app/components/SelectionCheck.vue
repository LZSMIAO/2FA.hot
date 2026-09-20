<script setup lang="ts">
defineProps<{ checked: boolean | 'mixed'; label: string }>()
</script>
<template>
  <button
    type="button"
    role="checkbox"
    class="selection-check"
    :aria-checked="checked"
    :aria-label="label"
  >
    <span class="selection-box" aria-hidden="true"
      ><UIcon v-if="checked" :name="checked === 'mixed' ? 'i-mc-minus' : 'i-mc-check'"
    /></span>
    <slot />
  </button>
</template>
<style scoped>
.selection-check {
  /* Icon-only uses stay square; the select-all use carries a label and must grow. */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 32px;
  min-height: 32px;
  flex: 0 0 auto;
  white-space: nowrap;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  touch-action: none;
  user-select: none;
}
.selection-check > .selection-box {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 2px solid var(--ui-text-muted);
  background: var(--ui-bg);
  box-shadow: inset 2px 2px 0 rgb(0 0 0 / 18%);
}
.selection-check[aria-checked='true'] > .selection-box,
.selection-check[aria-checked='mixed'] > .selection-box {
  background: var(--action);
  border-color: var(--accent-ink);
  color: white;
  box-shadow: inset 2px 2px 0 rgb(255 255 255 / 18%);
}
.selection-check:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.selection-check .iconify {
  width: 16px;
  height: 16px;
}
.selection-check:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
@media (pointer: coarse) {
  .selection-check {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>
