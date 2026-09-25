/*
 * Lists what offline mode keeps for this build: public/sw.js reads it when a
 * visitor turns offline mode on, and again for each new build. Written into
 * the built site after `nuxt build`, since it names the build's own files.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { supportedLocales } from '../shared/locales.ts'
import { localizedPath } from '../shared/seo/routes.ts'

const root = resolve('.output/public')
const build = JSON.parse(readFileSync(join(root, '_nuxt/builds/latest.json'), 'utf8')).id as string

function files(directory: string, keep: (path: string) => boolean = () => true): string[] {
  if (!existsSync(join(root, directory))) return []
  return readdirSync(join(root, directory)).flatMap((name) => {
    const path = join(root, directory, name)
    if (statSync(path).isDirectory()) return files(relative(root, path), keep)
    const url = '/' + relative(root, path).split('\\').join('/')
    return keep(url) ? [url] : []
  })
}

// The pre-paint scripts, at the versioned addresses the pages load them from.
const prePaint = [
  ...readFileSync(join(root, 'index.html'), 'utf8').matchAll(/<script src="(\/[\w-]+\.js\?v=\w+)"/g)
].map((match) => match[1]!)
if (prePaint.length < 4) throw new Error('Pre-paint scripts not found in index.html')

const shared = [
  ...files('_nuxt', (url) => !url.startsWith('/_nuxt/builds/') || url.endsWith(`/${build}.json`)),
  ...prePaint,
  ...files('fonts', (url) => url.endsWith('.ttf')),
  ...files('textures', (url) => url.endsWith('.png')),
  ...files('audio'),
  '/favicon.svg',
  '/favicon-dark.svg',
  '/favicon-light.svg'
]

// The pages the tool needs; guides and the rest are kept once visited online.
const pages = ['/', '/history', '/help', '/privacy', '/about']
const locales = Object.fromEntries(
  supportedLocales.map(({ code }) => {
    const localized = pages.map((path) => localizedPath(path, code))
    const payloads = localized
      .map((path) => (path === '/' ? '' : path) + '/_payload.json')
      .filter((path) => existsSync(join(root, path)))
      .map((path) => `${path}?_b=${build}`)
    const messages = files('_i18n', (url) => url.endsWith(`/${code}/messages.json`))
    if (messages.length !== 1) throw new Error(`Expected one translation file for ${code}`)
    // Every code page, in any language, is the same empty shell until the app
    // reads the secret after #; this is the address it answers at here.
    const shell = localizedPath('/2fa', code)
    return [code, { pages: localized, shell, data: [...payloads, ...messages] }]
  })
)

writeFileSync(join(root, 'offline-manifest.json'), JSON.stringify({ build, shared, locales }))
console.log(
  `Offline manifest: ${shared.length} shared files and ${pages.length} pages in each of ${supportedLocales.length} languages.`
)
