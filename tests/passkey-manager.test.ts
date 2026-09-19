import test from 'node:test'
import assert from 'node:assert/strict'
import { readPasskeySummaries } from '../shared/passkey-manager.ts'

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
    [record]
  )
  assert.equal(readPasskeySummaries([{ ...record, userName: 'a'.repeat(257) }]), null)
  assert.equal(readPasskeySummaries([{ ...record, credentialId: 123 }]), null)
  assert.equal(readPasskeySummaries([{ ...record, createdAt: Infinity }]), null)
  assert.equal(readPasskeySummaries(Array(1001).fill(record)), null)
  assert.equal(readPasskeySummaries({ records: [] }), null)
})
