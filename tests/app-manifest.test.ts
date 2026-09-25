import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { supportedLocales } from '../shared/locales.ts'
import { sourceKeys } from '../shared/message-keys.ts'
import { appManifest, manifestCopy } from '../shared/app-manifest.ts'

const root = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')

test('each language has its manifest, in step with the translations', () => {
  for (const { code } of supportedLocales) {
    const messages = JSON.parse(read(`i18n/locales/${code}.json`)) as Record<string, string>
    const expected = appManifest(
      code,
      manifestCopy((source) => messages[sourceKeys.get(source)!]!)
    )
    const written = JSON.parse(read(`public/app-manifest/${code}.webmanifest`))
    // Out of step: run scripts/sync-app-manifests.ts.
    assert.deepEqual(written, expected, code)
    for (const text of [expected.description, ...expected.shortcuts.map((item) => item.name)])
      assert.ok(text, `${code}: missing text`)
  }
})

test('manifests keep one identity and point at files that exist', () => {
  for (const { code } of supportedLocales) {
    const manifest = JSON.parse(read(`public/app-manifest/${code}.webmanifest`))
    // A different id would make an installed app a second, separate one.
    assert.equal(manifest.id, '/')
    assert.equal(manifest.scope, '/')
    for (const { src } of [...manifest.icons, ...manifest.screenshots])
      assert.ok(existsSync(new URL(`public${src}`, root)), `${code}: ${src}`)
  }
  const zh = JSON.parse(read('public/app-manifest/zh-TW.webmanifest'))
  assert.equal(zh.start_url, '/zh-TW')
  assert.deepEqual(
    zh.shortcuts.map((item: { url: string }) => item.url),
    ['/zh-TW?shortcut=single', '/zh-TW?shortcut=batch', '/zh-TW/history']
  )
  assert.equal(JSON.parse(read('public/app-manifest/en.webmanifest')).shortcuts[2].url, '/history')
})
