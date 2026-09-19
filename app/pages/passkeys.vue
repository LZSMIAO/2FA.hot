<script setup lang="ts">
// Keep existing extension/store links working without a separate content page.
const localePath = useLocalePath()
const route = useRoute()
await navigateTo(
  { path: localePath('/'), query: { ...route.query, passkeys: '1' }, hash: route.hash },
  { redirectCode: 301, replace: true }
)
</script>

<template><span /></template>
