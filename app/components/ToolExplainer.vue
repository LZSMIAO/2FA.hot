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
// Closed by hand, it stays closed: public/first-visit.js reads this on later visits.
function close() {
  try {
    localStorage.setItem('2fa-welcome-closed', '1')
  } catch {
    // Without storage it closes for this page only.
  }
  document.documentElement.dataset.visitor = 'returning'
}
// What 2fa.hot is reads as the welcome's own text; the rest fold beside it.
const items = computed<ExplainerItem[]>(() => [
  { question: homeIntro.steps.title, steps: homeIntro.steps.items },
  { question: homeIntro.formats.title, paragraphs: homeIntro.formats.paragraphs },
  ...homeFaq.map((item) => ({
    question: item.question,
    paragraphs: [item.answer],
    link: guideLink(item.guide)
  }))
])
</script>

<template>
  <!--
    Shown to new visitors only: /first-visit.js marks returning browsers before
    the first paint and the rule below hides this. Crawlers keep no storage,
    so they always read it as a new visitor would.
  -->
  <section class="tool-explainer" aria-labelledby="tool-explainer-title">
    <div class="explainer-welcome">
      <!-- Murasame, the site's mascot, waving the welcome; drawn by
           scripts/render-mascot.py from the same skin as the desert scene.
           Lazy, so a returning visitor, who never sees this, never loads it. -->
      <img
        class="explainer-mascot"
        src="/art/murasame-wave.svg"
        alt=""
        width="39"
        height="72"
        loading="lazy"
      />
      <div class="explainer-welcome-text">
        <div class="explainer-title-row">
          <h2 id="tool-explainer-title">{{ tx(homeIntro.welcomeTitle) }}</h2>
          <AppHint :text="tx('关闭')"
            ><button type="button" class="explainer-close" :aria-label="tx('关闭')" @click="close">
              <UIcon name="i-lucide-x" /></button
          ></AppHint>
        </div>
        <p>{{ tx(homeIntro.welcomeLead) }}</p>
      </div>
    </div>
    <div class="explainer-body">
      <div class="explainer-intro">
        <h3>{{ tx(homeIntro.what.title) }}</h3>
        <p v-for="paragraph in homeIntro.what.paragraphs" :key="paragraph">{{ tx(paragraph) }}</p>
        <p class="explainer-links">
          <NuxtLink :to="localePath('/guides')">{{ tx(homeIntro.guidesLink) }}</NuxtLink>
          <span aria-hidden="true">·</span>
          <NuxtLink :to="localePath('/help')">{{ tx('使用说明') }}</NuxtLink>
        </p>
      </div>
      <div class="explainer-list">
        <details v-for="item in items" :key="item.question" name="tool-explainer">
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
  padding: 1.25rem 2rem 1rem;
  border: 2px solid var(--ore-outline);
  box-shadow: var(--ore-window-shadow);
  background: var(--panel);
  color: var(--ui-text);
}
.explainer-welcome {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.explainer-welcome-text {
  flex: 1;
  min-width: 0;
}
/* The close button at the heading line's end, centred on it; its 44px target
   reaches past the line without making it taller. */
.explainer-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.explainer-close {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 2.75rem;
  height: 2.75rem;
  margin: -0.4375rem -0.75rem -0.4375rem auto;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.explainer-close .iconify {
  width: 1.25rem;
  height: 1.25rem;
}
.explainer-close:hover {
  color: var(--ui-text-highlighted);
}
.explainer-close:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
.explainer-mascot {
  flex: none;
  width: auto;
  height: 4.5rem;
}
.explainer-welcome h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.5;
  color: var(--ui-text-highlighted);
}
.explainer-welcome p {
  margin: 0.125rem 0 0;
  font-size: var(--text-label);
  line-height: 1.6;
  color: var(--ui-text-muted);
}
.explainer-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 2.5rem;
  align-items: start;
  margin-top: 0.5rem;
}
/* Level with the first question's text beside it. */
.explainer-intro h3 {
  margin: 0.625rem 0 0.5rem;
  font-weight: 600;
  color: var(--ui-text-highlighted);
}
.explainer-intro p:not(.explainer-links) {
  margin: 0 0 0.75rem;
  font-size: var(--text-body);
  line-height: 1.8;
  color: var(--ui-text-muted);
}
.explainer-list {
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
  margin: 0.25rem 0 0;
  font-size: var(--text-label, 0.875rem);
}
@media (width <= 900px) {
  .explainer-body {
    grid-template-columns: minmax(0, 1fr);
  }
  .explainer-intro {
    margin-bottom: 0.5rem;
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
