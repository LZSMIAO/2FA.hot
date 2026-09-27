<script setup lang="ts">
definePageMeta({ viewTransition: false })
const { tx } = useMessages()
</script>
<template>
  <div class="home history-page">
    <!-- The name on screen is the block-lettered one, where the home page's
         title stands; the heading stays for screen readers and the outline. -->
    <h1 class="sr-only">{{ tx('本地历史') }}</h1>
    <div class="page-intro"><PageWordmark word="HISTORY" /></div>
    <HistoryWorkspace />
  </div>
</template>
