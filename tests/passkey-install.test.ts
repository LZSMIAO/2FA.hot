import test from 'node:test'
import assert from 'node:assert/strict'
import { passkeyStoreUrl, passkeyStoreIds } from '../shared/passkeys.ts'
import { pageLocales } from '../shared/seo/routes.ts'

test('installation links only use valid IDs at the official extension stores', () => {
  for (const id of ['', 'pending', 'https://evil.com', '../evil', 'a'.repeat(31), 'z'.repeat(32)]) {
    assert.equal(passkeyStoreUrl('chrome', id), '')
    assert.equal(passkeyStoreUrl('edge', id), '')
  }
  const id = 'abcdefghijklmnopabcdefghijklmnop'
  assert.equal(passkeyStoreUrl('chrome', id), `https://chromewebstore.google.com/detail/${id}`)
  assert.equal(
    passkeyStoreUrl('edge', id),
    `https://microsoftedge.microsoft.com/addons/detail/${id}`
  )
  for (const id of Object.values(passkeyStoreIds)) assert.ok(id === '' || /^[a-p]{32}$/.test(id))
  assert.deepEqual(pageLocales('/passkeys'), ['en', 'zh-CN', 'zh-TW'])
})
