<script setup lang="ts">
defineProps<{ busy: boolean }>()
defineEmits<{ retry: [] }>()
const { tx } = useMessages()
</script>

<template>
  <div class="article-language-notice" role="alert">
    <p>{{ tx('语言加载失败，请重试。') }}</p>
    <UButton color="neutral" variant="outline" :loading="busy" @click="$emit('retry')">{{
      tx('重试')
    }}</UButton>
  </div>
</template>

<style scoped>
.article-language-notice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-block: 1rem;
  border: 1px solid var(--ui-border);
}
.article-language-notice p {
  margin: 0;
}
</style>
