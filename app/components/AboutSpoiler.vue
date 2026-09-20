<script setup lang="ts">
defineProps<{ label: string; text: string }>()
</script>

<template>
  <details class="about-spoiler">
    <summary>{{ label }}</summary>
    <p v-for="(paragraph, index) in text.split(/\n\s*\n/)" :key="index">
      <AboutInline :text="paragraph" />
    </p>
  </details>
</template>

<style scoped>
.about-spoiler {
  border: 2px solid var(--ui-border);
  padding: 0.75rem 1rem;
  background: var(--panel);
}
summary {
  cursor: pointer;
}
summary:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 4px;
}
</style>
