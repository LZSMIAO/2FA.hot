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
  // An iframe is served too, and its request records the page around it.
  const framed = await send(request(), { ...website, frameId: 1 })
  assert.ok(framed.token)
  assert.equal(framed.mode, 'window', 'an iframe confirms in a window, not inside the page')
  assert.equal(session.request.topOrigin, 'https://example.com')
  await send({ action: 'cancel', token: framed.token }, { ...website, frameId: 1 })
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
  const retry = await send(request(), website)
  assert.ok(retry.token, 'cancel releases the request immediately')
  assert.equal(
    (await send({ action: 'poll', token: begin.token }, website)).result.error,
    '请求已失效。'
  )
  await send({ action: 'cancel', token: retry.token }, website)
  assert.equal(JSON.stringify({ local, session }).includes('background-test-password'), false)
})

test('website bridge only exposes the version and locked manager to the companion origin', async () => {
  const origin = 'https://2fa.hot'
  const companion = { ...website, origin, url: `${origin}/passkeys`, documentId: 'site-document' }
  frame = { url: companion.url, documentId: companion.documentId }
  const status = await send({ action: 'site-status' }, companion)
  assert.deepEqual(status, { ok: true, version: '0.2.0', managerProtocol: 2 })
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
    'label',
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

const password = 'background-test-password'
const promptSender = (token, tab = 1) => ({
  id: 'test-extension',
  url: `chrome-extension://test-extension/prompt.html?request=${token}`,
  tab: { id: tab, windowId: 9 },
  frameId: 7
})
const getRequest = (extra = {}) => ({
  action: 'begin',
  kind: 'get',
  options: { challenge: encode(random(32)), rpId: 'example.com', ...extra }
})
const identityOf = (r) => `${r.rpId}:${r.credentialId}`

test('quick unlock keeps the vault open, and export, password and device changes still ask for the password', async () => {
  frame = { documentId: 'document-1', url: 'https://example.com/account' }
  assert.equal((await send({ action: 'lock' })).ok, true)
  const locked = await send({ action: 'list' })
  assert.equal(locked.ok, false)
  assert.equal(locked.code, 'Locked')
  assert.equal((await send({ action: 'status' })).unlocked, false)
  assert.equal((await send({ action: 'unlock', password: 'wrong-password-123' })).ok, false)
  assert.equal((await send({ action: 'unlock', password })).ok, true)
  const listed = await send({ action: 'list' })
  assert.equal(listed.records.length, 1)
  assert.equal((await send({ action: 'status' })).unlocked, true)
  const id = identityOf(listed.records[0])
  for (const message of [
    { action: 'export', ids: [id], format: 'encrypted', backupPassword: 'backup-password-1234' },
    { action: 'password', nextPassword: 'next-password-12345' },
    {
      action: 'device-enable',
      credentialId: encode(random(16)),
      salt: encode(random(32)),
      secret: encode(random(32))
    }
  ])
    assert.equal((await send(message)).code, 'PasswordRequired', message.action)
  assert.equal(JSON.stringify({ local, session }).includes(password), false)
})

test('rename and export are written back, and an exported credential reports itself backed up', async () => {
  const [record] = (await send({ action: 'list' })).records
  const id = identityOf(record)
  assert.equal(record.backupState, false)
  assert.equal((await send({ action: 'rename', id, label: '  Work  ' })).records[0].label, 'Work')
  assert.equal((await send({ action: 'rename', id, label: 'x'.repeat(257) })).ok, false)
  assert.equal((await send({ action: 'rename', id: 'missing:id', label: 'x' })).ok, false)
  const exported = await send({
    action: 'export',
    password,
    ids: [id],
    format: 'encrypted',
    backupPassword: 'backup-password-1234'
  })
  assert.equal(exported.ok, true)
  const [after] = (await send({ action: 'list' })).records
  assert.equal(after.label, 'Work')
  assert.equal(after.backupState, true)
  assert.equal((await send({ action: 'rename', id, label: '' })).records[0].label, null)
})

test('device unlock opens the vault with the right PRF value only, and survives a password change', async () => {
  const device = {
    credentialId: encode(random(16)),
    salt: encode(random(32)),
    secret: encode(random(32))
  }
  assert.equal((await send({ action: 'device-enable', password, ...device })).ok, true)
  assert.equal(JSON.stringify(local).includes(device.secret), false)
  assert.deepEqual((await send({ action: 'status' })).device, {
    credentialId: device.credentialId,
    salt: device.salt
  })
  await send({ action: 'lock' })
  const unlock = (values) => send({ action: 'device-unlock', ...values })
  assert.equal(
    (await unlock({ credentialId: device.credentialId, secret: encode(random(32)) })).ok,
    false
  )
  assert.equal(
    (await unlock({ credentialId: encode(random(16)), secret: device.secret })).ok,
    false
  )
  assert.equal(
    (await unlock({ credentialId: device.credentialId, secret: device.secret })).ok,
    true
  )
  assert.equal((await send({ action: 'list' })).records.length, 1)
  assert.equal(
    (await send({ action: 'password', password, nextPassword: 'rotated-password-789' })).ok,
    true
  )
  await send({ action: 'lock' })
  assert.equal(
    (await unlock({ credentialId: device.credentialId, secret: device.secret })).ok,
    true
  )
  assert.equal(
    (await send({ action: 'password', password: 'rotated-password-789', nextPassword: password }))
      .ok,
    true
  )
  assert.equal((await send({ action: 'device-disable' })).ok, true)
  assert.equal(local.device, undefined)
})

test('unknown sites go straight to the browser, and the in-page prompt answers only its own request', async () => {
  const stranger = {
    ...website,
    origin: 'https://unknown.example.org',
    url: 'https://unknown.example.org/'
  }
  assert.equal((await send(getRequest({ rpId: undefined }), stranger)).fallback, true)
  assert.equal(
    (await send({ action: 'probe', options: { challenge: encode(random(32)) } }, stranger)).match,
    false
  )
  assert.equal(
    (await send({ action: 'probe', options: getRequest().options }, website)).match,
    true
  )
  const begin = await send(getRequest(), website)
  assert.equal(begin.mode, 'page')
  const own = promptSender(begin.token)
  const status = await send({ action: 'status', token: begin.token }, own)
  assert.equal(status.request.mode, 'page')
  assert.equal(
    (await send({ action: 'status', token: begin.token }, promptSender(begin.token, 2))).ok,
    false
  )
  assert.equal((await send({ action: 'list' }, own)).ok, false, 'no token, no vault')
  for (const action of [
    'export',
    'remove',
    'rename',
    'password',
    'setup',
    'settings',
    'lock',
    'device-enable'
  ])
    assert.equal((await send({ action, token: begin.token, password }, own)).ok, false, action)
  const choices = await send({ action: 'list', token: begin.token }, own)
  assert.equal(choices.records.length, 1)
  assert.equal(
    (
      await send(
        { action: 'approve', token: begin.token, credentialId: choices.records[0].credentialId },
        own
      )
    ).ok,
    true
  )
  const polled = await send({ action: 'poll', token: begin.token }, website)
  assert.equal(polled.done, true)
  assert.ok(polled.result.value.response.signature)
})

test('a duplicate create tells the site InvalidStateError only after the vault is unlocked', async () => {
  const [record] = (await send({ action: 'list' })).records
  const duplicate = request()
  duplicate.options.excludeCredentials = [{ type: 'public-key', id: record.credentialId }]
  const begin = await send(duplicate, website)
  const own = promptSender(begin.token)
  await send({ action: 'lock' })
  assert.equal((await send({ action: 'exists', token: begin.token }, own)).code, 'Locked')
  assert.equal((await send({ action: 'unlock', token: begin.token, password }, own)).ok, true)
  assert.equal((await send({ action: 'list', token: begin.token }, own)).excluded, true)
  assert.equal((await send({ action: 'exists', token: begin.token }, own)).ok, true)
  const result = (await send({ action: 'poll', token: begin.token }, website)).result
  assert.equal(result.name, 'InvalidStateError')
  const fresh = await send(request(), website)
  assert.equal(
    (await send({ action: 'list', token: fresh.token }, promptSender(fresh.token))).excluded,
    false
  )
  assert.equal(
    (await send({ action: 'exists', token: fresh.token }, promptSender(fresh.token))).ok,
    false
  )
  await send({ action: 'cancel', token: fresh.token }, website)
})

test('settings take only the offered values, and a window prompt answers only from its own window', async () => {
  assert.equal((await send({ action: 'settings', lockAfter: 7 })).ok, false)
  assert.equal((await send({ action: 'settings', prompt: 'overlay' })).ok, false)
  assert.equal((await send({ action: 'settings', lockAfter: 60 })).settings.lockAfter, 60)
  assert.equal((await send({ action: 'settings', prompt: 'window' })).settings.prompt, 'window')
  const begin = await send(getRequest(), website)
  assert.equal(begin.mode, 'window')
  // windows.create in this harness returns window 42.
  assert.equal(
    (await send({ action: 'status', token: begin.token }, promptSender(begin.token))).ok,
    false
  )
  const inWindow = { ...promptSender(begin.token), tab: { id: 5, windowId: 42 } }
  assert.equal((await send({ action: 'status', token: begin.token }, inWindow)).ok, true)
  assert.equal((await send({ action: 'deny', token: begin.token }, inWindow)).ok, true)
  assert.equal(
    (await send({ action: 'poll', token: begin.token }, website)).result.error,
    '用户取消了操作。'
  )
  await send({ action: 'settings', prompt: 'page', lockAfter: 15 })
})
