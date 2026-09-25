<script setup lang="ts">
import { guideMetadata } from '~~/shared/seo/guide-meta'
import { focusedGuideMeta } from '~~/shared/seo/focused-guide-meta'
import { guideLocales } from '~~/shared/seo/routes'
import type { SupportedLocale } from '~~/shared/locales'
const { tx, locale } = useMessages()
const localePath = useLocalePath()
// Link an answer to its full guide only where that guide is published.
function guideLink(slug?: string) {
  const language = locale.value as SupportedLocale
  if (!slug || !guideLocales(slug).includes(language)) return
  const core = (guideMetadata['zh-CN'] as Record<string, { title: string }>)[slug]
  const title = core
    ? tx(core.title)
    : focusedGuideMeta[slug as keyof typeof focusedGuideMeta]?.[
        language as keyof (typeof focusedGuideMeta)[keyof typeof focusedGuideMeta]
      ]?.title
  return title ? { to: localePath(`/guides/${slug}`), title } : undefined
}
interface ExplainerItem {
  question: string
  paragraphs?: readonly string[]
  steps?: readonly string[]
  link?: { to: string; title: string }
}
const items = computed<ExplainerItem[]>(() => [
  { question: homeIntro.what.title, paragraphs: homeIntro.what.paragraphs },
  { question: homeIntro.steps.title, steps: homeIntro.steps.items },
  { question: homeIntro.formats.title, paragraphs: homeIntro.formats.paragraphs },
  ...homeFaq.map((item) => ({
    question: item.question,
    paragraphs: [item.answer],
    link: guideLink(item.guide)
  }))
])
// Two independent stacks: opening an answer only moves the questions below it
// in the same column, never leaving a gap beside it in the other.
const columns = computed(() => {
  const middle = Math.ceil(items.value.length / 2)
  return [items.value.slice(0, middle), items.value.slice(middle)]
})
</script>

<template>
  <!--
    Shown to new visitors only: /first-visit.js marks returning browsers before
    the first paint and the rule below hides this. Crawlers keep no storage,
    so they always read it as a new visitor would.
  -->
  <section class="tool-explainer" aria-labelledby="tool-explainer-title">
    <h2 id="tool-explainer-title">{{ tx(homeIntro.faqTitle) }}</h2>
    <div class="explainer-list">
      <div v-for="(column, index) in columns" :key="index" class="explainer-column">
        <details v-for="item in column" :key="item.question" name="tool-explainer">
          <summary>
            <h3>{{ tx(item.question) }}</h3>
            <UIcon name="i-lucide-chevron-down" class="explainer-chevron" aria-hidden="true" />
          </summary>
          <div class="explainer-answer">
            <p v-for="paragraph in item.paragraphs" :key="paragraph">{{ tx(paragraph) }}</p>
            <ol v-if="item.steps">
              <li v-for="step in item.steps" :key="step">{{ tx(step) }}</li>
            </ol>
            <p v-if="item.link">
              <NuxtLink :to="item.link.to">{{ item.link.title }}</NuxtLink>
            </p>
          </div>
        </details>
      </div>
    </div>
    <p class="explainer-links">
      <NuxtLink :to="localePath('/guides')">{{ tx(homeIntro.guidesLink) }}</NuxtLink>
      <span aria-hidden="true">·</span>
      <NuxtLink :to="localePath('/help')">{{ tx('使用说明') }}</NuxtLink>
    </p>
  </section>
</template>

<style>
:root[data-visitor='returning'] .tool-explainer {
  display: none;
}
</style>
<style scoped>
.tool-explainer {
  --font-sans: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-family: var(--font-sans);
  margin-top: 1rem;
  padding: 1rem 2rem 0.75rem;
  border: 2px solid var(--ore-outline);
  box-shadow: var(--ore-window-shadow);
  background: var(--panel);
  color: var(--ui-text);
}
h2 {
  font-size: var(--text-body);
  font-weight: 600;
  line-height: 1.6;
  margin: 0 0 0.25rem;
  color: var(--ui-text-muted);
}
.explainer-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 2.5rem;
  align-items: start;
}
.explainer-column {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
details {
  border-bottom: 1px solid var(--ui-border);
  min-width: 0;
}
summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.625rem 0;
  cursor: pointer;
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
summary:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
h3 {
  font-size: var(--text-body);
  font-weight: 500;
  line-height: 1.6;
  margin: 0;
}
summary:hover h3 {
  color: var(--accent-ink);
}
.explainer-chevron {
  flex: none;
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
  transition: transform 160ms ease;
}
details[open] .explainer-chevron {
  transform: rotate(180deg);
}
.explainer-answer {
  padding-bottom: 0.75rem;
  color: var(--ui-text-muted);
}
.explainer-answer p,
.explainer-answer li {
  font-size: var(--text-body);
  line-height: 1.8;
}
.explainer-answer p {
  margin: 0 0 0.5rem;
}
.explainer-answer ol {
  margin: 0 0 0.5rem;
  padding-inline-start: 1.25rem;
  list-style: decimal;
}
.explainer-answer li {
  padding-inline-start: 0.25rem;
  margin-block: 0.25rem;
}
a {
  color: var(--accent-ink);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.explainer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  margin: 0.75rem 0 0;
  font-size: var(--text-label, 0.875rem);
}
@media (width <= 900px) {
  .explainer-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (width <= 700px) {
  .tool-explainer {
    padding: 0.875rem 1rem 0.75rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .explainer-chevron {
    transition: none;
  }
}
</style>
