<script setup lang="ts">
import { createVault, vaultKey } from '~/composables/useVault'
import { unlocalizedPath } from '~~/shared/seo/routes'
import TitlePanorama from '~/components/TitlePanorama.vue'
provide(vaultKey, createVault())
const uiLocale = useInterfaceLocale()
useSiteSeo()
const colorMode = useColorMode()
useHead(() => ({
  link: [
    {
      key: 'site-favicon',
      rel: 'icon',
      type: 'image/svg+xml',
      tagPriority: 40,
      // The brand key follows the system on its own; a chosen theme shows its sun or moon.
      href:
        colorMode.unknown || colorMode.preference === 'system'
          ? '/favicon.svg'
          : `/favicon-${colorMode.value === 'dark' ? 'dark' : 'light'}.svg`
    }
  ]
}))
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
  /*
   * This variable lives on the root, so writing it restyles the whole page.
   * Safari fires resize for every step of the address bar sliding away, and
   * doing that work per frame made the pinned header shiver against the
   * content. An overlay scrollbar measures the same 0 every time, so compare
   * before writing and the scroll costs nothing.
   */
  if (width === measured) return
  measured = width
  document.documentElement.style.setProperty('--page-scrollbar-width', `${width}px`)
}
/*
 * The reservation deliberately stays while a menu or dialog locks scrolling.
 * The lock takes the scrollbar away, and this used to drop the variable to 0
 * with it so the page would not keep a scrollbar-wide strip down its right
 * edge. But #main-content is sized from this value, so zeroing it widened the
 * layout by the scrollbar and slid everything centred half of that to the
 * right the moment a dialog opened, and back when it closed. The strip is the
 * same width the scrollbar covered and sits under the dialog's overlay; the
 * shift was the thing people saw.
 */
let measured = -1
let viewportWidth = 0
function onViewportResize() {
  // Keyboard/address-bar animations change height, not scrollbar geometry.
  const width = window.innerWidth
  if (width === viewportWidth) return
  viewportWidth = width
  measureScrollbar()
}
onMounted(() => {
  viewportWidth = window.innerWidth
  measureScrollbar()
  window.addEventListener('resize', onViewportResize, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onViewportResize)
})
</script>
<template>
  <UApp :locale="uiLocale" :toaster="null">
    <div class="app-shell">
      <TitlePanorama bounded />
      <AppHeader />
      <main id="main-content" class="ore-theme">
        <NuxtPage :page-key="(route) => unlocalizedPath(route.path)" />
      </main>
      <AppFooter />
    </div>
  </UApp>
</template>
