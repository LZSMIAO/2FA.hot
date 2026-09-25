<script setup lang="ts">
import { pageLocales, unlocalizedPath } from '~~/shared/seo/routes'
import { supportedLocales, type SupportedLocale } from '~~/shared/locales'
// Approximate worldwide L1 + L2 speaker order (2026); Chinese scripts stay together.
// https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
// Malay refers to standard Malay, excluding the separately listed Indonesian locale.
const languageOrder: SupportedLocale[] = [
  'en',
  'zh-CN',
  'zh-TW',
  'hi',
  'es',
  'ar',
  'fr',
  'bn',
  'pt-BR',
  'id',
  'ur',
  'ru',
  'de',
  'ja',
  'vi',
  'te',
  'sw',
  'tr',
  'fil',
  'ta',
  'fa',
  'ko',
  'th',
  'it',
  'ms',
  'pl',
  'uk',
  'nl',
  'el',
  'he'
]
const languageItems = [...supportedLocales]
  .sort((a, b) => languageOrder.indexOf(a.code) - languageOrder.indexOf(b.code))
  .map((item) => ({ ...item, label: item.name }))
const { locale, setLocale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { tx } = useMessages()
const changing = shallowRef(false)
const hovered = shallowRef(false)
const issue = shallowRef('')
async function change(next: SupportedLocale) {
  if (
    next === locale.value ||
    !supportedLocales.some((item) => item.code === next) ||
    changing.value
  )
    return
  changing.value = true
  issue.value = ''
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'select' }))
  try {
    const available = pageLocales(route.path)
    if (available.length && !available.includes(next)) {
      // A guide missing in that language falls back to its guide list, not the tool.
      const guide = unlocalizedPath(route.path).startsWith('/guides/')
      await navigateTo(localePath(guide ? '/guides' : '/', next))
    } else {
      await setLocale(next)
    }
  } catch {
    issue.value = '语言加载失败，请重试。'
  } finally {
    changing.value = false
  }
}
</script>
<template>
  <div class="language-picker">
    <USelectMenu
      :model-value="locale"
      :items="languageItems"
      value-key="code"
      :filter-fields="['name', 'code', 'language']"
      :aria-label="tx('选择语言')"
      :disabled="changing"
      :autofocus="false"
      :search-input="{ autofocus: false, placeholder: tx('搜索…'), icon: 'i-lucide-search' }"
      icon="i-lucide-languages"
      color="neutral"
      variant="ghost"
      class="language-trigger"
      :style="{ backgroundColor: hovered ? 'var(--header-control-hover)' : 'transparent' }"
      @pointerenter="hovered = true"
      @pointerleave="hovered = false"
      @pointercancel="hovered = false"
      :content="{ align: 'start', side: 'bottom', sideOffset: 8, collisionPadding: 12 }"
      :ui="{
        base: 'rounded-md min-h-11 focus:ring-0 focus-visible:ring-2',
        leadingIcon: 'size-5',
        trailingIcon: 'size-5',
        content:
          'language-menu w-64 max-w-[calc(100vw-1.5rem)] max-h-[min(22rem,var(--reka-combobox-content-available-height))] rounded-md',
        item: 'min-h-11 items-center text-base rounded-md before:rounded-md',
        input: 'text-base shrink-0',
        viewport: 'overscroll-contain'
      }"
      @update:model-value="change"
    >
      <template #item-label="{ item }"
        ><span :lang="item.language" :dir="item.dir">{{ item.name }}</span></template
      >
    </USelectMenu>
    <span v-if="issue" class="language-error" role="alert">{{ tx(issue) }}</span>
  </div>
</template>
<style>
.language-picker .language-trigger {
  width: 10rem;
}
@media (max-width: 600px) {
  .language-picker .language-trigger {
    width: 2.75rem;
    min-width: 2.75rem;
    padding: 0;
    justify-content: center;
  }
  .language-picker .language-trigger [data-slot='value'],
  .language-picker .language-trigger [data-slot='trailing'] {
    display: none;
  }
  .language-picker .language-trigger [data-slot='leading'] {
    position: static;
    padding: 0;
  }
}
</style>
