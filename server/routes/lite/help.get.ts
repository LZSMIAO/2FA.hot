import { applyLiteHeaders } from '~~/server/utils/lite-headers'
import { liteHelp, type LiteLanguage } from '../../templates/lite-help'

// Standalone HTML: no Nuxt hydration, user data, or secret processing on the server.
export default defineEventHandler((event) => {
  applyLiteHeaders(event)
  const requested = getQuery(event).lang
  const language: LiteLanguage = requested === 'zh-TW' || requested === 'zh-CN' ? requested : 'en'
  return liteHelp(language)
})
