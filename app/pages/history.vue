<script setup lang="ts">
const localePath = useLocalePath()
definePageMeta({ viewTransition: false })
const { tx } = useMessages()
</script>
<template>
  <div class="home history-page">
    <div class="page-intro">
      <div>
        <h1>{{ tx('本地历史') }}</h1>
        <p>
          {{ tx('记录保存在当前浏览器，可选择密码保护。') }}
          <AppHint :text="tx('保存与备份')"
            ><NuxtLink
              :to="localePath('/help#history')"
              class="history-intro-help"
              :aria-label="tx('保存与备份')"
              ><UIcon name="i-lucide-info" /></NuxtLink
          ></AppHint>
        </p>
      </div>
    </div>
    <HistoryWorkspace />
  </div>
</template>
<style scoped>
/*
 * The card lines up with the home page's mode tabs, so this intro reserves the
 * same height the tool wordmark and guide button take there.
 */
@media (min-width: 701px) {
  .history-page .page-intro {
    min-height: 7.5rem;
    align-items: flex-start;
  }
}
.history-page .page-intro h1 {
  font-size: calc(var(--text-title) * 1.15);
}
.history-page .page-intro p {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}
.history-intro-help {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  color: var(--ui-text-muted);
}
.history-intro-help:hover,
.history-intro-help:focus-visible {
  color: var(--accent-ink);
}
.history-intro-help :deep(.iconify) {
  width: 1rem;
  height: 1rem;
}
</style>
