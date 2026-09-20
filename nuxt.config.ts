import { baselineCsp, reportOnlyCsp } from './shared/security-headers'
import { supportedLocales } from './shared/locales'
import { siteUrl, publicPages, localizedPath } from './shared/seo/routes'
import { toolDescriptions, toolHeadings } from './shared/seo/copy'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-07',
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  i18n: {
    strategy: 'prefix_except_default',
    baseUrl: siteUrl,
    defaultLocale: 'en',
    locales: supportedLocales.map((locale) => ({ ...locale, file: `${locale.code}.json` })),
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: '2fa-hot-language',
      redirectOn: 'root',
      fallbackLocale: 'en'
    },
    vueI18n: './i18n.config.ts'
  },
  css: ['~/assets/css/app.css'],
  devtools: { enabled: false },
  experimental: { viewTransition: true },
  nitro: {
    cloudflare: { nodeCompat: true },
    plugins: ['~~/server/plugins/security-headers'],
    prerender: { crawlLinks: false, failOnError: true, concurrency: 4 }
  },
  ui: { fonts: false },
  icon: {
    provider: 'server',
    customCollections: [{ prefix: 'mc', dir: './app/assets/icons/mc' }],
    clientBundle: { scan: true },
    serverBundle: { collections: ['lucide'] }
  },
  colorMode: { preference: 'system', fallback: 'light', storageKey: '2fa-hot-theme' },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      script: [{ src: '/panorama-preference.js' }, { src: '/brand-splash.js' }],
      title: toolHeadings.en,
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover'
        },
        {
          name: 'description',
          content: toolDescriptions.en
        }
      ],
      link: [{ key: 'site-favicon', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  routeRules: {
    // Public HTML has no user secrets: render it once at build time, not per edge request.
    ...Object.fromEntries(
      supportedLocales.flatMap(({ code }) =>
        publicPages.map((path) => [localizedPath(path, code), { prerender: true }])
      )
    ),
    ...Object.fromEntries(
      supportedLocales.flatMap(({ code }) => {
        const prefix = code === 'en' ? '' : `/${code}`
        return ['/2fa', '/2fa/**', '/history'].map((path) => [
          prefix + path,
          {
            ssr: false,
            headers: {
              'Cache-Control': 'no-store',
              'Referrer-Policy': 'no-referrer',
              'X-Robots-Tag': 'noindex, nofollow, noarchive'
            }
          }
        ])
      })
    ),
    '/**': {
      headers: {
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy-Report-Only': reportOnlyCsp,
        'Content-Security-Policy': baselineCsp,
        'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()'
      }
    }
  },
  typescript: { strict: true }
})
