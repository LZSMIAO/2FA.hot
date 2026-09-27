import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server'
import {
  createCredential,
  getCredential,
  validateRp,
  validateRequest,
  matches
} from '../src/webauthn.js'
import { seal, unseal, mergeRecords, publicRecords } from '../src/vault.js'
import { exportBitwarden, parseImport } from '../src/migration.js'
import { encode, decode, random } from '../src/encoding.js'
const origin = 'https://accounts.example.com'
const options = () => ({
  challenge: encode(random(32)),
  rp: { id: 'example.com', name: 'Example' },
  user: { id: encode(random(16)), name: 'test@example.com', displayName: 'Test' },
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  extensions: { credProps: true }
})
const password = 'test-only-password-123'
async function verify(record, registration, assertion, challenge) {
  const reg = await verifyRegistrationResponse({
    response: registration,
    expectedChallenge: JSON.parse(
      new TextDecoder().decode(decode(registration.response.clientDataJSON))
    ).challenge,
    expectedOrigin: origin,
    expectedRPID: record.rpId,
    requireUserVerification: true
  })
  assert.equal(reg.verified, true)
  const result = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: record.rpId,
    credential: reg.registrationInfo.credential,
    requireUserVerification: true
  })
  assert.equal(result.verified, true)
  assert.equal(result.authenticationInfo.userVerified, true)
  return reg
}
test('real ES256 registration and login verify with an independent WebAuthn server', async () => {
  const created = await createCredential(options(), origin)
  const request = {
    rpId: 'example.com',
    challenge: encode(random(32)),
    userVerification: 'required'
  }
  const assertion = await getCredential(request, origin, created.record)
  const reg = await verify(created.record, created.response, assertion.response, request.challenge)
  assert.equal(reg.registrationInfo.credentialDeviceType, 'multiDevice')
  assert.equal(reg.registrationInfo.credentialBackedUp, false)
  assert.deepEqual(created.response.clientExtensionResults, { credProps: { rk: true } })
  await assert.rejects(
    verifyAuthenticationResponse({
      response: assertion.response,
      expectedChallenge: encode(random(32)),
      expectedOrigin: origin,
      expectedRPID: 'example.com',
      credential: reg.registrationInfo.credential
    })
  )
  await assert.rejects(
    verifyAuthenticationResponse({
      response: assertion.response,
      expectedChallenge: request.challenge,
      expectedOrigin: 'https://evil.example',
      expectedRPID: 'example.com',
      credential: reg.registrationInfo.credential
    })
  )
})
test('reject unrelated origins, public/private suffixes, IPs, unsafe requests and unsupported extensions', () => {
  for (const rp of [
    'com',
    'co.uk',
    'github.io',
    'evil.com',
    'example.com.evil.com',
    'Example.com',
    'example.com.'
  ])
    assert.throws(() => validateRp(origin, rp))
  assert.throws(() => validateRp('https://tenant.github.io', 'github.io'))
  assert.throws(() => validateRp('http://example.com', 'example.com'))
  assert.throws(() => validateRp('https://127.0.0.1', '127.0.0.1'))
  assert.equal(validateRp('http://localhost:3001', 'localhost'), 'localhost')
  assert.equal(validateRp('https://login.example.co.uk', 'example.co.uk'), 'example.co.uk')
  assert.throws(() => validateRequest('create', { ...options(), challenge: 'AA' }, origin))
  assert.throws(() =>
    validateRequest(
      'create',
      { ...options(), extensions: { largeBlob: { support: 'required' } } },
      origin
    )
  )
  assert.throws(() =>
    validateRequest('create', { ...options(), attestation: 'enterprise' }, origin)
  )
  assert.throws(() =>
    validateRequest(
      'create',
      { ...options(), pubKeyCredParams: [{ type: 'public-key', alg: -257 }] },
      origin
    )
  )
})
test('exclusion, account selection and non-discoverable credentials respect RP boundaries', async () => {
  const settings = options(),
    created = await createCredential(settings, origin)
  await assert.rejects(
    createCredential(
      {
        ...settings,
        excludeCredentials: [{ id: created.record.credentialId, type: 'public-key' }]
      },
      origin,
      [created.record]
    )
  )
  assert.equal(matches([created.record], {}, 'evil.com').length, 0)
  const hidden = { ...created.record, discoverable: false }
  assert.equal(matches([hidden], {}, 'example.com').length, 0)
  assert.equal(
    matches([hidden], { allowCredentials: [{ id: hidden.credentialId }] }, 'example.com').length,
    1
  )
  await assert.rejects(
    getCredential({ challenge: encode(random(32)), rpId: 'other.com' }, origin, created.record)
  )
})
test('encrypted backup survives restore and still signs for the original public key', async () => {
  const created = await createCredential(options(), origin)
  const encrypted = await seal([created.record], password)
  assert.equal(JSON.stringify(encrypted).includes(created.record.privateKey), false)
  assert.equal(JSON.stringify(encrypted).includes(created.record.userName), false)
  await assert.rejects(unseal(encrypted, 'wrong-password-123'))
  const corrupted = decode(encrypted.data)
  corrupted[10] ^= 1
  await assert.rejects(unseal({ ...encrypted, data: encode(corrupted) }, password))
  await assert.rejects(unseal({ ...encrypted, iterations: 999999999 }, password))
  const restored = (await unseal(encrypted, password))[0]
  const request = { challenge: encode(random(32)), rpId: 'example.com' }
  const login = await getCredential(request, origin, restored)
  await verify(restored, created.response, login.response, request.challenge)
  assert.equal('privateKey' in publicRecords([restored])[0], false)
})
test('Bitwarden-shaped JSON round trip preserves key, credential ID, handle and counters', async () => {
  const created = await createCredential(options(), origin)
  const record = { ...created.record, counter: 7 }
  const json = exportBitwarden([record])
  const imported = await parseImport(json)
  assert.equal(imported.records[0].privateKey, record.privateKey)
  assert.equal(imported.records[0].credentialId, record.credentialId)
  assert.equal(imported.records[0].userHandle, record.userHandle)
  const merged = mergeRecords([record], [{ ...record, counter: 3 }])
  assert.equal(merged.records[0].counter, 7)
  assert.equal(merged.duplicates, 1)
  assert.throws(() => mergeRecords([record], [{ ...record, privateKey: 'different' }]))
  const request = { rpId: record.rpId, challenge: encode(random(32)) }
  const assertion = await getCredential(request, origin, imported.records[0])
  await verify(imported.records[0], created.response, assertion.response, request.challenge)
  assert.equal(assertion.record.counter, 8)
})
test('large encrypted backups, empty/unsupported imports and weak passwords fail safely', async () => {
  const bytes = random(60000),
    doubled = new Uint8Array(120000)
  doubled.set(bytes)
  doubled.set(bytes, bytes.length)
  assert.deepEqual(decode(encode(doubled)), doubled)
  await assert.rejects(seal([], 'short'))
  await assert.rejects(parseImport('{'))
  await assert.rejects(parseImport(JSON.stringify({ encrypted: false, items: [] })))
})
