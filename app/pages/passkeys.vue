<script setup lang="ts">
import PasskeyInstall from '~/components/passkeys/PasskeyInstall.vue'
import PasskeyGuide from '~/components/passkeys/PasskeyGuide.vue'
import { passkeyCopy } from '~~/shared/passkeys-copy'
import { passkeyLocale } from '~~/shared/passkeys'

defineI18nRoute({ locales: ['en', 'zh-CN', 'zh-TW'] })
definePageMeta({ viewTransition: false })
const localePath = useLocalePath()
const { tx, locale } = useMessages()
const copy = computed(() => passkeyCopy[passkeyLocale(locale.value)])
</script>

<template>
  <article class="content-page passkeys-page">
    <NuxtLink :to="localePath('/')" class="back-link"
      ><UIcon name="i-lucide-arrow-left" />{{ tx('返回工具') }}</NuxtLink
    >
    <h1>{{ copy.title }}</h1>
    <p class="article-lead">{{ copy.description }}</p>
    <span class="preview-label">{{ copy.preview }}</span>
    <PasskeyInstall :copy="copy" />
    <PasskeyGuide :copy="copy" />
  </article>
</template>

<style scoped>
.preview-label {
  display: inline-block;
  border: 1px solid var(--ui-border);
  padding: 0.25rem 0.625rem;
  font-size: var(--text-label);
}
.passkeys-page {
  overflow-wrap: anywhere;
}
</style>
