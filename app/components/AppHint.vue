<script setup lang="ts">
withDefaults(
  defineProps<{
    text: string
    side?: 'top' | 'bottom'
    /** Gone as the pointer leaves, and clicks pass through it to what it covers. */
    passing?: boolean
  }>(),
  { side: 'top' }
)
</script>

<template>
  <UTooltip
    :text="text"
    :delay-duration="0"
    :disable-hoverable-content="passing"
    :content="{ side, align: 'center', sideOffset: 2 }"
    :ui="{
      content: passing ? 'parameter-help-tooltip tip-passing' : 'parameter-help-tooltip',
      arrow: 'parameter-help-arrow',
      text: 'whitespace-normal'
    }"
    arrow
  >
    <slot />
  </UTooltip>
</template>
