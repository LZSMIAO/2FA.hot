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
    :delay-duration="0"
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
        content: 'mc-select-menu',
        item: 'mc-select-item',
        itemLabel: 'mc-select-item-label',
        trailingIcon: 'mc-select-trailing'
      }"
      selected-icon="i-mc-check"
      trailing-icon="i-mc-chevron-down"
    />
  </UTooltip>
</template>
