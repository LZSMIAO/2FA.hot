<script setup lang="ts">
export interface McSelectItem {
  label: string
  value: string | number
}

defineProps<{
  items: McSelectItem[]
  id?: string
  caption?: string
  hint?: string
}>()

const model = defineModel<string | number>()
const menuOpen = shallowRef(false)

function select(value: string | number) {
  if (value === model.value) return
  model.value = value
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'select' }))
}
</script>

<template>
  <UTooltip
    :text="hint || caption"
    :disabled="!caption || menuOpen"
    :delay-duration="150"
    :content="{ side: 'top', align: 'center', sideOffset: 2 }"
    arrow
    :ui="{
      content: 'parameter-help-tooltip',
      arrow: 'parameter-help-arrow',
      text: 'whitespace-normal'
    }"
  >
    <USelectMenu
      v-model:open="menuOpen"
      :id="id"
      :aria-label="
        caption
          ? `${caption} ${items.find((item) => item.value === model)?.label ?? ''}`
          : undefined
      "
      :model-value="model"
      @update:model-value="select"
      :items="items"
      value-key="value"
      class="mc-select"
      color="neutral"
      variant="none"
      :highlight-on-hover="true"
      :search-input="false"
      :content="{
        align: 'start',
        side: 'bottom',
        sideOffset: 6,
        collisionPadding: 8,
        avoidCollisions: true,
        position: 'popper'
      }"
      :ui="{
        base: 'mc-select-button',
        content: id === 'otp-kind' ? 'mc-select-menu mc-select-menu-kind' : 'mc-select-menu',
        item: 'mc-select-item',
        itemLabel: 'mc-select-item-label',
        trailingIcon: 'mc-select-trailing'
      }"
      selected-icon="i-lucide-check"
      trailing-icon="i-lucide-chevron-down"
    >
      <template #item-label="{ item }">
        {{ item.label }}
        <span v-if="id === 'otp-kind' && item.value === 'steam'" class="mc-new-badge">NEW</span>
      </template>
    </USelectMenu>
  </UTooltip>
</template>

<style scoped>
.mc-new-badge {
  display: table;
  margin-top: 0.125rem;
  padding: 0.0625rem 0.25rem;
  background: #c8edac;
  color: #193c11;
  box-shadow: inset 0 -1px 0 #86b667;
  font:
    700 0.5625rem/1.25 system-ui,
    sans-serif;
  letter-spacing: 0.025em;
}
</style>
