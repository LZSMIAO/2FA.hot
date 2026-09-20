import assert from 'node:assert/strict'

// Read-only checks against an already-running server. Never use real account secrets.
const origin = (process.argv[2] || 'http://localhost:3001').replace(/\/$/, '')
const demo = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const routes = [
  ['/', 200],
  ['/zh-CN', 200],
  ['/ar', 200],
  ['/help', 200],
  ['/guides/what-is-2fa', 200],
  ['/history', 200],
  [`/2fa/${demo}`, 200],
  [`/ar/2fa/${demo}`, 200],
  ['/zh-CN/help/', 301],
  ['/guides/not-a-real-guide', 404]
]
function directives(value) {
  return new Map(
    value
      .split(';')
      .filter(Boolean)
      .map((part) => {
        const [name, ...sources] = part.trim().split(/\s+/)
        return [name, sources]
      })
  )
}
for (const [path, status] of routes) {
  const response = await fetch(origin + path, {
    redirect: 'manual',
    headers: { Accept: 'text/html', 'Accept-Language': path.startsWith('/ar') ? 'ar' : 'en' },
    signal: AbortSignal.timeout(15000)
  })
  assert.equal(response.status, status, path)
  const headers = response.headers
  assert.equal(headers.get('x-frame-options'), 'DENY', path)
  const enforced = headers.get('content-security-policy')
  const reportOnly = headers.get('content-security-policy-report-only')
  assert.ok(enforced && reportOnly, path)
  const policy = directives(enforced.split(',').at(-1))
  for (const name of ['frame-ancestors', 'object-src', 'script-src-attr'])
    assert.deepEqual(policy.get(name), ["'none'"], `${path}: ${name}`)
  for (const name of ['base-uri', 'form-action'])
    assert.deepEqual(policy.get(name), ["'self'"], `${path}: ${name}`)
  assert.deepEqual(directives(reportOnly).get('script-src'), ["'self'"])
  assert.doesNotMatch(enforced + reportOnly, /report-uri|report-to|report-sample|unsafe-eval/)
  assert.ok(
    ![...headers.values()].some((value) => value.includes(demo)),
    'no secret in response headers'
  )
  if (path.includes('/2fa/') || path === '/history') {
    assert.match(headers.get('cache-control'), /no-store/)
    assert.match(headers.get('x-robots-tag'), /noindex/)
    assert.equal(headers.get('referrer-policy'), 'no-referrer')
  }
  await response.arrayBuffer()
}
for (const localeHeaders of [
  { 'Accept-Language': 'en' },
  { 'Accept-Language': 'zh-CN' },
  { 'Accept-Language': 'en', Cookie: 'i18n_redirected=ar' }
]) {
  const response = await fetch(origin + '/', { redirect: 'manual', headers: localeHeaders })
  assert.ok([200, 302].includes(response.status))
  assert.match(response.headers.get('cache-control'), /private.*no-store/)
  const vary = response.headers.get('vary').toLowerCase()
  assert.ok(vary.includes('accept-language') && vary.includes('cookie'))
  await response.arrayBuffer()
}
if (new URL(origin).protocol === 'http:') {
  const spoof = await fetch(origin + '/', {
    headers: { 'X-Forwarded-Proto': 'https' },
    redirect: 'manual'
  })
  assert.equal(spoof.headers.get('strict-transport-security'), null)
  await spoof.arrayBuffer()
}

console.log(
  `Security HTTP checks passed: ${routes.length} public/private/locale/error/redirect responses; framing, CSP rollout and privacy headers.`
)
