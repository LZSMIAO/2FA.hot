import { accessLanguage } from './access-language.ts'
import { supportedLocales, type SupportedLocale } from './locales.ts'

export function liteLanguage(requested: unknown, header = ''): SupportedLocale {
  const exact = supportedLocales.find((item) => item.code === requested)
  return exact?.code ?? accessLanguage(undefined, header)
}

export function escapeLiteText(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )
}
