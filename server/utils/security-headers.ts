import { getRequestProtocol, getRequestURL, type H3Event } from 'h3'
import { baselineCsp, transportHeaders } from '../../shared/security-headers'

// Never transmit CSP reports: document URLs may contain account secrets.
export function applySecurityHeaders(event: H3Event) {
  setHeader(event, 'X-Frame-Options', 'DENY')
  const baseline = baselineCsp
  // The Cloudflare Request is authoritative; never trust an arbitrary forwarded header.
  const cloudflareUrl = event.context.cloudflare?.request?.url
  const protocol = cloudflareUrl
    ? new URL(cloudflareUrl).protocol.slice(0, -1)
    : getRequestProtocol(event, { xForwardedProto: false })
  const url = getRequestURL(event, { xForwardedHost: false, xForwardedProto: false })
  for (const [name, value] of Object.entries(
    transportHeaders(url.pathname, protocol, String(getResponseHeader(event, 'Vary') || ''))
  ))
    setHeader(event, name, value)
  const existing = String(getResponseHeader(event, 'Content-Security-Policy') || '')
  // Multiple CSP policies are enforced together; preserve stricter error-page rules.
  setHeader(
    event,
    'Content-Security-Policy',
    existing.includes(baseline) ? existing : existing ? `${existing}, ${baseline}` : baseline
  )
  setHeader(
    event,
    'Content-Security-Policy-Report-Only',
    [
      "default-src 'self'",
      "script-src 'self'",
      "script-src-attr 'none'",
      // Vue UI components and theme tokens use inline styles.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self' blob:",
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  )
}
