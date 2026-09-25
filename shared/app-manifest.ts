/**
 * The web app manifest, one per language, so the install dialog, the app's
 * description and its shortcuts read in the visitor's language. The files in
 * public/app-manifest are written from this by scripts/sync-app-manifests.ts,
 * and tests/app-manifest.test.ts keeps them in step with the translations.
 */
import { supportedLocales, type SupportedLocale } from './locales.ts'
import { localizedPath } from './seo/routes.ts'

/** Interface text the manifest uses, by its Simplified Chinese source. */
export const manifestSources = {
  description: '多功能 TOTP 验证码生成器',
  single: '单条取码',
  batch: '批量取码',
  history: '本地历史'
} as const
export type ManifestCopy = Record<keyof typeof manifestSources, string>
/** The manifest's text in one language, given how to translate a source. */
export function manifestCopy(translate: (source: string) => string): ManifestCopy {
  return Object.fromEntries(
    Object.entries(manifestSources).map(([field, source]) => [field, translate(source)])
  ) as ManifestCopy
}

/** Languages with their own screenshots; the rest show the English ones. */
const screenshotLocales = ['en', 'zh-CN', 'zh-TW']

export const appManifestPath = (code: string) => `/app-manifest/${code}.webmanifest`

export function appManifest(code: SupportedLocale, copy: ManifestCopy) {
  const locale = supportedLocales.find((item) => item.code === code)!
  const home = localizedPath('/', code)
  const shots = screenshotLocales.includes(code) ? code : 'en'
  return {
    // The identity installs are kept under; start_url may differ by language.
    id: '/',
    name: '2fa.hot',
    short_name: '2fa.hot',
    description: copy.description,
    lang: locale.language,
    dir: locale.dir,
    start_url: home,
    scope: '/',
    display: 'standalone',
    background_color: '#1e1e1f',
    theme_color: '#1e1e1f',
    // Opening the app again brings its window forward rather than a second one.
    launch_handler: { client_mode: 'focus-existing' },
    // The grass-block key of public/favicon.svg, drawn larger; the maskable one
    // keeps it inside the circle a launcher may cut the icon to.
    icons: [
      { src: '/app-icons/key-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/app-icons/key-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/app-icons/key-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    // The empty home page: a screenshot never shows a key or a code.
    screenshots: [
      {
        src: `/app-screenshots/wide-${shots}.jpg`,
        sizes: '1280x800',
        type: 'image/jpeg',
        form_factor: 'wide',
        label: copy.description
      },
      {
        src: `/app-screenshots/narrow-${shots}.jpg`,
        sizes: '780x1688',
        type: 'image/jpeg',
        form_factor: 'narrow',
        label: copy.description
      }
    ],
    // Right-click the dock icon, or hold the home screen icon, to go straight there.
    shortcuts: [
      { name: copy.single, url: `${home}?shortcut=single` },
      { name: copy.batch, url: `${home}?shortcut=batch` },
      { name: copy.history, url: localizedPath('/history', code) }
    ]
  }
}
