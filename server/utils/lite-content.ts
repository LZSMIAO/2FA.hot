import catalogs from '~~/shared/lite-copy.json'
import type { SupportedLocale } from '~~/shared/locales'

export interface LiteContent {
  ui: Record<string, string>
  help: { title: string; back: string; sections: string[][] }
}
export function liteContent(language: SupportedLocale): LiteContent {
  const copy = (catalogs as Record<string, LiteContent>)[language]
  if (!copy) throw createError({ statusCode: 503, statusMessage: 'Translation unavailable' })
  return copy
}
