import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { supportedLocales } from '../shared/locales.ts'
import { publicPages, localizedPath, pageLocales } from '../shared/seo/routes.ts'

const root = resolve('.output/public')
let count = 0
for (const locale of supportedLocales) {
  for (const page of publicPages) {
    const route = localizedPath(page, locale.code)
    const file = resolve(root, '.' + route, 'index.html')
    // Guides written for a few languages must not exist as empty pages elsewhere.
    if (!pageLocales(page).includes(locale.code)) {
      assert.equal(existsSync(file), false, `Unpublished language page: ${route}`)
      continue
    }
    assert.ok(existsSync(file), `Missing static HTML: ${route}`)
    const html = readFileSync(file, 'utf8')
    assert.ok(html.includes(`lang="${locale.language}"`), `Wrong language: ${route}`)
    assert.match(html, /<title>[^<]+<\/title>/, `Missing title: ${route}`)
    assert.match(html, /id="__nuxt"/, `Missing app: ${route}`)
    count++
  }
  for (const page of ['/history', '/2fa', '/2fa/batch'])
    assert.equal(
      existsSync(resolve(root, '.' + localizedPath(page, locale.code), 'index.html')),
      false,
      `Private page must not become a shared asset: ${page}`
    )
}
const headers = readFileSync(resolve(root, '_headers'), 'utf8')
for (const header of [
  'Content-Security-Policy:',
  'Content-Security-Policy-Report-Only:',
  'X-Frame-Options: DENY',
  'Referrer-Policy: no-referrer'
])
  assert.ok(headers.includes(header), `Static assets missing ${header}`)
// Cloudflare refuses the whole deploy past 100 rules, after the build has passed.
const headerRules = headers.split('\n').filter((line) => line.startsWith('/')).length
assert.ok(headerRules <= 100, `_headers has ${headerRules} rules; Cloudflare allows 100`)
console.log(
  `Prerender verified: ${count} public pages across ${supportedLocales.length} languages; private pages excluded; static security headers present.`
)
