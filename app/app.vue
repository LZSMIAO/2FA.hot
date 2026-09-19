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
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none'
  document.body.append(probe)
  const width = probe.offsetWidth - probe.clientWidth
  probe.remove()
  document.documentElement.style.setProperty('--page-scrollbar-width', `${width}px`)
}
onMounted(() => {
  measureScrollbar()
  window.addEventListener('resize', measureScrollbar, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('resize', measureScrollbar))
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
