<script setup lang="ts">
definePageMeta({ viewTransition: false })
const { tx } = useMessages()
const localePath = useLocalePath()
const { data: content, error, pending, refresh } = await useLocalizedContent()
if (error.value) throw error.value
const entries = computed(() => content.value?.guides ?? [])
</script>

<template>
  <article class="content-page">
    <ArticleLanguageNotice v-if="error" :busy="pending" @retry="refresh()" />
    <NuxtLink :to="localePath('/')" class="back-link"
      ><UIcon name="i-lucide-arrow-left" />{{ tx('返回工具') }}</NuxtLink
    >
    <h1>{{ tx('2FA 与 TOTP 使用指南') }}</h1>
    <p class="article-lead">
      {{ tx('从了解双重验证开始，到解决验证码错误和迁移验证器账号。') }}
    </p>
    <section v-for="guide in entries" :key="guide.slug">
      <h2>
        <NuxtLink :to="localePath(`/guides/${guide.slug}`)">{{ guide.title }}</NuxtLink>
      </h2>
      <p>{{ guide.description }}</p>
    </section>
    <p class="guide-help">
      <NuxtLink :to="localePath('/help')">{{ tx('使用说明') }}</NuxtLink> ·
      <NuxtLink :to="localePath('/privacy')">{{ tx('隐私说明') }}</NuxtLink>
    </p>
  </article>
</template>
<style scoped>
.guide-help {
  margin-top: 2.5rem;
}
h1,
h2 {
  text-wrap: balance;
}
</style>
