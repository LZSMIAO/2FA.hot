<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
const offline = useOfflineMode()
const on = computed(() => offline.status.value === 'saving' || offline.status.value === 'ready')
/** Safari on iPhone or iPad, not already opened from the home screen. */
const homeScreenHint = shallowRef(false)
const dismissed = shallowRef(false)
let timer: ReturnType<typeof setTimeout> | undefined
const { online } = useNetworkStatus()
const remembered = (key: string) => {
  try {
    if (localStorage.getItem(key)) return true
    localStorage.setItem(key, '1')
  } catch {}
  return false
}

onMounted(async () => {
  homeScreenHint.value = document.documentElement.hasAttribute('data-ios') && !runningAsApp()
  await offline.check()
  // The installed app is meant to open without a network, so it turns offline
  // mode on by itself, once: switched off there later, it stays off.
  if (
    runningAsApp() &&
    offline.supported.value &&
    offline.status.value === 'off' &&
    navigator.onLine &&
    !remembered('2fa-offline-auto-v1')
  )
    await offline.enable()
})
onBeforeUnmount(() => clearTimeout(timer))

async function toggle() {
  dismissed.value = false
  if (on.value) await offline.disable()
  else await offline.enable()
}
/*
 * The first time the files are kept, the confirmation invites a try with the
 * network off; it stays long enough to read, the longer tips longer.
 */
const inviteTry = shallowRef(false)
watch(offline.justSaved, (saved) => {
  clearTimeout(timer)
  if (!saved) return
  inviteTry.value = !homeScreenHint.value && !remembered('2fa-offline-try-tip-v1')
  timer = setTimeout(
    () => (offline.justSaved.value = false),
    homeScreenHint.value || inviteTry.value ? 12_000 : 5_000
  )
})
/** Going offline with everything kept earns a word of praise, once. */
const praising = shallowRef(false)
watch(online, (connected) => {
  if (connected || offline.status.value !== 'ready' || remembered('2fa-offline-praise-v1')) return
  dismissed.value = false
  praising.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (praising.value = false), 8_000)
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
  if (praising.value)
    return { icon: 'i-lucide-thumbs-up', message: tx('太好了，已断网！验证码照常产生。') }
  if (offline.justSaved.value)
    return {
      icon: 'i-lucide-check',
      message: tx(
        homeScreenHint.value
          ? '已可离线使用。在 Safari 分享菜单选“添加到主屏幕”，就能像 App 一样打开。'
          : inviteTry.value
            ? '已可离线使用。可以关掉 Wi-Fi 试试，验证码照常产生。'
            : '已可离线使用。'
      )
    }
  return null
})
function close() {
  dismissed.value = true
  praising.value = false
  offline.justSaved.value = false
}
/** The icon also tells whether the device is offline right now. */
const iconHint = computed(() => (online.value ? '离线使用说明' : '已断网，验证码照常产生'))
</script>
<template>
  <div class="offline-toggle">
    <!-- An icon in place of the name; it opens what offline mode keeps and why. -->
    <AppHint :text="tx(iconHint)"
      ><NuxtLink
        :to="localePath('/privacy') + '#offline'"
        class="offline-help"
        :class="{ 'is-disconnected': !online }"
        :aria-label="tx(iconHint)"
        ><UIcon name="i-lucide-wifi-off" /></NuxtLink
    ></AppHint>
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
.offline-help {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  /* The target is wider than the glyph: the glyph starts in line with the text
     above and sits close beside its switch, 6px off, as the history icon does. */
  margin-inline: -0.625rem -1rem;
  color: var(--ui-text-muted);
}
/* As tall as the switch's track, so the pair reads as one control. */
.offline-help .iconify {
  width: 1.5rem;
  height: 1.5rem;
}
.offline-help:hover,
.offline-help:focus-visible {
  color: var(--ui-text-highlighted);
}
/* The device has no network: the tool still works, and the icon says so. */
.offline-help.is-disconnected {
  color: var(--accent-ink);
}
</style>
