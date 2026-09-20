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
@media (min-width: 701px) {
  .history-page .page-intro {
    min-height: 7.5rem;
  }
  .history-page .page-intro h1 {
    /* Match the 2FA SVG's 13.5rem width and 86:39 aspect ratio. */
    min-height: calc(13.5rem * 39 / 86);
    display: flex;
    align-items: flex-end;
  }
}
.history-page .page-intro h1 {
  font-size: calc(var(--text-title) * 1.15);
  font-weight: 800;
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
  /* This sits on the panorama, where muted grey washes out in light mode. */
  color: var(--ui-text);
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
