import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { analyzePaste, parseSmartBatch, pastedBatchText } from '../app/utils/smart-paste.ts'
import { generateOtp, parseOtp, toOtpUri, toAccessPath, validateOptions } from '../app/utils/otp.ts'
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

test('Steam links and URIs preserve type and decoded bytes, including ambiguous base64', async () => {
  for (const shared_secret of ['cnOgv/KdpLoP6Nbh0GMkXkPXALQ=', 'ABCDEFGHIJKLMNOP']) {
    const config = parseOtp(JSON.stringify({ shared_secret, account_name: 'demo' }))
    assert.equal(config.secret, shared_secret)
    assert.deepEqual(validateOptions(config), config)
    assert.equal(parseOtp(config.secret, { kind: 'steam' }).secret, shared_secret)
    const linked = parseOtp('https://2fa.hot' + toAccessPath(config))
    const uri = parseOtp(toOtpUri(config), { kind: 'steam' })
    assert.equal(linked.kind, 'steam')
    assert.deepEqual(uri, config)
    assert.equal(await generateOtp(config, 1449690657000), await generateOtp(linked, 1449690657000))
  }
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
  assert.deepEqual(transportHeaders('/2fa', 'http'), {})
})
