import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { supportedLocales } from '../shared/locales.ts'
import { liteLanguage, escapeLiteText } from '../shared/lite-language.ts'
import { parseAboutReadme } from '../app/utils/about-readme.ts'
import { guides } from '../shared/seo/guides.ts'

const read = (path: string) =>
  JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'))
const english = read('i18n/content/en.json')
const lite = read('shared/lite-copy.json')
const parameters = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
function compare(source: unknown, translated: unknown, path: string, compareText = true) {
  if (typeof source === 'string') {
    assert.equal(typeof translated, 'string', path)
    const value = translated as string
    assert.ok(value.trim(), path)
    assert.deepEqual(parameters(value), parameters(source), path)
    if (/\.(?:slug|id|url)$/.test(path)) assert.equal(value, source, path)
    else if (compareText && source.length > 60) assert.notEqual(value, source, path)
    const links = (text: string) =>
      [...text.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]).sort()
    assert.deepEqual(links(value), links(source), `${path}: markdown links`)
    const inlineCode = (text: string) =>
      [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]).sort()
    assert.deepEqual(inlineCode(value), inlineCode(source), `${path}: code examples`)
    for (const token of [
      'shared_secret',
      'identity_secret',
      'maFile',
      'manifest.json',
      'ES256',
      'PRF',
      '?algorithm=SHA256&digits=8&period=30'
    ])
      if (source.includes(token)) assert.ok(value.includes(token), `${path}: missing ${token}`)
  } else if (Array.isArray(source)) {
    assert.ok(Array.isArray(translated), path)
    assert.equal(translated.length, source.length, path)
    source.forEach((value, index) =>
      compare(value, translated[index], `${path}[${index}]`, compareText)
    )
  } else if (source && typeof source === 'object') {
    assert.ok(translated && typeof translated === 'object', path)
    assert.deepEqual(Object.keys(translated).sort(), Object.keys(source).sort(), path)
    for (const [key, value] of Object.entries(source))
      compare(value, (translated as Record<string, unknown>)[key], `${path}.${key}`, compareText)
  } else assert.equal(translated, source, path)
}

test('all 30 locales include complete articles, guide anchors and original references', () => {
  for (const { code } of supportedLocales) {
    const content = read(`i18n/content/${code}.json`)
    compare(
      code.startsWith('zh') ? guides['zh-CN'] : english.guides,
      content.guides,
      `${code}.guides`,
      !['en', 'zh-CN'].includes(code)
    )
    // Original Chinese READMEs have independently authored wording and list grouping.
    if (!code.startsWith('zh'))
      compare(english.about, content.about, `${code}.about`, code !== 'en')
    assert.equal(content.about.sections.length, 4, code)
  }
})

test('the three source About snapshots match the live README content', () => {
  for (const [code, path] of Object.entries({
    en: 'docs/readme/README.en.md',
    'zh-CN': 'docs/readme/README.zh-CN.md',
    'zh-TW': 'README.md'
  })) {
    assert.deepEqual(
      read(`i18n/content/${code}.json`).about,
      parseAboutReadme(readFileSync(new URL('../' + path, import.meta.url), 'utf8')),
      code
    )
  }
})

test('Lite has complete static browser catalogs and localized help for every language', () => {
  assert.deepEqual(Object.keys(lite).sort(), supportedLocales.map((locale) => locale.code).sort())
  for (const { code } of supportedLocales) {
    compare(lite.en, lite[code], `${code}.lite`, code !== 'en')
    const context = { window: { LiteMessages: {} as Record<string, unknown> } }
    const source = readFileSync(
      new URL(`../public/lite-assets/locales/${code}.js`, import.meta.url),
      'utf8'
    )
    vm.runInNewContext(source, context)
    assert.equal(JSON.stringify(context.window.LiteMessages[code]), JSON.stringify(lite[code].ui))
  }
})

test('Lite language resolution supports regional headers and safely escapes HTML', () => {
  assert.equal(liteLanguage('fr', 'de-DE'), 'fr')
  assert.equal(liteLanguage(undefined, 'pt-PT, en;q=0.8'), 'pt-BR')
  assert.equal(liteLanguage(undefined, 'zh-HK'), 'zh-TW')
  assert.equal(liteLanguage('<script>', 'ar-SA'), 'ar')
  assert.equal(liteLanguage(['ar', 'fr'], 'de'), 'de')
  assert.equal(
    escapeLiteText('<a href="x">&\'</a>'),
    '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'
  )
})
