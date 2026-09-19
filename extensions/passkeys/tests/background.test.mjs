import test from 'node:test'
import assert from 'node:assert/strict'
import { createCredential } from '../src/webauthn.js'
import { seal } from '../src/vault.js'
import { encode, random } from '../src/encoding.js'
const local = {},
  session = {}
let listener,
  opened = 0,
  frame = { documentId: 'document-1', url: 'https://example.com/account' }
const area = (values) => ({
  setAccessLevel: async () => {},
  get: async (name) => (name ? { [name]: values[name] } : structuredClone(values)),
  set: async (value) => Object.assign(values, structuredClone(value)),
  remove: async (name) => {
    delete values[name]
  }
})
globalThis.chrome = {
  runtime: {
    id: 'test-extension',
    getURL: (p) => `chrome-extension://test-extension/${p}`,
    onMessage: { addListener: (fn) => (listener = fn) },
    openOptionsPage: async () => {
      opened++
    },
    getManifest: () => ({ version: '0.2.0' })
  },
  storage: { local: area(local), session: area(session) },
  windows: {
    create: async () => ({ id: 42 }),
    remove: async () => {},
    onRemoved: { addListener() {} }
  },
  webNavigation: { getFrame: async () => frame },
  action: { onClicked: { addListener() {} } },
  alarms: { create() {}, onAlarm: { addListener() {} } }
}
await import('../src/background.js')
const ui = { id: 'test-extension', url: 'chrome-extension://test-extension/ui.html' }
const website = {
  id: 'test-extension',
  url: frame.url,
  origin: 'https://example.com',
  tab: { id: 1 },
  frameId: 0,
  documentId: 'document-1'
}
const request = () => ({
  action: 'begin',
  kind: 'create',
  options: {
    challenge: encode(random(32)),
    rp: { id: 'example.com', name: 'Example' },
    user: { id: encode(random(16)), name: 'test', displayName: 'Test' },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }]
  }
})
const send = (data, sender = ui) => new Promise((resolve) => listener(data, sender, resolve))
test('background rejects content-script management and trusts browser origin/document over request fields', async () => {
  assert.equal((await send({ action: 'setup', password: 'background-test-password' })).ok, true)
  for (const action of ['list', 'export', 'remove', 'password', 'import', 'approve', 'setup']) {
    const response = await send({ action, password: 'background-test-password' }, website)
    assert.equal(response.ok, false, action)
  }
  const unsafe = request()
  unsafe.options.rp.id = 'evil.com'
  unsafe.options.origin = 'https://evil.com'
  assert.equal((await send(unsafe, website)).fallback, true)
  assert.equal((await send(request(), { ...website, frameId: 1 })).fallback, true)
  const begin = await send(request(), website)
  assert.ok(begin.token)
  const foreignPoll = await send(
    { action: 'poll', token: begin.token },
    { ...website, documentId: 'different-document' }
  )
  assert.ok(foreignPoll.result.error)
  assert.equal((await send(request(), website)).fallback, true, 'one active request at a time')
  frame = { ...frame, documentId: 'document-2' }
  const approve = await send({
    action: 'approve',
    token: begin.token,
    password: 'background-test-password'
  })
  assert.equal(approve.ok, false)
  assert.match(approve.error, /来源网站/)
  const records = await send({ action: 'list', password: 'background-test-password' })
  assert.equal(records.records.length, 0)
  const cancelled = await send({ action: 'cancel', token: begin.token }, website)
  assert.equal(cancelled.ok, true)
  assert.equal((await send(request(), website)).fallback, true, 'preserve unconsumed results')
  assert.equal(
    (await send({ action: 'poll', token: begin.token }, website)).result.error,
    '请求已取消。'
  )
  assert.equal(JSON.stringify({ local, session }).includes('background-test-password'), false)
})

test('website bridge only exposes the version and locked manager to the companion origin', async () => {
  const origin = 'https://2fa.hot'
  const companion = { ...website, origin, url: `${origin}/passkeys`, documentId: 'site-document' }
  frame = { url: companion.url, documentId: companion.documentId }
  const status = await send({ action: 'site-status' }, companion)
  assert.deepEqual(status, { ok: true, version: '0.2.0', managerProtocol: 1 })
  assert.equal((await send({ action: 'site-open' }, companion)).ok, true)
  assert.equal(opened, 1)
  for (const sender of [
    website,
    { ...companion, frameId: 1 },
    { ...companion, documentId: 'old-document' },
    { ...companion, origin: 'https://2fa.hot.evil.com' },
    { ...companion, origin: 'https://evil.com', url: 'https://evil.com' }
  ]) {
    assert.equal((await send({ action: 'site-open' }, sender)).ok, false)
    assert.equal((await send({ action: 'site-status' }, sender)).ok, false)
  }
  assert.equal(opened, 1)
  for (const action of ['status', 'list', 'export', 'import', 'approve', 'setup'])
    assert.equal(
      (await send({ action, password: 'background-test-password' }, companion)).ok,
      false
    )
})

test('website management requires approval, binds documents and never returns secrets', async () => {
  const origin = 'http://localhost:3001'
  const caller = { ...website, origin, url: `${origin}/zh-CN`, documentId: 'manager-document' }
  frame = { url: caller.url, documentId: caller.documentId }
  const password = 'background-test-password'
  const created = await createCredential(request().options, 'https://example.com')
  local.vault = await seal([created.record], password)
  const start = await send({ action: 'site-manage', operation: 'list' }, caller)
  assert.ok(start.token)
  assert.equal((await send({ action: 'site-result', token: start.token }, caller)).done, false)
  assert.equal((await send({ action: 'site-manage', operation: 'list' }, caller)).ok, false)
  for (const foreign of [
    { ...caller, tab: { id: 2 } },
    { ...caller, documentId: 'other' },
    website
  ]) {
    assert.equal((await send({ action: 'site-result', token: start.token }, foreign)).ok, false)
    assert.equal((await send({ action: 'site-cancel', token: start.token }, foreign)).ok, false)
  }
  assert.equal(
    (await send({ action: 'companion-finish', companion: start.token, password }, caller)).ok,
    false
  )
  assert.equal(
    (await send({ action: 'remove', companion: start.token, password, ids: ['anything'] })).ok,
    false
  )
  assert.equal(
    (await send({ action: 'companion-finish', companion: start.token, password: 'wrong' })).ok,
    false
  )
  assert.equal(
    (await send({ action: 'companion-finish', companion: start.token, password })).ok,
    true
  )
  const result = await send({ action: 'site-result', token: start.token }, caller)
  assert.equal(result.records.length, 1)
  assert.deepEqual(Object.keys(result.records[0]).sort(), [
    'createdAt',
    'credentialId',
    'lastUsedAt',
    'rpId',
    'userDisplayName',
    'userName'
  ])
  assert.equal(JSON.stringify(result).includes(created.record.privateKey), false)
  assert.equal(JSON.stringify(result).includes(password), false)
  assert.equal((await send({ action: 'site-result', token: start.token }, caller)).ok, false)
  assert.equal(session.companion, undefined)
  const navigation = await send(
    {
      action: 'site-manage',
      operation: 'remove',
      ids: [`${created.record.rpId}:${created.record.credentialId}`]
    },
    caller
  )
  frame.documentId = 'navigated'
  assert.equal((await send({ action: 'remove', companion: navigation.token, password })).ok, false)
  frame.documentId = caller.documentId
  assert.equal(
    (await send({ action: 'site-cancel', token: navigation.token }, caller)).cancelled,
    true
  )
  assert.equal(
    (await send({ action: 'companion-finish', companion: navigation.token, password })).ok,
    false
  )
  const expiring = await send({ action: 'site-manage', operation: 'list' }, caller)
  session.companion.expires = Date.now() - 1
  assert.equal(
    (await send({ action: 'companion-finish', companion: expiring.token, password })).ok,
    false
  )
  assert.equal(
    (await send({ action: 'site-result', token: expiring.token }, caller)).cancelled,
    true
  )
  assert.equal((await send({ action: 'list', password })).records.length, 1)
})
