import { applyLiteHeaders } from '~~/server/utils/lite-headers'
import { litePage } from '../../templates/lite'
import { liteLanguage } from '../../../shared/lite-language'

// Standalone HTML: no Nuxt hydration, user data, or secret processing on the server.
export default defineEventHandler((event) => {
  applyLiteHeaders(event)
  return litePage(liteLanguage(getQuery(event).lang, getHeader(event, 'accept-language'))).replace(
    'class="panel"',
    'class="panel code-only"'
  )
})
