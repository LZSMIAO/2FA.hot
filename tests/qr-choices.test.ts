import test from 'node:test'
import assert from 'node:assert/strict'
import { collectQrChoices } from '../app/utils/qr-choices.ts'

const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
const uri = `otpauth://totp/Test?secret=${secret}`

test('equivalent codes across images are deduplicated despite labels and parameter order', () => {
  const result = collectQrChoices([
    uri,
    `${uri}&period=30&digits=6`,
    `otpauth://totp/Other?algorithm=SHA1&secret=${secret}`
  ])
  assert.equal(result.choices.length, 1)
  assert.equal(result.duplicates, 2)
  assert.equal(result.unsupported, 0)
})

test('different token settings remain separate and unsupported codes do not discard valid ones', () => {
  const result = collectQrChoices([
    uri,
    `${uri}&digits=8`,
    'https://example.com',
    'otpauth://totp/Bad?secret=bad'
  ])
  assert.equal(result.choices.length, 2)
  assert.equal(result.unsupported, 2)
})

test('migration codes remain available to the dedicated migration flow', () => {
  const migration = 'otpauth-migration://offline?data=test'
  const result = collectQrChoices([uri, migration, migration])
  assert.equal(result.choices.length, 2)
  assert.equal(result.duplicates, 1)
  assert.equal(result.choices[1], migration)
})
