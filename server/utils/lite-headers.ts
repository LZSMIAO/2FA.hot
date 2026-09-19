import { setHeader, type H3Event } from 'h3'

export function applyLiteHeaders(event: H3Event) {
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow, noarchive')
  setHeader(event, 'X-Frame-Options', 'DENY')
  setHeader(event, 'X-UA-Compatible', 'IE=edge')
  setHeader(
    event,
    'Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
  )
}
