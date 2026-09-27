import test from 'node:test'
import assert from 'node:assert/strict'
import { readPasskeySummaries, sameSite } from '../shared/passkey-manager.ts'

test('website accepts bounded display metadata only', () => {
  const record = {
    rpId: 'example.com',
    credentialId: 'id',
    userName: 'account',
    userDisplayName: 'Account',
    createdAt: 1,
    lastUsedAt: null
  }
  assert.deepEqual(
    readPasskeySummaries([{ ...record, privateKey: 'never-keep', password: 'never-keep' }]),
    [{ ...record, label: null }]
  )
  assert.equal(readPasskeySummaries([{ ...record, userName: 'a'.repeat(257) }]), null)
  assert.equal(readPasskeySummaries([{ ...record, credentialId: 123 }]), null)
  assert.equal(readPasskeySummaries([{ ...record, createdAt: Infinity }]), null)
  assert.equal(readPasskeySummaries(Array(1001).fill(record)), null)
  assert.equal(readPasskeySummaries({ records: [] }), null)
})

test('custom names are optional, bounded, and read as null when absent', () => {
  const base = {
    rpId: 'github.com',
    credentialId: 'abc',
    userName: 'octo',
    userDisplayName: 'Octo',
    createdAt: 1,
    lastUsedAt: null
  }
  assert.equal(readPasskeySummaries([base])?.[0]?.label, null, 'protocol 1 sends no label')
  assert.equal(readPasskeySummaries([{ ...base, label: null }])?.[0]?.label, null)
  assert.equal(readPasskeySummaries([{ ...base, label: 'Work' }])?.[0]?.label, 'Work')
  assert.equal(readPasskeySummaries([{ ...base, label: 'x'.repeat(257) }]), null)
  assert.equal(readPasskeySummaries([{ ...base, label: 7 }]), null)
})

test('a 2FA code goes with a passkey only when its issuer names a whole part of the domain', () => {
  assert.equal(sameSite('github.com', 'GitHub'), true)
  assert.equal(sameSite('accounts.google.com', 'Google'), true)
  assert.equal(sameSite('login.microsoftonline.com', 'Microsoft'), false)
  assert.equal(sameSite('github.com', 'Git'), false)
  assert.equal(sameSite('example.com', 'com'), false, 'the top-level domain is not a name')
  assert.equal(sameSite('aws.amazon.com', 'AWS'), true)
  assert.equal(sameSite('x.com', 'X'), false, 'names under three letters never match')
  assert.equal(sameSite('github.com', ''), false)
})
