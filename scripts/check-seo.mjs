import assert from 'node:assert/strict'

// Read-only: use an already-running server. This script never starts one.
const origin = (process.argv[2] || 'http://localhost:3001').replace(/\/$/, '')
async function read(path, options = {}) {
  const response = await fetch(origin + path, { redirect: 'manual', ...options })
  return { response, html: await response.text() }
}
const { response: sitemapResponse, html: sitemap } = await read('/sitemap.xml')
assert.equal(sitemapResponse.status, 200)
assert.match(sitemapResponse.headers.get('content-type'), /xml/)
const pages = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => new URL(match[1]).pathname)
assert.ok(pages.length >= 100)
const queue = [...pages]
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let path; (path = queue.shift()) !== undefined;) {
      const { response, html } = await read(path)
      assert.equal(response.status, 200, path)
      assert.ok(html.includes(`rel="canonical" href="https://2fa.hot${path}"`), `canonical ${path}`)
      assert.match(html, /<h1\b/, `SSR heading ${path}`)
      assert.match(html, /name="description" content="[^"\n]+"/, `description ${path}`)
      assert.match(html, /name="robots" content="index, follow/, `indexable ${path}`)
      const scripts = [
        ...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)
      ]
      assert.equal(scripts.length, 1, `one schema graph ${path}`)
      assert.ok(JSON.parse(scripts[0][1])['@graph'].length)
      assert.equal((html.match(/rel="canonical"/g) || []).length, 1, path)
    }
  })
)
// Only the public RFC 6238 example is used here, never a real account secret.
const demo = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
for (const path of ['/history', '/zh-CN/history', '/2fa', `/2fa/${demo}`, `/ar/2fa/${demo}`]) {
  // Access routes deliberately follow the visitor's language preference.
  const { response, html } = await read(path, {
    headers: { 'Accept-Language': path.startsWith('/ar/') ? 'ar' : 'en' }
  })
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('x-robots-tag'), /noindex/, path)
  assert.match(response.headers.get('cache-control'), /no-store/, path)
  assert.doesNotMatch(html, /rel="canonical"|property="og:url"|application\/ld\+json/, path)
}
const { response: languageRedirect } = await read(`/ar/2fa/${demo}?digits=8`, {
  headers: { 'Accept-Language': 'en' }
})
assert.equal(languageRedirect.status, 302)
assert.equal(languageRedirect.headers.get('location'), `/2fa/${demo}?digits=8`)
assert.match(languageRedirect.headers.get('cache-control'), /no-store/)
assert.equal(languageRedirect.headers.get('referrer-policy'), 'no-referrer')
const { response: redirect } = await read('/zh-CN/help/')
// Asset-first deployments use Cloudflare's canonical-path redirect.
assert.ok([301, 307].includes(redirect.status))
assert.equal(redirect.headers.get('location'), '/zh-CN/help')
assert.equal((await read('/guides/not-a-real-guide')).response.status, 404)
const image = await fetch(origin + '/og-image.png')
assert.equal(image.status, 200)
assert.match(image.headers.get('content-type'), /image\/png/)
const { html: robots } = await read('/robots.txt')
assert.match(robots, /Sitemap: https:\/\/2fa\.hot\/sitemap.xml/)
assert.ok(!robots.includes('Disallow: /history'))
console.log(
  `SEO HTTP checks passed: ${pages.length} public URLs, private routes, redirects, 404, JSON-LD, robots and social image.`
)
