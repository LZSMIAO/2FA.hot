<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
const offline = useOfflineMode()
const on = computed(() => offline.status.value === 'saving' || offline.status.value === 'ready')
/** Safari on iPhone or iPad, not already opened from the home screen. */
const homeScreenHint = shallowRef(false)
const dismissed = shallowRef(false)
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  homeScreenHint.value =
    document.documentElement.hasAttribute('data-ios') &&
    !matchMedia('(display-mode: standalone)').matches &&
    !(navigator as Navigator & { standalone?: boolean }).standalone
  offline.check()
})
onBeforeUnmount(() => clearTimeout(timer))

async function toggle() {
  dismissed.value = false
  if (on.value) await offline.disable()
  else await offline.enable()
}
// The confirmation stays long enough to read, the home screen tip longer.
watch(offline.justSaved, (saved) => {
  clearTimeout(timer)
  if (saved)
    timer = setTimeout(
      () => (offline.justSaved.value = false),
      homeScreenHint.value ? 12_000 : 5_000
    )
})

// Shown as a floating notice, so the panel under the tool never changes height.
const notice = computed(() => {
  if (dismissed.value) return null
  if (offline.status.value === 'saving')
    return {
      icon: 'i-lucide-download',
      message: tx('正在保存离线文件… {percent}%', { percent: offline.progress.value })
    }
  if (offline.status.value === 'error')
    return {
      icon: 'i-lucide-wifi-off',
      message: tx('离线文件没有保存完成，请联网后再开一次。')
    }
  if (offline.justSaved.value)
    return {
      icon: 'i-lucide-check',
      message: tx(
        homeScreenHint.value
          ? '已可离线使用。在 Safari 分享菜单选“添加到主屏幕”，就能像 App 一样打开。'
          : '已可离线使用。'
      )
    }
  return null
})
function close() {
  dismissed.value = true
  offline.justSaved.value = false
}
</script>
<template>
  <div class="offline-toggle">
    <span class="offline-label"
      >{{ tx('离线使用')
      }}<AppHint :text="tx('离线使用说明')"
        ><NuxtLink
          :to="localePath('/privacy') + '#offline'"
          class="offline-help info-mark"
          :aria-label="tx('离线使用说明')"
          ><UIcon name="i-lucide-info" /></NuxtLink></AppHint
    ></span>
    <AppHint
      :text="
        tx(
          !offline.supported.value ? '此浏览器不支持离线使用' : on ? '关闭离线使用' : '开启离线使用'
        )
      "
      ><PixelSwitch
        :checked="on"
        :label="tx(on ? '关闭离线使用' : '开启离线使用')"
        :disabled="!offline.supported.value || offline.status.value === 'saving'"
        @toggle="toggle"
    /></AppHint>
    <ActionHint
      :open="!!notice"
      :message="notice?.message || ''"
      :icon="notice?.icon || 'i-lucide-download'"
      @close="close"
    />
  </div>
</template>
<style scoped>
.offline-toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.75rem;
}
.offline-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: var(--text-label);
  line-height: 1.5;
  white-space: nowrap;
}
.offline-help {
  color: var(--ui-text-muted);
}
.offline-help:hover,
.offline-help:focus-visible {
  color: var(--ui-text-highlighted);
}
@media (max-width: 700px) {
  .offline-toggle {
    /* Stacked on a phone, history keeps the first row it always had. */
    order: 1;
    justify-content: space-between;
    width: 100%;
  }
}
</style>
