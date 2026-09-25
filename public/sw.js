/*
 * Offline mode. Registered only when a visitor turns it on, and removed with
 * every file it kept when they turn it off. It keeps this site's own public
 * files so the tool opens and generates codes with no network.
 *
 * It never sees or keeps a secret: in links a secret sits after #, which is
 * never requested, and a code page is kept only as its language's empty
 * shell, never under an address a secret could appear in. History stays in the
 * page's own storage, not here.
 */
const CONFIG_CACHE = '2fa-offline-config'
const MEDIA_CACHE = '2fa-offline-media'
const BUILD_PREFIX = '2fa-offline-build-'
const CONFIG_KEY = '/__offline/config'

/** A code page, in any language: /2fa, /2fa/…, /zh-TW/2fa/… */
function isCodePage(path) {
  return /^\/(?:[a-z]{2,3}(?:-[A-Za-z]{2})?\/)?2fa(?:\/|$)/.test(path)
}
function pageKey(path) {
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}
/**
 * build: named by content or build (/_nuxt/, translations, page data, the
 * pre-paint scripts' ?v=), so a copy never goes stale; kept per build.
 * media: backdrops, textures, sounds and fonts, kept across builds.
 */
function kindOf(url) {
  const path = url.pathname
  if (path === '/_nuxt/builds/latest.json') return null
  if (
    path.startsWith('/_nuxt/') ||
    path.startsWith('/_i18n/') ||
    path.endsWith('/_payload.json') ||
    (/^\/[\w-]+\.js$/.test(path) && url.searchParams.has('v'))
  )
    return 'build'
  if (/^\/(?:panorama|textures|audio|fonts|skins|art)\//.test(path)) return 'media'
  if (/^\/favicon[\w-]*\.svg$/.test(path)) return 'media'
  // Icons outside the app's bundle, such as an announcement's, come from here.
  if (path.startsWith('/api/_nuxt_icon/')) return 'media'
  return null
}

let config
async function readConfig() {
  if (config !== undefined) return config
  const response = await (await caches.open(CONFIG_CACHE)).match(CONFIG_KEY)
  config = response ? await response.json() : null
  return config
}
async function writeConfig(value) {
  config = value
  await (
    await caches.open(CONFIG_CACHE)
  ).put(
    CONFIG_KEY,
    new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } })
  )
}

/**
 * Keeps everything the tool needs in one language: the app's code, the
 * language's pages and translations, the empty code page, and the media the
 * visitor's page had loaded (their backdrop, among others).
 */
async function precache(options, report = () => {}) {
  const manifestResponse = await fetch('/offline-manifest.json', { cache: 'no-store' })
  if (!manifestResponse.ok) throw new Error('manifest ' + manifestResponse.status)
  const manifest = await manifestResponse.json()
  const language = manifest.locales[options.locale] || manifest.locales.en
  const pages = new Set([...language.pages, language.shell])
  const required = [...manifest.shared, ...language.data, ...pages]
  const optional = (options.media || []).filter(
    (item) => kindOf(new URL(item, self.location.origin)) === 'media'
  )
  const build = await caches.open(BUILD_PREFIX + manifest.build)
  const media = await caches.open(MEDIA_CACHE)
  const total = required.length + optional.length
  let done = 0
  async function keep(url, cache, needed) {
    try {
      // Files named by their content carry over from the last build as they are.
      const carried =
        !(await cache.match(url)) &&
        kindOf(new URL(url, self.location.origin)) === 'build' &&
        (await caches.match(url))
      if (carried) await cache.put(url, carried)
      else if (!(await cache.match(url))) {
        const response = await fetch(url, { cache: 'no-cache' })
        // A redirected page cannot answer a navigation, so it is not kept.
        if (response.ok && !response.redirected) await cache.put(url, response)
        else if (needed && !pages.has(url)) throw new Error(url + ' ' + response.status)
      }
    } catch (error) {
      if (needed) throw error
    }
    report(++done, total)
  }
  const queue = [
    ...required.map((url) => [url, build, true]),
    ...optional.map((url) => [url, media, false])
  ]
  // A few at a time: a burst of them is what a rate limit is for.
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) await keep(...item)
    })
  )
  await writeConfig({
    build: manifest.build,
    locale: options.locale,
    home: options.home,
    shell: language.shell,
    media: optional
  })
  for (const name of await caches.keys())
    if (name.startsWith(BUILD_PREFIX) && name !== BUILD_PREFIX + manifest.build)
      await caches.delete(name)
}

async function page(request, url) {
  const current = await readConfig()
  try {
    const response = await fetch(request)
    if (
      current &&
      response.ok &&
      response.type === 'basic' &&
      !response.redirected &&
      !isCodePage(url.pathname) &&
      (response.headers.get('Content-Type') || '').includes('text/html')
    )
      await (
        await caches.open(BUILD_PREFIX + current.build)
      ).put(pageKey(url.pathname), response.clone())
    return response
  } catch (error) {
    if (!current) throw error
    const origin = self.location.origin
    if (isCodePage(url.pathname)) {
      // Only the saved language is kept, so, as the server does online, a code
      // page in another language moves to this one; # and its secret go along.
      const rest = url.pathname.replace(/^\/(?:[a-z]{2,3}(?:-[A-Za-z]{2})?\/)?2fa/, '')
      const target = pageKey(current.shell + rest)
      if (pageKey(url.pathname) !== target)
        return Response.redirect(new URL(target, origin).href + url.search, 302)
      // Every code page is the same empty shell; the app reads the rest.
      const shell = await caches.match(current.shell)
      if (shell) return shell
      throw error
    }
    const key = pageKey(url.pathname)
    const cached = await caches.match(key)
    if (cached) return cached
    // A page not kept offline opens the tool instead.
    if (key !== pageKey(current.home))
      return Response.redirect(new URL(current.home, origin).href, 302)
    throw error
  }
}

async function asset(request, kind) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  const current = await readConfig()
  if (current && response.ok && response.type === 'basic')
    await (
      await caches.open(kind === 'media' ? MEDIA_CACHE : BUILD_PREFIX + current.build)
    ).put(request, response.clone())
  return response
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  // A new build is kept before it takes over, so going offline never lands
  // between two versions. Offline during an update, the old one stays.
  event.waitUntil(readConfig().then((current) => current && precache(current)))
})
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('message', (event) => {
  const data = event.data
  const port = event.ports[0]
  if (!port || !data || data.type !== 'prepare') return
  event.waitUntil(
    precache({ locale: data.locale, home: data.home, media: data.media }, (done, total) =>
      port.postMessage({ type: 'progress', done, total })
    ).then(
      () => port.postMessage({ type: 'ready' }),
      (error) => port.postMessage({ type: 'error', message: String(error) })
    )
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || request.headers.has('range')) return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(page(request, url))
    return
  }
  const kind = kindOf(url)
  if (kind) event.respondWith(asset(request, kind))
})
