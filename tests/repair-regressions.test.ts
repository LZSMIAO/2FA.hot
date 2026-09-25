import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { analyzePaste, parseSmartBatch, pastedBatchText } from '../app/utils/smart-paste.ts'
import { parseOtp, toOtpUri, validateOptions } from '../app/utils/otp.ts'
import { validateEnvelope } from '../app/utils/vault-crypto.ts'
import { transportHeaders } from '../shared/security-headers.ts'
const secret = 'JBSWY3DPEHPK3PXP'

test('list markers and generic field labels do not become accounts', () => {
  for (const prefix of [
    '-',
    '*',
    '•',
    '>',
    '#',
    '1.',
    'Secret:',
    'Setup key:',
    '密钥：',
    'Password:'
  ]) {
    const result = analyzePaste(`${prefix} ${secret}`)
    assert.equal(result.candidates.length, 1, prefix)
    assert.equal(result.candidates[0]!.config.label, '', prefix)
  }
  const result = analyzePaste(`Email: demo@example.com\nPassword: hunter2\nSecret: ${secret}`)
  assert.equal(result.kind, 'review')
  assert.equal(result.candidates[0]!.suggestedAccount, 'demo@example.com')
  assert.equal(analyzePaste(`Work: ${secret}`).candidates[0]!.config.label, 'Work')
  // A deliberately named record must not lose its name when serializing.
  const config = { ...parseOtp(secret), label: 'Secret' }
  assert.equal(parseSmartBatch(pastedBatchText([config]))[0]!.config!.label, 'Secret')
})

test('batch fragments preserve percent, hash, unicode and URI settings after router decoding', () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/2fa/batch', component: {} }]
  })
  for (const label of ['50%off', 'a%20b', 'a#b', '账号']) {
    const config = { ...parseOtp(secret), label, digits: 8 as const, period: 60 }
    const payload = pastedBatchText([config])
    const route = router.resolve('/2fa/batch#' + encodeURIComponent(payload))
    assert.deepEqual(parseSmartBatch(route.hash.slice(1))[0]!.config, config)
  }
})

test('only TOTP is generated: other kinds and custom encoders are refused, not miscalculated', () => {
  // Older links and local history may still carry a kind this site no longer generates.
  assert.throws(() => parseOtp(`https://2fa.hot/2fa#${secret}?kind=other`), /格式不正确/)
  assert.throws(
    () => validateOptions({ ...parseOtp(secret), kind: 'other' as unknown as 'totp' }),
    /仅支持 TOTP/
  )
  assert.throws(
    () => parseOtp(`otpauth://totp/Acme:alice?secret=${secret}&encoder=custom`),
    /仅支持 TOTP/
  )
  assert.equal(parseOtp(`https://2fa.hot/2fa#${secret}?kind=totp`).secret, secret)
  assert.throws(() => parseOtp('{"secret":"x"}'), /密钥/)
})

test('colon-containing issuer roundtrips without accepting a conflicting issuer', () => {
  const config = { ...parseOtp(secret), label: 'alice', issuer: 'Acme:Prod' }
  assert.deepEqual(parseOtp(toOtpUri(config)), config)
  assert.throws(() => parseOtp(`otpauth://totp/Other:alice?secret=${secret}&issuer=Acme`), /不一致/)
})

test('malformed backup encodings produce a stable format error', () => {
  const base = {
    version: 1,
    iterations: 100000,
    salt: btoa('a'.repeat(16)),
    iv: btoa('a'.repeat(12)),
    data: btoa('a'.repeat(16)),
    revision: 'test',
    enabled: true
  }
  for (const name of ['salt', 'iv', 'data']) {
    assert.throws(() => validateEnvelope({ ...base, [name]: '%%%' }), /备份格式不正确/)
  }
})

test('root language variations are not cached and transport headers stay scoped', () => {
  assert.deepEqual(transportHeaders('/', 'http', 'Accept-Encoding'), {
    'Cache-Control': 'private, no-store',
    Vary: 'Accept-Encoding, Accept-Language, Cookie'
  })
  assert.equal(
    transportHeaders('/', 'https', 'accept-language, Cookie').Vary,
    'accept-language, Cookie'
  )
  assert.equal(transportHeaders('/', 'https', '*').Vary, '*')
  assert.equal(transportHeaders('/2fa', 'https')['Strict-Transport-Security'], 'max-age=31536000')
  const privatePage = {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  }
  for (const path of [
    '/2fa',
    '/2fa/JBSWY3DPEHPK3PXP',
    '/zh-CN/2fa/batch',
    '/history',
    '/ja/history/'
  ])
    assert.deepEqual(transportHeaders(path, 'http'), privatePage, path)
  assert.deepEqual(transportHeaders('/guides', 'http'), {})
})
