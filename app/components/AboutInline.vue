<script setup lang="ts">
import { inlineTokens } from '~/utils/about-readme'
import { pageLocales } from '~~/shared/seo/routes'
const props = defineProps<{ text: string }>()
const tokens = computed(() => inlineTokens(props.text))
const { locale } = useI18n()
const localePath = useLocalePath()
function link(href: string | undefined) {
  if (!href) return href
  const url = new URL(href)
  if (url.origin !== 'https://2fa.hot') return href
  if (url.pathname === '/lite') return '/lite?lang=' + locale.value
  return pageLocales(url.pathname).length ? localePath(url.pathname) + url.search + url.hash : href
}
</script>

<template>
  <template v-for="(token, index) in tokens" :key="index">
    <a v-if="token.kind === 'link'" :href="link(token.href)">{{ token.text }}</a>
    <strong v-else-if="token.kind === 'strong'">{{ token.text }}</strong>
    <code v-else-if="token.kind === 'code'">{{ token.text }}</code>
    <template v-else>{{ token.text }}</template>
  </template>
</template>
