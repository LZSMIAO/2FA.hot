import { applyLiteHeaders } from '~~/server/utils/lite-headers'
import { liteHelp } from '../../templates/lite-help'
import { liteLanguage } from '../../../shared/lite-language'

// Standalone HTML: no Nuxt hydration, user data, or secret processing on the server.
export default defineEventHandler((event) => {
  applyLiteHeaders(event)
  return liteHelp(liteLanguage(getQuery(event).lang, getHeader(event, 'accept-language')))
})
