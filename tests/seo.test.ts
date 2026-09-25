import { test } from 'node:test'
import assert from 'node:assert/strict'
import { supportedLocales } from '../shared/locales.ts'
import {
  buildRobots,
  buildSitemap,
  guideLocales,
  isPrivatePage,
  localizedPath,
  pageLocales,
  serializeJsonLd,
  unlocalizedPath
} from '../shared/seo/routes.ts'
import { guides } from '../shared/seo/guides.ts'

test('sitemap only advertises public, translated canonical pages with reciprocal alternatives', () => {
  const xml = buildSitemap()
  const entries = [...xml.matchAll(/<url>(.*?)<\/url>/g)].map((match) => match[1]!)
  const locations = entries.map((entry) => entry.match(/<loc>(.*?)<\/loc>/)![1]!)
  assert.equal(new Set(locations).size, locations.length)
  for (const entry of entries) {
    const loc = entry.match(/<loc>(.*?)<\/loc>/)![1]!
    const path = new URL(loc).pathname
    assert.equal(isPrivatePage(path), false)
    assert.doesNotMatch(loc, /[?#]|localhost|workers\.dev/)
    assert.ok(entry.includes(`href="${loc}"`), 'self-referencing hreflang')
    for (const alternate of entry.matchAll(/href="(.*?)"/g))
      assert.ok(locations.includes(alternate[1]!), alternate[1])
    assert.ok(entry.includes('hreflang="x-default"'))
  }
  for (const { code } of supportedLocales) {
    assert.ok(locations.includes(`https://2fa.hot${localizedPath('/', code)}`))
    assert.ok(locations.includes(`https://2fa.hot${localizedPath('/waitlist', code)}`))
  }
  for (const { code } of supportedLocales) {
    for (const path of ['/about', '/guides'])
      assert.ok(locations.includes(`https://2fa.hot${localizedPath(path, code)}`))
    // A guide is advertised only in the languages it is written in.
    for (const { slug } of guides.en)
      assert.equal(
        locations.includes(`https://2fa.hot${localizedPath(`/guides/${slug}`, code)}`),
        guideLocales(slug).includes(code),
        `${code} ${slug}`
      )
  }
  assert.deepEqual([...guideLocales('batch-2fa-codes')], ['en', 'zh-CN', 'zh-TW', 'ja'])
  assert.equal(guideLocales('what-is-2fa').length, 30)
})

test('private routes stay private for every locale, including trailing slash and query variants', () => {
  const robots = buildRobots()
  for (const { code } of supportedLocales) {
    for (const path of ['/2fa', '/2fa/DEMO', '/history']) {
      const localized = localizedPath(path, code)
      assert.ok(isPrivatePage(localized + '/?test=1'))
      assert.deepEqual(pageLocales(localized), [])
    }
    const prefix = code === 'en' ? '' : `/${code}`
    assert.ok(robots.includes(`Disallow: ${prefix}/2fa/\n`))
  }
  assert.ok(!robots.includes('Disallow: /history'), 'crawlers must be able to read history noindex')
  assert.ok(!isPrivatePage('/guides/what-is-2fa'))
})

test('canonical normalization does not retain fragments, query values or duplicate locale prefixes', () => {
  assert.equal(localizedPath('/zh-CN/help/?secret=example#start', 'fr'), '/fr/help')
  assert.equal(unlocalizedPath('/zh-TW'), '/')
  assert.equal(localizedPath('/', 'en'), '/')
  assert.deepEqual(pageLocales('/guides/not-a-guide'), [])
})

test('JSON-LD cannot terminate its script element', () => {
  const value = { name: '</script><script>alert(1)</script>\u2028\u2029' }
  const encoded = serializeJsonLd(value)
  assert.ok(!encoded.includes('<'))
  assert.deepEqual(JSON.parse(encoded), value)
})

test('published guides have matching translations, unique anchors, and primary sources', () => {
  assert.deepEqual(
    guides.en.map((g) => g.slug),
    guides['zh-CN'].map((g) => g.slug)
  )
  for (const entries of Object.values(guides))
    for (const guide of entries) {
      assert.ok(pageLocales(`/guides/${guide.slug}`).length)
      assert.equal(new Set(guide.sections.map((s) => s.id)).size, guide.sections.length)
      assert.ok(guide.sections.every((s) => s.paragraphs.length && s.title))
      assert.ok(guide.sources.every((source) => new URL(source.url).protocol === 'https:'))
    }
})
