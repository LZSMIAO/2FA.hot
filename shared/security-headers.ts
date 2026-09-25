import { isPrivatePage } from './seo/routes.ts'

// These restrictions also apply when Cloudflare serves assets without the Worker.
export const baselineCsp =
  "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'"

export function transportHeaders(pathname: string, protocol: string, vary = '') {
  const headers: Record<string, string> = {}
  if (protocol === 'https') headers['Strict-Transport-Security'] = 'max-age=31536000'
  /*
   * Set here rather than as route rules: Nitro writes every route rule with
   * headers into _headers, which only covers static files and which Cloudflare
   * caps at 100 rules. One per language for each private page filled it, and
   * the Worker, which serves these pages, sets them here anyway.
   */
  if (isPrivatePage(pathname)) {
    headers['Cache-Control'] = 'no-store'
    headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive'
  }
  if (pathname === '/') {
    headers['Cache-Control'] = 'private, no-store'
    const names = vary
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)
    if (!names.includes('*')) {
      for (const name of ['Accept-Language', 'Cookie']) {
        if (!names.some((existing) => existing.toLowerCase() === name.toLowerCase()))
          names.push(name)
      }
    }
    headers.Vary = names.join(', ')
  }
  return headers
}

export const reportOnlyCsp = [
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
