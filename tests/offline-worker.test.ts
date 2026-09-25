import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
const origin = 'https://2fa.hot'
const secret = 'JBSWY3DPEHPK3PXP'
type Input = string | { url: string }
type Handler = (event: Record<string, unknown>) => void

function manifest(build: string, shared: string[]) {
  const language = (prefix: string) => ({
    pages: [prefix || '/', `${prefix}/history`],
    shell: `${prefix}/2fa`,
    data: [
      `${prefix}/_payload.json?_b=${build}`,
      `/_i18n/h/${prefix.slice(1) || 'en'}/messages.json`
    ]
  })
  return JSON.stringify({
    build,
    shared,
    locales: { 'zh-TW': language('/zh-TW'), en: language('') }
  })
}

function worker() {
  const handlers: Record<string, Handler> = {}
  const stores = new Map<string, Map<string, Response>>()
  const key = (input: Input) => new URL(typeof input === 'string' ? input : input.url, origin).href
  const files = new Map<string, string>()
  const requests: string[] = []
  const network = { online: true }
  async function open(name: string) {
    if (!stores.has(name)) stores.set(name, new Map())
    const store = stores.get(name)!
    return {
      match: async (input: Input) => store.get(key(input))?.clone(),
      put: async (input: Input, response: Response) => void store.set(key(input), response)
    }
  }
  const caches = {
    open,
    async match(input: Input) {
      for (const store of stores.values()) {
        const hit = store.get(key(input))
        if (hit) return hit.clone()
      }
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name)
  }
  async function fetch(input: Input) {
    const url = key(input)
    requests.push(url)
    if (!network.online) throw new TypeError('Failed to fetch')
    const body = files.get(url)
    const page = !new URL(url).pathname.includes('.')
    const response =
      body === undefined
        ? new Response('missing', { status: 404 })
        : new Response(body, { headers: { 'Content-Type': page ? 'text/html' : 'text/plain' } })
    // Same-origin responses in a browser are "basic".
    Object.defineProperty(response, 'type', { value: 'basic' })
    return response
  }
  const self = {
    location: new URL(`${origin}/sw.js?build=b1`),
    addEventListener: (type: string, handler: Handler) => void (handlers[type] = handler),
    skipWaiting() {},
    clients: { claim: async () => {} }
  }
  vm.runInNewContext(code, { self, caches, fetch, Response, URL, Headers })

  async function dispatch(type: string, extra: Record<string, unknown> = {}) {
    const waits: Promise<unknown>[] = []
    handlers[type]!({ ...extra, waitUntil: (promise: Promise<unknown>) => waits.push(promise) })
    await Promise.all(waits)
  }
  async function request(path: string, mode = 'cors') {
    let response: Promise<Response> | undefined
    handlers.fetch!({
      request: { url: origin + path, method: 'GET', mode, headers: new Headers() },
      respondWith: (value: Promise<Response>) => (response = value)
    })
    return response ? await response : undefined
  }
  const serve = (entries: Record<string, string>) => {
    for (const [path, body] of Object.entries(entries)) files.set(origin + path, body)
  }
  return {
    files,
    serve,
    requests,
    network,
    stores,
    async prepare(locale: string, home: string, media: string[]) {
      const messages: { type: string; done?: number; total?: number }[] = []
      await dispatch('message', {
        data: { type: 'prepare', locale, home, media },
        ports: [{ postMessage: (message: (typeof messages)[number]) => messages.push(message) }]
      })
      return messages
    },
    install: () => dispatch('install'),
    navigate: (path: string) => request(path, 'navigate'),
    get: (path: string) => request(path),
    keys: () => [...stores.values()].flatMap((store) => [...store.keys()])
  }
}

function site(sw: ReturnType<typeof worker>) {
  sw.serve({
    '/offline-manifest.json': manifest('b1', ['/_nuxt/app.js']),
    '/_nuxt/app.js': 'app',
    '/zh-TW': 'zh-TW home',
    '/zh-TW/history': 'zh-TW history',
    '/zh-TW/_payload.json?_b=b1': 'payload',
    '/_i18n/h/zh-TW/messages.json': 'messages',
    // For this visitor the unprefixed code page redirects to their language's.
    '/zh-TW/2fa': 'empty code page',
    [`/2fa/${secret}`]: 'empty code page',
    '/panorama/senren/mako-ninja.webp': 'backdrop'
  })
}

test('offline mode keeps the tool in one language and opens it with no network', async () => {
  const sw = worker()
  site(sw)
  const messages = await sw.prepare('zh-TW', '/zh-TW', ['/panorama/senren/mako-ninja.webp'])
  assert.equal(messages.at(-1)?.type, 'ready')
  const progress = messages.filter((message) => message.type === 'progress')
  assert.equal(progress.at(-1)?.done, progress.at(-1)?.total)

  sw.network.online = false
  assert.equal(await (await sw.navigate('/zh-TW'))!.text(), 'zh-TW home')
  assert.equal(await (await sw.navigate('/zh-TW/history/'))!.text(), 'zh-TW history')
  assert.equal(await (await sw.get('/_nuxt/app.js'))!.text(), 'app')
  assert.equal(await (await sw.get('/zh-TW/_payload.json?_b=b1'))!.text(), 'payload')
  assert.equal(await (await sw.get('/panorama/senren/mako-ninja.webp'))!.text(), 'backdrop')
  // A page never kept offline opens the tool rather than an error.
  const elsewhere = (await sw.navigate('/zh-TW/guides/what-is-2fa'))!
  assert.equal(elsewhere.status, 302)
  assert.equal(elsewhere.headers.get('Location'), `${origin}/zh-TW`)
})

test('an address that can carry a secret is never kept, online or off', async () => {
  const sw = worker()
  site(sw)
  // Even if a page passed one along as media, it is not kept.
  await sw.prepare('zh-TW', '/zh-TW', [`/2fa/${secret}`, '/panorama/senren/mako-ninja.webp'])
  assert.equal(await (await sw.navigate(`/2fa/${secret}`))!.text(), 'empty code page')
  assert.equal(await (await sw.navigate(`/zh-TW/2fa/${secret}`))!.status, 404)
  sw.network.online = false
  // Offline, every code page opens the one empty shell.
  assert.equal(await (await sw.navigate(`/zh-TW/2fa/${secret}`))!.text(), 'empty code page')
  assert.equal(await (await sw.navigate('/zh-TW/2fa/batch'))!.text(), 'empty code page')
  // Another language's code page moves to the saved one, whose translations are kept.
  const moved = (await sw.navigate('/2fa/batch'))!
  assert.equal(moved.status, 302)
  assert.equal(moved.headers.get('Location'), `${origin}/zh-TW/2fa/batch`)
  assert.ok(sw.keys().length > 5)
  assert.ok(
    sw.keys().every((key) => !key.includes(secret)),
    sw.keys().join('\n')
  )
})

test('nothing is kept or answered from a cache before offline mode is turned on', async () => {
  const sw = worker()
  site(sw)
  assert.equal(await (await sw.navigate('/zh-TW'))!.text(), 'zh-TW home')
  assert.equal(await (await sw.get('/_nuxt/app.js'))!.text(), 'app')
  assert.deepEqual(sw.keys(), [])
  sw.network.online = false
  await assert.rejects(sw.navigate('/zh-TW'))
})

test('a new build is kept before it takes over, carrying named files over', async () => {
  const sw = worker()
  site(sw)
  await sw.prepare('zh-TW', '/zh-TW', [])
  const before = sw.requests.filter((url) => url.endsWith('/_nuxt/app.js')).length
  sw.serve({
    '/offline-manifest.json': manifest('b2', ['/_nuxt/app.js', '/_nuxt/new.js']),
    '/_nuxt/new.js': 'new',
    '/zh-TW': 'zh-TW home, b2',
    '/zh-TW/_payload.json?_b=b2': 'payload b2'
  })
  await sw.install()
  assert.equal(sw.requests.filter((url) => url.endsWith('/_nuxt/app.js')).length, before)
  assert.deepEqual(
    [...sw.stores.keys()].filter((name) => name.startsWith('2fa-offline-build-')),
    ['2fa-offline-build-b2']
  )
  sw.network.online = false
  assert.equal(await (await sw.navigate('/zh-TW'))!.text(), 'zh-TW home, b2')
  assert.equal(await (await sw.get('/_nuxt/new.js'))!.text(), 'new')
})

test('offline mode fails whole when a file the tool needs cannot be kept', async () => {
  const sw = worker()
  site(sw)
  sw.files.delete(`${origin}/_nuxt/app.js`)
  const messages = await sw.prepare('zh-TW', '/zh-TW', [])
  assert.equal(messages.at(-1)?.type, 'error')
})
