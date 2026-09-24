<script setup lang="ts">
// Images, when given, are the original input and replace the text preview.
defineProps<{ message: string; source: string; images?: string[] }>()
const { tx } = useMessages()
</script>
<template>
  <div class="field-hint" role="status">
    <UPopover
      mode="hover"
      :open-delay="150"
      :close-delay="150"
      enable-touch
      :content="{ side: 'bottom', align: 'start', collisionPadding: 12 }"
    >
      <button type="button" class="paste-notice-trigger">{{ tx(message) }}</button>
      <template #content>
        <div v-if="images?.length" class="paste-original-preview paste-original-images">
          <img v-for="image in images" :key="image" :src="image" alt="" />
        </div>
        <pre v-else class="paste-original-preview">{{ source }}</pre>
      </template>
    </UPopover>
  </div>
</template>
<style scoped>
.paste-notice-trigger {
  text-align: start;
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 4px;
}
.paste-notice-trigger:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 3px;
}
.paste-original-preview {
  max-width: min(32rem, calc(100vw - 24px));
  max-height: 14rem;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--ui-text);
}
.paste-original-images {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.paste-original-images img {
  width: 7.5rem;
  height: 7.5rem;
  object-fit: contain;
}
</style>
