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
.article-navigation {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.375rem 1rem;
  padding: 0.75rem 0;
  border-block: 1px solid var(--ui-border);
}
.article-navigation:has(> :last-child:nth-child(4)) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.article-navigation .article-navigation-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-width: 0;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  color: var(--ui-text-muted);
  text-decoration: none;
  font-size: var(--text-label);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.article-navigation-link .iconify {
  flex: 0 0 1rem;
  width: 1rem;
  height: 1rem;
}
.article-navigation .article-navigation-link:hover,
.article-navigation .article-navigation-link:focus-visible,
.article-navigation .article-navigation-link[aria-current='location'] {
  background: var(--wash);
  color: var(--ui-text-highlighted);
}
.article-navigation .article-navigation-link:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
@media (max-width: 600px) {
  .article-navigation,
  .article-navigation:has(> :last-child:nth-child(4)) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 0.5rem;
  }
  .article-navigation .article-navigation-link {
    padding-inline: 0.5rem;
  }
}
@media (max-width: 420px) {
  .article-navigation,
  .article-navigation:has(> :last-child:nth-child(4)) {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
