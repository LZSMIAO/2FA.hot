<script setup lang="ts">
/*
 * Installs the site as an app where the browser offers it (not in Safari,
 * whose home screen tip lives with offline mode). Rather than a notice, a
 * visitor who has gone quiet sees the line beside this icon fade into an
 * invitation to install (see index.vue), once a visit and no more than a few
 * visits in all; an install is confirmed with where to find the app.
 */
const { tx } = useMessages()
const { available, installed, inviting, inviteHeld, install } = useAppInstall()
const offline = useOfflineMode()
const tip = shallowRef(false)
let tipTimer: ReturnType<typeof setTimeout> | undefined
let idleTimer: ReturnType<typeof setTimeout> | undefined
let inviteTimer: ReturnType<typeof setTimeout> | undefined
let invited = false
const inviteKey = '2fa-install-invites'
const idleEvents = [
  'pointermove',
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'scroll'
] as const

function inviteOnceMore() {
  try {
    const count = Number(localStorage.getItem(inviteKey)) || 0
    if (count >= 5) return false
    localStorage.setItem(inviteKey, String(count + 1))
    return true
  } catch {
    return false
  }
}
function invite() {
  // Not offline, where installing cannot finish, nor while the files are being kept.
  if (!available.value || invited || !navigator.onLine || offline.status.value === 'saving') return
  if (!inviteOnceMore()) return
  invited = true
  inviting.value = true
  stopWatching()
  inviteTimer = setTimeout(() => (inviting.value = false), 12_000)
}
function restartIdle() {
  clearTimeout(idleTimer)
  idleTimer = setTimeout(invite, 8_000)
}
function stopWatching() {
  clearTimeout(idleTimer)
  for (const type of idleEvents) window.removeEventListener(type, restartIdle)
}
// Held while the pointer rests on the invitation, so it can be read and clicked.
watch(inviteHeld, (held) => {
  clearTimeout(inviteTimer)
  if (!held && inviting.value) inviteTimer = setTimeout(() => (inviting.value = false), 4_000)
})
// The browser may offer installing some time after the page has loaded.
onMounted(() =>
  watch(
    available,
    (offered) => {
      stopWatching()
      if (!offered || invited) return
      for (const type of idleEvents) window.addEventListener(type, restartIdle, { passive: true })
      restartIdle()
    },
    { immediate: true }
  )
)
watch(installed, (value) => {
  if (!value) return
  tip.value = true
  clearTimeout(tipTimer)
  tipTimer = setTimeout(() => (tip.value = false), 10_000)
})
onBeforeUnmount(() => {
  stopWatching()
  clearTimeout(tipTimer)
  clearTimeout(inviteTimer)
  inviting.value = false
})
</script>
<template>
  <!-- The computer beside "processed locally", which installs the site where the browser offers it. -->
  <span class="app-install">
    <AppHint v-if="available" :text="tx('安装 App')"
      ><button
        type="button"
        class="app-install-button"
        :class="{ 'is-inviting': inviting }"
        :aria-label="tx('安装 App')"
        @click="install"
      >
        <UIcon name="i-lucide-monitor-down" /></button
    ></AppHint>
    <!-- Until the offer arrives: the download too if this browser offered it
         before (html[data-installable], set before the first paint). -->
    <span v-else class="app-install-idle"
      ><UIcon name="i-lucide-monitor" class="app-install-plain" /><UIcon
        name="i-lucide-monitor-down"
        class="app-install-offered"
    /></span>
    <ActionHint
      :open="tip"
      :message="tx('已安装，可以从桌面或主屏幕直接打开。')"
      icon="i-mc-check"
      @close="tip = false"
    />
  </span>
</template>
<style scoped>
.app-install {
  display: inline-grid;
  flex-shrink: 0;
}
/* Where the browser offers installing, the computer shows the download in it
   from the start; hovering only brightens it, as the other icons do. */
.app-install-button {
  position: relative;
  display: grid;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: color 400ms ease;
}
/* A usable target around the small glyph, as the info marks have. */
.app-install-button::after {
  content: '';
  position: absolute;
  inset: -0.5rem;
}
@media (pointer: coarse) {
  .app-install-button::after {
    inset: -0.875rem;
  }
}
.app-install-button:hover,
.app-install-button:focus-visible {
  color: var(--ui-text-highlighted);
}
/* While the line beside it invites installing, the icon joins in. */
.app-install-button.is-inviting {
  color: var(--accent-ink);
}
.app-install-idle {
  display: grid;
}
@media (prefers-reduced-motion: reduce) {
  .app-install-button {
    transition: none;
  }
}
</style>
