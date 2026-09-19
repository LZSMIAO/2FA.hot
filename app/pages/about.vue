<script setup lang="ts">
const localePath = useLocalePath()
definePageMeta({ viewTransition: false })
const { tx } = useMessages()
const { data: content, error, pending, refresh } = await useLocalizedContent()
if (error.value) throw error.value
const introduction = computed(() => content.value?.about.introduction ?? [])
const sections = computed(() => content.value?.about.sections ?? [])
</script>

<template>
  <article class="content-page">
    <ArticleLanguageNotice v-if="error" :busy="pending" @retry="refresh()" />
    <NuxtLink :to="localePath('/')" class="back-link"
      ><UIcon name="i-lucide-arrow-left" />{{ tx('返回工具') }}</NuxtLink
    >
    <h1>{{ tx('关于') }} 2fa.hot</h1>
    <p
      v-for="(paragraph, index) in introduction"
      :key="index"
      :class="{ 'article-lead': index === 0 }"
    >
      <AboutInline :text="paragraph" />
    </p>
    <section v-for="section in sections" :key="section.title">
      <h2>{{ section.title }}</h2>
      <template v-for="(block, index) in section.blocks" :key="index">
        <hr v-if="block.divider" />
        <AboutSpoiler
          v-else-if="block.spoiler"
          :label="block.spoiler.label"
          :text="block.spoiler.text"
        />
        <component :is="block.ordered ? 'ol' : 'ul'" v-else-if="block.list">
          <li v-for="line in block.lines" :key="line"><AboutInline :text="line" /></li>
        </component>
        <p v-else><AboutInline :text="block.lines[0] || ''" /></p>
      </template>
    </section>
    <p>
      <a href="https://github.com/LZSMIAO/2fa-hot" target="_blank" rel="noopener noreferrer"
        >GitHub ↗</a
      >
      · <a href="mailto:admin@2fa.hot">admin@2fa.hot</a>
    </p>
  </article>
</template>
