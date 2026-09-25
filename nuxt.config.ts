import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { baselineCsp, reportOnlyCsp } from './shared/security-headers'
import { supportedLocales } from './shared/locales'
import { siteUrl, publicPages, localizedPath, pageLocales } from './shared/seo/routes'
import { toolDescriptions, toolTitle } from './shared/seo/copy'

/*
 * These run before the first paint, so the page cannot draw until each is in
 * hand. Unversioned, a browser had to recheck every one with the server on
 * each load; addressed by their content, they are kept like the app's own
 * chunks and a change arrives under a new address.
 */
const prePaintScripts = [
  // first-visit.js runs first: it must see storage before this visit writes any.
  'first-visit.js',
  'panorama-preference.js',
  'brand-splash.js',
  'viewport-layout.js',
  'workspace-mode.js',
  'theme-favicon.js'
]
const versioned = (name: string) =>
  `/${name}?v=${createHash('sha1')
    .update(readFileSync(new URL(`./public/${name}`, import.meta.url)))
    .digest('hex')
    .slice(0, 10)}`

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
  experimental: {
    viewTransition: true,
    /*
     * Links fetched their page's data as soon as they scrolled into view. On
     * the home page that was nine requests per load, three of them for the page
     * itself, and a couple of reloads tripped the site's rate limit. A link now
     * fetches when a finger or pointer reaches it, still ahead of the click.
     */
    defaults: { nuxtLink: { prefetchOn: { visibility: false, interaction: true } } }
  },
  nitro: {
    cloudflare: { nodeCompat: true },
    plugins: ['~~/server/plugins/security-headers'],
    prerender: { crawlLinks: false, failOnError: true, concurrency: 4 }
  },
  vite: {
    $server: {
      build: {
        rolldownOptions: {
          /*
           * The server bundle leaves shared/ for Nitro to bundle. A relative
           * import such as app/utils/otp.ts's '../../shared/locales.ts' was
           * written back one directory too deep, and the build failed.
           */
          makeAbsoluteExternalsRelative: false
        }
      }
    }
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
      script: prePaintScripts.map((name) => ({ src: versioned(name) })),
      title: toolTitle('en'),
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
      link: [
        {
          key: 'site-favicon',
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
          // Ahead of the pre-paint scripts (50 as blocking scripts), so theme-favicon.js finds it.
          tagPriority: 40
        },
        // For adding the site to a home screen; offline use is a separate choice.
        // app/plugins/app-manifest.ts swaps in the page's language (see shared/app-manifest.ts).
        { key: 'app-manifest', rel: 'manifest', href: '/app-manifest/en.webmanifest' },
        { rel: 'apple-touch-icon', href: '/app-icons/key-180.png' }
      ]
    }
  },
  routeRules: {
    // Public HTML has no user secrets: render it once at build time, not per edge request.
    ...Object.fromEntries(
      publicPages.flatMap((path) =>
        pageLocales(path).map((code) => [localizedPath(path, code), { prerender: true }])
      )
    ),
    ...Object.fromEntries(
      supportedLocales.flatMap(({ code }) => {
        const prefix = code === 'en' ? '' : `/${code}`
        return ['/2fa', '/2fa/**', '/history'].map((path) => [
          prefix + path,
          {
            /*
             * A secret in the address must never reach a server render. History
             * has none, and rendered on the server its header, backdrop and
             * placeholder paint at once instead of after the app's code loads.
             */
            ssr: path === '/history'
            // no-store and noindex come from transportHeaders in shared/security-headers.ts.
          }
        ])
      })
    ),
    ...Object.fromEntries(
      prePaintScripts.map((name) => [
        `/${name}`,
        { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } }
      ])
    ),
    /*
     * Backdrops, textures, sounds and art keep their names between versions.
     * Checked with the server on every load, the backdrop drew late on a
     * reload, and each reload sent a burst of requests.
     */
    ...Object.fromEntries(
      ['/panorama/**', '/textures/**', '/skins/**', '/art/**', '/audio/**'].map((path) => [
        path,
        { headers: { 'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000' } }
      ])
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
