// These restrictions also apply when Cloudflare serves assets without the Worker.
export const baselineCsp =
  "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'"

export function transportHeaders(pathname: string, protocol: string, vary = '') {
  const headers: Record<string, string> = {}
  if (protocol === 'https') headers['Strict-Transport-Security'] = 'max-age=31536000'
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
