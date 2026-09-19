import type { LocalizedContent } from '~~/shared/localized-content'
import { supportedLocales } from '~~/shared/locales'
import { parseAboutReadme } from '~/utils/about-readme'

const readmes: Record<string, () => Promise<string>> = {
  en: () => import('../../docs/readme/README.en.md?raw').then((module) => module.default),
  'zh-CN': () => import('../../docs/readme/README.zh-CN.md?raw').then((module) => module.default),
  'zh-TW': () => import('../../README.md?raw').then((module) => module.default)
}

// Article bodies stay out of the tool's initial bundle; load only the chosen language.
const loaders = import.meta.glob<{ default: LocalizedContent }>('../../i18n/content/*.json')
export function useLocalizedContent() {
  const { locale } = useI18n()
  const previous = shallowRef<LocalizedContent>()
  const state = useAsyncData(
    () => `localized-content:${locale.value}`,
    async () => {
      const language = supportedLocales.some((item) => item.code === locale.value)
        ? locale.value
        : 'en'
      const load = loaders[`../../i18n/content/${language}.json`]
      if (!load) throw createError({ statusCode: 503, statusMessage: 'Translation unavailable' })
      const content = (await load()).default
      const readme = readmes[language]
      return readme ? { ...content, about: parseAboutReadme(await readme()) } : content
    }
  )
  watch(
    state.data,
    (value) => {
      if (value) previous.value = value
    },
    { immediate: true }
  )
  const content = computed(() => state.data.value ?? previous.value)
  return state.then((result) => ({ ...result, data: content }))
}
