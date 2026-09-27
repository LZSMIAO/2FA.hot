import test from 'node:test'
import assert from 'node:assert/strict'
import { verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { createCredential, getCredential, validateRequest } from '../src/webauthn.js'
import {
  changeVaultPassword,
  createVault,
  openVault,
  publicRecords,
  readVault,
  seal,
  unwrapWithSecret,
  wrapWithSecret,
  writeVault
} from '../src/vault.js'
import { exportBitwarden, parseImport } from '../src/migration.js'
import { createSession } from '../src/session.js'
import { buildIndex, mayMatch } from '../src/site-index.js'
import { concat, decode, encode, random, utf8 } from '../src/encoding.js'

const origin = 'https://accounts.example.com'
const options = (extra = {}) => ({
  challenge: encode(random(32)),
  rp: { id: 'example.com', name: 'Example' },
  user: { id: encode(random(16)), name: 'test@example.com', displayName: 'Test' },
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  ...extra
})
const password = 'feature-test-password-1'
const clientData = (response) =>
  JSON.parse(new TextDecoder().decode(decode(response.response.clientDataJSON)))

test('the local vault wraps a random key: reopen, rewrap on a new password, and upgrade version 1', async () => {
  const { record } = await createCredential(options(), origin)
  const { envelope, key } = await createVault([record], password)
  assert.equal(envelope.version, 2)
  assert.equal(JSON.stringify(envelope).includes(record.privateKey), false)
  const opened = await openVault(envelope, password)
  assert.deepEqual(opened.key, key)
  assert.equal(opened.records[0].credentialId, record.credentialId)
  await assert.rejects(openVault(envelope, 'not-the-password-123'), /主口令不正确/)
  // Writing with the cached key keeps the password wrap untouched.
  const renamed = await writeVault(envelope, [{ ...record, label: 'Work' }], key)
  assert.equal(renamed.salt, envelope.salt)
  assert.equal((await readVault(renamed, key))[0].label, 'Work')
  // A new password rewraps the same key: records and anything else holding the key stay valid.
  const moved = await changeVaultPassword(renamed, key, 'another-password-456')
  assert.deepEqual(moved.records, renamed.records)
  assert.deepEqual((await openVault(moved, 'another-password-456')).key, key)
  await assert.rejects(openVault(moved, password))
  await assert.rejects(changeVaultPassword(moved, key, 'short'))
  // A version 1 vault opens with its password and comes back as version 2.
  const legacy = await openVault(await seal([record], password), password)
  assert.equal(legacy.upgraded.version, 2)
  assert.deepEqual((await openVault(legacy.upgraded, password)).key, legacy.key)
})

test('device unlock wraps the vault key under a PRF value and rejects any other value', async () => {
  const key = random(32)
  const secret = encode(random(32))
  const box = await wrapWithSecret(key, secret)
  assert.deepEqual(await unwrapWithSecret(box, secret), key)
  await assert.rejects(unwrapWithSecret(box, encode(random(32))), /设备验证未能解锁/)
  await assert.rejects(unwrapWithSecret(box, encode(random(8))))
})

test('the session keeps the key in memory, slides its deadline, and forgets it on time or after one use', async () => {
  const local = {},
    memory = {}
  const area = (values) => ({
    get: async (name) => ({ [name]: structuredClone(values[name]) }),
    set: async (value) => Object.assign(values, structuredClone(value)),
    remove: async (name) => {
      delete values[name]
    }
  })
  const session = createSession({ storage: { local: area(local), session: area(memory) } })
  const key = random(32)
  assert.equal(await session.recall(), null)
  await session.remember(key)
  assert.deepEqual(await session.recall(), key)
  assert.equal(await session.unlocked(), true)
  assert.equal(local.unlocked, undefined, 'never written to disk-backed storage')
  memory.unlocked.until = Date.now() - 1
  assert.equal(await session.recall(), null)
  assert.equal(memory.unlocked, undefined)
  local.settings = { lockAfter: 0 }
  await session.remember(key)
  assert.equal(memory.unlocked.once, true)
  assert.deepEqual(await session.recall(), key)
  await session.settle()
  assert.equal(await session.unlocked(), false)
  local.settings = { lockAfter: -1 }
  await session.remember(key)
  assert.equal(memory.unlocked.until, null, 'until the browser closes')
  await session.settle()
  assert.equal(await session.unlocked(), true, 'settle only ends one-use sessions')
})

test('the site index answers "maybe" without naming sites, and never hides a passkey it cannot judge', async () => {
  const { record: discoverable } = await createCredential(options(), origin)
  const { record: hidden } = await createCredential(
    options({
      rp: { id: 'accounts.example.com', name: 'Accounts' },
      authenticatorSelection: { residentKey: 'discouraged' }
    }),
    origin
  )
  const index = await buildIndex([discoverable, hidden])
  assert.equal(JSON.stringify(index).includes('example.com'), false)
  assert.equal(await mayMatch(index, 'get', {}, 'example.com'), true)
  assert.equal(await mayMatch(index, 'get', {}, 'other.example.com'), false)
  assert.equal(
    await mayMatch(index, 'get', {}, 'accounts.example.com'),
    false,
    'non-discoverable needs its ID'
  )
  assert.equal(
    await mayMatch(
      index,
      'get',
      { allowCredentials: [{ type: 'public-key', id: hidden.credentialId }] },
      'accounts.example.com'
    ),
    true
  )
  assert.equal(
    await mayMatch(
      index,
      'get',
      { allowCredentials: [{ type: 'public-key', id: encode(random(32)) }] },
      'example.com'
    ),
    false
  )
  assert.equal(await mayMatch(index, 'create', {}, 'unknown.example'), true)
  assert.equal(await mayMatch(undefined, 'get', {}, 'unknown.example'), true)
  const rebuilt = await buildIndex([discoverable], index)
  assert.equal(rebuilt.key, index.key, 'the index key survives rebuilds')
})

test('PRF follows WebAuthn: stable per credential and input, distinct otherwise, both inputs, per-credential inputs', async () => {
  const first = encode(utf8('salt-one')),
    second = encode(utf8('salt-two'))
  const created = await createCredential(
    options({ extensions: { prf: { eval: { first } } } }),
    origin
  )
  assert.equal(created.response.clientExtensionResults.prf.enabled, true)
  const atCreate = created.response.clientExtensionResults.prf.results.first
  const get = (extensions) =>
    getCredential(
      { challenge: encode(random(32)), rpId: 'example.com', extensions },
      origin,
      created.record
    )
  const a = await get({ prf: { eval: { first, second } } })
  const b = await get({ prf: { eval: { first } } })
  assert.equal(a.response.clientExtensionResults.prf.results.first, atCreate)
  assert.equal(b.response.clientExtensionResults.prf.results.first, atCreate)
  assert.notEqual(a.response.clientExtensionResults.prf.results.second, atCreate)
  assert.equal(decode(atCreate).length, 32)
  // The value is HMAC-SHA256(seed, SHA-256("WebAuthn PRF" || 0x00 || input)).
  const salt = await crypto.subtle.digest(
    'SHA-256',
    concat(utf8('WebAuthn PRF'), Uint8Array.of(0), utf8('salt-one'))
  )
  const hmac = await crypto.subtle.importKey(
    'raw',
    decode(created.record.prfSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  assert.equal(encode(await crypto.subtle.sign('HMAC', hmac, salt)), atCreate)
  const byCredential = await getCredential(
    {
      challenge: encode(random(32)),
      rpId: 'example.com',
      allowCredentials: [{ type: 'public-key', id: created.record.credentialId }],
      extensions: {
        prf: {
          eval: { first: second },
          evalByCredential: { [created.record.credentialId]: { first } }
        }
      }
    },
    origin,
    created.record
  )
  assert.equal(byCredential.response.clientExtensionResults.prf.results.first, atCreate)
  // Another credential answers the same input differently.
  const other = await createCredential(options({ extensions: { prf: {} } }), origin)
  const otherValue = await getCredential(
    {
      challenge: encode(random(32)),
      rpId: 'example.com',
      extensions: { prf: { eval: { first } } }
    },
    origin,
    other.record
  )
  assert.notEqual(otherValue.response.clientExtensionResults.prf.results.first, atCreate)
  // An older credential gets its seed on first use and keeps it.
  const { record: old } = await createCredential(options(), origin)
  assert.equal(old.prfSeed, null)
  const seeded = await getCredential(
    {
      challenge: encode(random(32)),
      rpId: 'example.com',
      extensions: { prf: { eval: { first } } }
    },
    origin,
    old
  )
  assert.equal(decode(seeded.record.prfSeed).length, 32)
  assert.equal(publicRecords([seeded.record])[0].prfSeed, undefined, 'seeds never leave the vault')
  // evalByCredential must name listed credentials, and never appears on create.
  assert.throws(() =>
    validateRequest(
      'get',
      {
        challenge: encode(random(32)),
        extensions: { prf: { evalByCredential: { [encode(random(16))]: { first } } } }
      },
      origin
    )
  )
  assert.throws(() =>
    validateRequest('create', options({ extensions: { prf: { evalByCredential: {} } } }), origin)
  )
})

test('duplicates answer InvalidStateError, attestation is downgraded to none, iframes report their top origin', async () => {
  const { record } = await createCredential(options(), origin)
  const again = options({ excludeCredentials: [{ type: 'public-key', id: record.credentialId }] })
  await assert.rejects(
    createCredential(again, origin, [record]),
    (error) => error.name === 'InvalidStateError'
  )
  const attested = await createCredential(options({ attestation: 'direct' }), origin)
  const registration = await verifyRegistrationResponse({
    response: attested.response,
    expectedChallenge: clientData(attested.response).challenge,
    expectedOrigin: origin,
    expectedRPID: 'example.com',
    requireUserVerification: true
  })
  assert.equal(registration.verified, true)
  assert.equal(registration.registrationInfo.fmt, 'none')
  const framed = await createCredential(options(), origin, [], {
    topOrigin: 'https://shop.example.net'
  })
  assert.deepEqual(
    {
      crossOrigin: clientData(framed.response).crossOrigin,
      topOrigin: clientData(framed.response).topOrigin
    },
    { crossOrigin: true, topOrigin: 'https://shop.example.net' }
  )
  const sameSite = await getCredential(
    { challenge: encode(random(32)), rpId: 'example.com' },
    origin,
    framed.record,
    { topOrigin: origin }
  )
  assert.equal(clientData(sameSite.response).crossOrigin, false)
  assert.equal(clientData(sameSite.response).topOrigin, undefined)
  const login = await verifyAuthenticationResponse({
    response: sameSite.response,
    expectedChallenge: clientData(sameSite.response).challenge,
    expectedOrigin: origin,
    expectedRPID: 'example.com',
    credential: (
      await verifyRegistrationResponse({
        response: framed.response,
        expectedChallenge: clientData(framed.response).challenge,
        expectedOrigin: origin,
        expectedRPID: 'example.com'
      })
    ).registrationInfo.credential,
    requireUserVerification: true
  })
  assert.equal(login.verified, true)
})

test('custom names travel through Bitwarden JSON; PRF seeds are dropped where the format has no place for them', async () => {
  const { record } = await createCredential(options({ extensions: { prf: {} } }), origin)
  const named = { ...record, label: 'Work account' }
  const json = JSON.parse(exportBitwarden([named]))
  assert.equal(json.items[0].name, 'Work account')
  assert.equal(JSON.stringify(json).includes(record.prfSeed), false)
  const back = await parseImport(JSON.stringify(json))
  assert.equal(back.records[0].label, 'Work account')
  assert.equal(back.records[0].prfSeed, null)
  const plain = JSON.parse(exportBitwarden([record]))
  assert.equal(
    (await parseImport(JSON.stringify(plain))).records[0].label,
    null,
    'a bare domain is not a name'
  )
})
