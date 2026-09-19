<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
  <UTooltip
    :text="text"
    :delay-duration="0"
    :content="{ side: 'top', align: 'center', sideOffset: 2 }"
    :ui="{
      content: 'parameter-help-tooltip',
      arrow: 'parameter-help-arrow',
      text: 'whitespace-normal'
    }"
    arrow
  >
    <slot />
  </UTooltip>
</template>
