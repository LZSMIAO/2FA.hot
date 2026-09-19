import { applyLiteHeaders } from '~~/server/utils/lite-headers'
import html from '../templates/lite'

// Standalone HTML: no Nuxt hydration, user data, or secret processing on the server.
export default defineEventHandler((event) => {
  applyLiteHeaders(event)
  return html
})
