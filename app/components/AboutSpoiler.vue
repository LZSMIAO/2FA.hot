<script setup lang="ts">
defineProps<{ label: string; text: string }>()
</script>

<template>
  <details class="about-spoiler">
    <summary>
      <span>{{ label }}</span>
      <UIcon name="i-mc-chevron-down" class="about-spoiler-chevron" aria-hidden="true" />
    </summary>
    <div class="about-spoiler-body">
      <p v-for="(paragraph, index) in text.split(/\n\s*\n/)" :key="index">
        <AboutInline :text="paragraph" />
      </p>
    </div>
  </details>
</template>

<style scoped>
/* The same Ore accordion as the home page's questions (ToolExplainer.vue). */
.about-spoiler {
  margin-block: 0.75rem;
}
summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 2.75rem;
  padding: 0.4375rem 0.875rem;
  border: 2px solid var(--ore-outline);
  background: var(--ore-control);
  box-shadow: var(--ore-bevel);
  color: var(--ui-text-highlighted);
  cursor: pointer;
  list-style: none;
  transition: background-color 100ms;
  -webkit-tap-highlight-color: transparent;
}
summary::-webkit-details-marker {
  display: none;
}
@media (hover: hover) {
  summary:hover {
    background: var(--ore-control-hover);
  }
}
summary:active {
  box-shadow:
    inset 2px 2px 0 var(--ore-shade),
    inset -2px -2px 0 var(--ore-highlight);
}
summary:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.about-spoiler-chevron {
  flex: none;
  width: 1rem;
  height: 1rem;
}
details[open] .about-spoiler-chevron {
  transform: rotate(180deg);
}
.about-spoiler-body {
  padding: 0.25rem 0.875rem;
  border: 2px solid var(--ore-outline);
  border-top: 0;
  background: var(--wash);
}
</style>
