import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { accessLanguage } from '../shared/access-language.ts'

const code = readFileSync(
  new URL('../server/middleware/01-static-home.ts', import.meta.url),
  'utf8'
)
  .replace(/^import .*\n/gm, '')
  .replace('export default', 'handler =')
async function run(path: string, headers = {}, cloudflare = true, method = 'GET') {
  const request = new Request('https://2fa.hot' + path, { headers, method })
  const responseHeaders = new Headers()
  let fetched = 0
  const context = vm.createContext({
    accessLanguage,
    Headers,
    Response,
    defineEventHandler: (fn: unknown) => fn,
    getRequestURL: () => new URL(request.url),
    getCookie: () => request.headers.get('cookie')?.match(/2fa-hot-language=([^;]+)/)?.[1],
    getHeader: (_event: unknown, name: string) => request.headers.get(name),
    setHeader: (_event: unknown, name: string, value: string) => responseHeaders.set(name, value),
    sendRedirect: (_event: unknown, location: string, status: number) =>
      new Response(null, {
        status,
        headers: { ...Object.fromEntries(responseHeaders), Location: location }
      })
  })
  vm.runInContext(
    ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    context
  )
  const response: Response | undefined = await context.handler({
    method,
    context: {
      cloudflare: cloudflare
        ? {
            request,
            env: {
              ASSETS: {
                fetch: async () => {
                  fetched++
                  return new Response(method === 'HEAD' ? null : '<html>static</html>', {
                    headers: { 'Cache-Control': 'public', 'Content-Type': 'text/html' }
                  })
                }
              }
            }
          }
        : undefined
    }
  })
  return { response, fetched }
}
test('English root serves its asset without public caching', async () => {
  const { response, fetched } = await run('/', { 'Accept-Language': 'en' })
  assert.equal(fetched, 1)
  assert.equal(await response!.text(), '<html>static</html>')
  assert.equal(response!.headers.get('cache-control'), 'private, no-store')
  assert.equal(response!.headers.get('vary'), 'Accept-Language, Cookie')
})
test('root language redirect honors preference and preserves query', async () => {
  const { response, fetched } = await run('/?view=batch', {
    'Accept-Language': 'de',
    Cookie: '2fa-hot-language=zh-TW'
  })
  assert.equal(fetched, 0)
  assert.equal(response!.status, 302)
  assert.equal(response!.headers.get('location'), '/zh-TW?view=batch')
  assert.match(response!.headers.get('cache-control')!, /no-store/)
})
test('build prerender, private routes and non-GET requests keep existing handlers', async () => {
  for (const [path, cf, method] of [
    ['/', false, 'GET'],
    ['/2fa/batch', true, 'GET'],
    ['/', true, 'POST']
  ] as const) {
    const { response, fetched } = await run(path, {}, cf, method)
    assert.equal(response, undefined)
    assert.equal(fetched, 0)
  }
  assert.equal(await (await run('/', {}, true, 'HEAD')).response!.text(), '')
})
