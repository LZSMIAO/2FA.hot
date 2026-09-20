import { accessLanguage } from '../../shared/access-language'

// Root language negotiation is the only public HTML request that needs the Worker.
// Fetch its generated asset directly; never invoke Vue SSR on a production homepage.
export default defineEventHandler(async (event) => {
  const cf = event.context.cloudflare
  if (!cf?.env?.ASSETS || getRequestURL(event).pathname !== '/') return
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const locale = accessLanguage(
    getCookie(event, '2fa-hot-language'),
    getHeader(event, 'accept-language') || ''
  )
  setHeader(event, 'Vary', 'Accept-Language, Cookie')
  setHeader(event, 'Cache-Control', 'private, no-store')
  if (locale !== 'en') return sendRedirect(event, `/${locale}${getRequestURL(event).search}`, 302)
  const response = await cf.env.ASSETS.fetch(cf.request)
  const headers = new Headers(response.headers)
  headers.set('Vary', 'Accept-Language, Cookie')
  headers.set('Cache-Control', 'private, no-store')
  return new Response(response.body, { status: response.status, headers })
})
