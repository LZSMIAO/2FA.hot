<script setup lang="ts">
definePageMeta({ viewTransition: false })
const { tx } = useMessages()
</script>
<template>
  <div class="home history-page">
    <!-- No title or lead on screen: the header's navigation already names the
         page, and the records start right under it. The heading stays for
         screen readers and the page outline. -->
    <h1 class="sr-only">{{ tx('本地历史') }}</h1>
    <HistoryWorkspace />
  </div>
</template>
