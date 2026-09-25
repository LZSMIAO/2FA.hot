<script setup lang="ts">
definePageMeta({ viewTransition: false })
const route = useRoute()
const { tx } = useMessages()
const localePath = useLocalePath()
const { data: content, error, pending, refresh } = await useLocalizedContent()
if (error.value) throw error.value
const entries = computed(() => content.value?.guides ?? [])
const guide = computed(() => entries.value.find((item) => item.slug === route.params.slug))
if (!guide.value) throw createError({ statusCode: 404, statusMessage: 'Guide not found' })
const related = computed(() => entries.value.filter((item) => item.slug !== guide.value?.slug))
</script>

<template>
  <article v-if="guide" class="content-page">
    <ArticleLanguageNotice v-if="error" :busy="pending" @retry="refresh()" />
    <NuxtLink :to="localePath('/guides')" class="back-link"
      ><UIcon name="i-mc-arrow-left" />{{ tx('全部指南') }}</NuxtLink
    >
    <h1>{{ guide.title }}</h1>
    <p class="article-lead">{{ guide.description }}</p>
    <p class="guide-byline">
      {{ tx('作者：') }}<NuxtLink :to="localePath('/about')">2fa.hot</NuxtLink>
    </p>
    <ArticleNavigation
      :items="guide.sections.map((section) => ({ id: section.id, label: section.title }))"
    />
    <section v-for="section in guide.sections" :key="section.id">
      <h2 :id="section.id">{{ section.title }}</h2>
      <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
      <ol v-if="section.steps">
        <li v-for="step in section.steps" :key="step">{{ step }}</li>
      </ol>
    </section>
    <h2>{{ tx('参考资料') }}</h2>
    <ul>
      <li v-for="source in guide.sources" :key="source.url">
        <a :href="source.url" rel="noopener noreferrer">{{ source.title }}</a>
      </li>
    </ul>
    <h2>{{ tx('继续阅读') }}</h2>
    <ul class="guide-cards">
      <li v-for="item in related" :key="item.slug">
        <NuxtLink :to="localePath(`/guides/${item.slug}`)" class="guide-card">
          <span class="guide-card-title">{{ item.title }}</span>
          <p>{{ item.description }}</p>
        </NuxtLink>
      </li>
    </ul>
    <p>
      <NuxtLink :to="localePath('/')">{{ tx('返回工具') }}</NuxtLink> ·
      <NuxtLink :to="localePath('/help')">{{ tx('使用说明') }}</NuxtLink>
    </p>
  </article>
</template>
<style scoped>
h1,
h2 {
  text-wrap: balance;
}
.guide-byline {
  font-size: var(--text-label);
}
p {
  text-wrap: pretty;
}
</style>
