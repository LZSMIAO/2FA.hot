<script setup lang="ts">
/*
 * The installed app often stays open for days, and on one page Nuxt's own
 * update (a full load on the next navigation) never comes. When Nuxt sees a
 * newer build (it asks hourly, and never offline), this offers the update.
 * Never on its own: a secret typed into the page lives only in memory, and a
 * reload would drop it, so the visitor picks the moment.
 */
const { tx } = useMessages()
const nuxtApp = useNuxtApp()
const open = shallowRef(false)
let stop: (() => void) | undefined

onMounted(() => {
  // Asked when the update comes, not at the start: a tab installed as the app
  // becomes the app without reloading.
  stop = nuxtApp.hook('app:manifest:update', () => {
    if (runningAsApp()) open.value = true
  })
})
onBeforeUnmount(() => stop?.())

function update() {
  open.value = false
  reloadNuxtApp({ persistState: false })
}
</script>

<template>
  <ActionHint
    :open="open"
    :message="tx('有新版本可用。')"
    icon="i-lucide-download"
    :action="tx('立即更新')"
    @action="update"
    @close="open = false"
  />
</template>
