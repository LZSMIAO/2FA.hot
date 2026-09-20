<script setup lang="ts">
import { createVault, vaultKey } from '~/composables/useVault'
import { unlocalizedPath } from '~~/shared/seo/routes'
import TitlePanorama from '~/components/TitlePanorama.vue'
provide(vaultKey, createVault())
const uiLocale = useInterfaceLocale()
useSiteSeo()
useHead({ script: [{ src: '/viewport-layout.js', tagPosition: 'head' }] })
// Measure the native scrollbar independently of whether this page currently scrolls.
// Keep content steady when a dialog locks scrolling while the background fills the viewport.
function measureScrollbar() {
  if (document.body.style.overflow === 'hidden') return
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none'
  document.body.append(probe)
  const width = probe.offsetWidth - probe.clientWidth
  probe.remove()
  document.documentElement.style.setProperty('--page-scrollbar-width', `${width}px`)
}
/*
 * A menu or dialog locks scrolling by setting overflow on the body, which takes
 * the scrollbar away. The reservation has to go with it, or the page keeps a
 * scrollbar-wide gap down its right edge for as long as the menu is open.
 */
let locked = false
let watcher: MutationObserver | undefined
function syncScrollLock() {
  const nowLocked = document.body.style.overflow === 'hidden'
  if (nowLocked === locked) return
  locked = nowLocked
  if (locked) document.documentElement.style.setProperty('--page-scrollbar-width', '0px')
  else measureScrollbar()
}
onMounted(() => {
  measureScrollbar()
  window.addEventListener('resize', measureScrollbar, { passive: true })
  watcher = new MutationObserver(syncScrollLock)
  watcher.observe(document.body, { attributes: true, attributeFilter: ['style'] })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureScrollbar)
  watcher?.disconnect()
})
</script>
<template>
  <UApp :locale="uiLocale" :toaster="null">
    <TitlePanorama />
    <div class="app-shell">
      <AppHeader />
      <main id="main-content" class="ore-theme">
        <NuxtPage :page-key="(route) => unlocalizedPath(route.path)" />
      </main>
      <AppFooter />
    </div>
  </UApp>
</template>
