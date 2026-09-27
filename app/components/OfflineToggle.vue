<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
const offline = useOfflineMode()
const on = computed(() => offline.status.value === 'saving' || offline.status.value === 'ready')
/** Whether this page has asked the browser yet; until then the setting shows as last known. */
const checked = shallowRef(false)
const known = computed(() => checked.value || offline.status.value !== 'off')
/** Safari on iPhone or iPad, not already opened from the home screen. */
const homeScreenHint = shallowRef(false)
/** Opened as the installed app, which keeps offline mode on and has no switch for it. */
const inApp = shallowRef(false)
const asApp = useRunningAsApp()
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

/*
 * The installed app is meant to open without a network, so offline mode is
 * always on there: whenever its files are missing - never kept yet, or
 * removed from a browser tab that shares its storage - it keeps them again.
 * Removing the app is how its copy goes.
 */
async function keepOnInApp() {
  if (inApp.value && offline.supported.value && offline.status.value === 'off' && navigator.onLine)
    await offline.enable()
}
onMounted(async () => {
  inApp.value = asApp.value
  homeScreenHint.value = document.documentElement.hasAttribute('data-ios') && !inApp.value
  await offline.check()
  checked.value = true
  inApp.value = asApp.value
  await keepOnInApp()
})
// Installed from this tab, the page is the app from then on: no switch, and offline use on.
watch(asApp, async (value) => {
  if (!checked.value) return
  inApp.value = value
  if (!value) return
  homeScreenHint.value = false
  await keepOnInApp()
})
onBeforeUnmount(() => clearTimeout(timer))

async function toggle() {
  dismissed.value = false
  if (on.value) await offline.disable()
  else await offline.enable()
}
/*
 * The first time the files are kept, the confirmation adds that codes still
 * come with no network; it stays long enough to read, the longer tips longer.
 */
const inviteTry = shallowRef(false)
/** The first time the files are kept, the notice also offers what offline use is. */
const firstTry = shallowRef(false)
watch(offline.justSaved, (saved) => {
  clearTimeout(timer)
  if (!saved) return
  inviteTry.value = !homeScreenHint.value && !remembered('2fa-offline-try-tip-v1')
  firstTry.value = !remembered('2fa-offline-help-v1')
  timer = setTimeout(
    () => (offline.justSaved.value = false),
    homeScreenHint.value || inviteTry.value || firstTry.value ? 12_000 : 5_000
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
      // The app has no switch to turn it on again; it finishes on its next online open.
      message: tx(
        inApp.value
          ? '离线文件没有保存完成，下次联网打开时会自动补齐。'
          : '离线文件没有保存完成，请联网后再开一次。'
      )
    }
  if (praising.value)
    return { icon: 'i-lucide-thumbs-up', message: tx('太好了，已断网！验证码照常产生。') }
  if (offline.justSaved.value)
    return {
      icon: 'i-mc-check',
      message: tx(
        homeScreenHint.value
          ? '已可离线使用。在 Safari 分享菜单选“添加到主屏幕”，就能像 App 一样打开。'
          : inviteTry.value
            ? '已可离线使用。断网也能照常获取验证码。'
            : '已可离线使用。'
      ),
      action: firstTry.value ? tx('离线使用说明') : undefined
    }
  return null
})
function openHelp() {
  close()
  navigateTo(localePath('/privacy') + '#offline')
}
function close() {
  dismissed.value = true
  praising.value = false
  offline.justSaved.value = false
}
/** On touch, the icon's name also tells whether the device is offline right now. */
const iconHint = computed(() => (online.value ? '离线使用说明' : '已断网，验证码照常产生'))
</script>
<template>
  <div class="offline-toggle">
    <!-- The installed app keeps offline mode on: no switch, only how it stands. -->
    <SummarySwitch
      icon="i-lucide-wifi-off"
      :name="tx('离线使用')"
      :action="
        tx(
          !offline.supported.value ? '此浏览器不支持离线使用' : on ? '关闭离线使用' : '开启离线使用'
        )
      "
      :checked="on"
      :disabled="!offline.supported.value || offline.status.value === 'saving'"
      :pending="!known"
      :to="localePath('/privacy') + '#offline'"
      :link-label="tx(iconHint)"
      :status="
        inApp ? tx(offline.status.value === 'ready' ? '已可离线使用' : '离线使用') : undefined
      "
      fixed-in-app
      :lit="!online"
      @toggle="toggle"
    />
    <ActionHint
      :open="!!notice"
      :message="notice?.message || ''"
      :icon="notice?.icon || 'i-lucide-download'"
      :action="notice?.action"
      @action="openHelp"
      @close="close"
    />
  </div>
</template>
<style scoped>
.offline-toggle {
  display: flex;
  align-items: center;
}
</style>
