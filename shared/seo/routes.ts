import { supportedLocales, type SupportedLocale } from '../locales.ts'

export const siteUrl = 'https://2fa.hot'
export const guideSlugs = [
  'what-is-2fa',
  'totp-code-not-working',
  'google-authenticator-import'
] as const
export const editorialLocales = ['en', 'zh-CN'] as const
export const publicPages = [
  '/',
  '/help',
  '/privacy',
  '/about',
  '/waitlist',
  '/guides',
  ...guideSlugs.map((slug) => `/guides/${slug}`)
]

export function unlocalizedPath(path: string) {
  const pathname = path.split(/[?#]/)[0] || '/'
  const parts = pathname.split('/')
  if (supportedLocales.some((locale) => locale.code === parts[1])) parts.splice(1, 1)
  return parts.join('/').replace(/\/+$/, '') || '/'
}

export function localizedPath(path: string, locale: string) {
  const base = unlocalizedPath(path)
  return locale === 'en' ? base : `/${locale}${base === '/' ? '' : base}`
}

export function pageLocales(path: string): readonly string[] {
  const base = unlocalizedPath(path)
  if (!publicPages.includes(base)) return []
  if (base === '/about') return ['en', 'zh-CN', 'zh-TW']
  return base.startsWith('/guides')
    ? editorialLocales
    : supportedLocales.map((locale) => locale.code)
}

export function isPrivatePage(path: string) {
  const base = unlocalizedPath(path)
  return base === '/history' || base === '/2fa' || base.startsWith('/2fa/')
}

export function localeFromPath(path: string): SupportedLocale {
  return supportedLocales.find((locale) => locale.code === path.split('/')[1])?.code || 'en'
}

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!
  )
export function buildSitemap() {
  const urls = publicPages.flatMap((path) => {
    const locales = pageLocales(path)
    const alternates = [
      ...locales.map((locale) => ({ locale, url: siteUrl + localizedPath(path, locale) })),
      { locale: 'x-default', url: siteUrl + path }
    ]
      .map(
        ({ locale, url }) =>
          `<xhtml:link rel="alternate" hreflang="${locale}" href="${escapeXml(url)}"/>`
      )
      .join('')
    return locales.map(
      (locale) =>
        `<url><loc>${escapeXml(siteUrl + localizedPath(path, locale))}</loc>${alternates}</url>`
    )
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`
}

export function buildRobots() {
  // Let crawlers read noindex on history. Secret-bearing paths stay crawl-blocked.
  return [
    'User-agent: *',
    ...supportedLocales.flatMap(({ code }) => {
      const prefix = code === 'en' ? '' : `/${code}`
      return [`Disallow: ${prefix}/2fa$`, `Disallow: ${prefix}/2fa/`]
    }),
    'Disallow: /en/2fa$',
    'Disallow: /en/2fa/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n')
}
