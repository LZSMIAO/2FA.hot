<script setup lang="ts">
defineProps<{
  items: { id: string; label: string; icon?: string }[]
}>()
const route = useRoute()
const { tx } = useMessages()
</script>

<template>
  <nav class="article-navigation" :aria-label="tx('本页目录')">
    <NuxtLink
      v-for="item in items"
      :key="item.id"
      class="article-navigation-link"
      :to="{ path: route.path, query: route.query, hash: `#${item.id}` }"
      :aria-current="route.hash === `#${item.id}` ? 'location' : undefined"
    >
      <UIcon :name="item.icon || 'i-lucide-book-open'" aria-hidden="true" />
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
/* As wide as their words, so a short last row leaves no empty cell. */
.article-navigation {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block: 0.5rem 0.25rem;
}
/* Each section as an Ore control, like the guide cards and the way back. */
.article-navigation .article-navigation-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--ore-outline);
  background: var(--ore-control);
  box-shadow: var(--ore-button-shadow);
  color: var(--ui-text-highlighted);
  text-decoration: none;
  font-size: var(--text-label);
  line-height: 1.5;
  overflow-wrap: anywhere;
  transition:
    background-color 100ms,
    transform 80ms,
    box-shadow 80ms;
}
.article-navigation-link .iconify {
  flex: 0 0 1rem;
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
}
@media (hover: hover) {
  .article-navigation .article-navigation-link:hover {
    background: var(--ore-control-hover);
  }
}
.article-navigation .article-navigation-link:active,
.article-navigation .article-navigation-link[aria-current='location'] {
  transform: translateY(2px);
  box-shadow:
    var(--ore-bevel),
    0 1px 0 var(--ore-outline);
}
.article-navigation .article-navigation-link:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
/* On a phone, two to a row filling it, then one. */
@media (max-width: 600px) {
  .article-navigation .article-navigation-link {
    flex: 1 1 calc(50% - 0.25rem);
    padding-inline: 0.5rem;
  }
}
@media (max-width: 420px) {
  .article-navigation .article-navigation-link {
    flex-basis: 100%;
  }
}
</style>
