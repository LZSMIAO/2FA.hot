<script setup lang="ts">
/*
 * Installs the site as an app where the browser offers it (not in Safari,
 * whose home screen tip lives with offline mode). Someone who already keeps
 * the site offline hears about it once, on a later visit; an install is
 * confirmed with where to find the app.
 */
const { tx } = useMessages()
const { available, installed, install } = useAppInstall()
const offline = useOfflineMode()
const tip = shallowRef<'suggest' | 'installed' | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
function show(kind: 'suggest' | 'installed') {
  tip.value = kind
  clearTimeout(timer)
  timer = setTimeout(() => (tip.value = null), 10_000)
}
function suggest() {
  // Not over another tip, not in the visit that has just saved the files, and
  // not offline, where installing cannot finish.
  if (!available.value || offline.status.value !== 'ready' || offline.justSaved.value) return
  if (!navigator.onLine) return
  if (document.querySelector('.action-hint')) return
  try {
    if (localStorage.getItem('2fa-install-tip-v1')) return
    localStorage.setItem('2fa-install-tip-v1', '1')
  } catch {
    return
  }
  show('suggest')
}
onMounted(() => {
  timer = setTimeout(suggest, 3_000)
})
watch(installed, (value) => {
  if (value) show('installed')
})
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <div class="app-install">
    <AppHint v-if="available" :text="tx('安装 App')"
      ><button
        type="button"
        class="app-install-button"
        :aria-label="tx('安装 App')"
        @click="install"
      >
        <UIcon name="i-lucide-monitor-down" /></button
    ></AppHint>
    <ActionHint
      :open="!!tip"
      :message="
        tx(
          tip === 'installed'
            ? '已安装，可以从桌面或主屏幕直接打开。'
            : '安装成 App 后，可以从桌面或主屏幕直接打开，断网也能用。'
        )
      "
      :icon="tip === 'installed' ? 'i-lucide-check' : 'i-lucide-monitor-down'"
      @close="tip = null"
    />
  </div>
</template>
<style scoped>
.app-install {
  display: flex;
  align-items: center;
}
.app-install-button {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.app-install-button .iconify {
  width: 1.25rem;
  height: 1.25rem;
}
.app-install-button:hover,
.app-install-button:focus-visible {
  color: var(--ui-text-highlighted);
}
.app-install:empty,
.app-install:not(:has(.app-install-button)) {
  display: none;
}
</style>
