import 'fake-indexeddb/auto'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer } from 'vue'
import { createVault } from '../app/composables/useVault.ts'
import { readEnvelope, writeEnvelope } from '../app/utils/storage.ts'

const channels: Array<{ onmessage?: () => void }> = []
class Channel {
  onmessage?: () => void
  constructor() {
    channels.push(this)
  }
  postMessage() {
    for (const channel of channels) if (channel !== this) channel.onmessage?.()
  }
  close() {
    channels.splice(channels.indexOf(this), 1)
  }
}
Object.assign(globalThis, {
  window: { BroadcastChannel: Channel, addEventListener() {}, removeEventListener() {} },
  BroadcastChannel: Channel
})
const renderer = createRenderer<object, object>({
  patchProp() {},
  insert() {},
  remove() {},
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText() {},
  setElementText() {},
  parentNode: () => null,
  nextSibling: () => null
})
function mount() {
  let vault!: ReturnType<typeof createVault>
  const app = renderer.createApp({
    setup() {
      vault = createVault()
      return () => null
    }
  })
  app.mount({})
  return { vault, stop: () => app.unmount() }
}
async function waitFor(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  assert.fail('Vault state did not settle')
}
test('real vault lifecycle: plaintext, password switch, backup and cross-tab deletion', async () => {
  const first = mount(),
    second = mount()
  try {
    await waitFor(() => first.vault.ready.value && second.vault.ready.value)
    await first.vault.enable()
    const config = {
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-1' as const,
      digits: 6 as const,
      period: 30,
      label: 'test',
      issuer: ''
    }
    await first.vault.save([config])
    await waitFor(() => second.vault.records.value.length === 1)
    const backup = await first.vault.backup()
    assert.equal((await first.vault.inspectBackup(backup, '')).length, 1)
    await first.vault.setPassword('test-password')
    await waitFor(() => second.vault.passwordProtected.value && !second.vault.unlocked.value)
    assert.equal(second.vault.records.value.length, 0)
    await assert.rejects(second.vault.unlock('wrong'))
    await second.vault.unlock('test-password')
    assert.equal(second.vault.records.value.length, 1)
    await second.vault.setPassword()
    await waitFor(() => first.vault.unlocked.value && !first.vault.passwordProtected.value)
    await first.vault.erase()
    await waitFor(() => !second.vault.exists.value)
    assert.equal(second.vault.records.value.length, 0)
    await first.vault.enable()
    await first.vault.merge(await first.vault.inspectBackup(backup, ''))
    assert.equal(first.vault.records.value.length, 1)
    const current = await readEnvelope()
    await assert.rejects(writeEnvelope(undefined, 'stale-revision'))
    assert.equal((await readEnvelope())?.revision, current?.revision)
    await first.vault.erase()
  } finally {
    first.stop()
    second.stop()
  }
})

test('session rename stays temporary when disabled and upserts the matching saved record when enabled', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    const config = {
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-1' as const,
      digits: 6 as const,
      period: 30,
      label: '',
      issuer: ''
    }
    vault.remember([config])
    const id = vault.recent.value[0]!.id
    await vault.editRecent(id, 'Temporary')
    assert.equal(vault.recent.value[0]!.label, 'Temporary')
    assert.equal(await readEnvelope(), undefined)
    vault.remember([config])
    assert.equal(vault.recent.value[0]!.label, 'Temporary')
    await vault.enable()
    await vault.save([config])
    assert.equal(vault.records.value[0]!.label, 'Temporary')
    await vault.editRecent(id, 'Saved')
    assert.equal(vault.records.value.length, 1)
    const savedId = vault.records.value[0]!.id
    await vault.edit(savedId, 'Saved', 'Keep note')
    assert.equal(vault.recent.value[0]!.label, 'Saved')
    assert.equal(vault.recent.value[0]!.note, 'Keep note')
    await vault.editRecent(id, 'Renamed')
    assert.equal(vault.records.value.length, 1)
    assert.equal(vault.records.value[0]!.id, savedId)
    assert.equal(vault.records.value[0]!.label, 'Renamed')
    await vault.save([config])
    assert.equal(vault.records.value[0]!.label, 'Renamed')
    await vault.edit(savedId, '', 'Keep note')
    assert.equal(vault.recent.value[0]!.label, '')
    await vault.save([config])
    assert.equal(vault.records.value[0]!.label, '')
    assert.equal(vault.records.value[0]!.note, 'Keep note')
    await vault.erase()
  } finally {
    stop()
  }
})

test('backup timestamps must be valid dates before preview or persistence', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    if (vault.exists.value) await vault.erase()
    await vault.enable()
    const record = {
      id: 'timestamp-test',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-1' as const,
      digits: 6 as const,
      period: 30,
      label: '',
      issuer: '',
      note: '',
      usedAt: 1e100
    }
    const backup = (usedAt: number) =>
      JSON.stringify({ version: 2, protection: 'none', data: [{ ...record, usedAt }] })
    for (const at of [1e100, -1e100, 8_640_000_000_000_001]) {
      await assert.rejects(vault.inspectBackup(backup(at), ''))
      await assert.rejects(vault.merge([{ ...record, usedAt: at }]))
    }
    assert.equal(vault.records.value.length, 0)
    const valid = await vault.inspectBackup(backup(0), '')
    await vault.merge(valid)
    assert.equal(vault.records.value[0]?.usedAt, 0)
    await vault.erase()
  } finally {
    stop()
  }
})

test('batch session keeps one snapshot and stays separate from single records', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    const first = {
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-1' as const,
      digits: 6 as const,
      period: 30,
      label: '',
      issuer: ''
    }
    const second = { ...first, secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' }
    vault.rememberBatch([first, second], 'batch-test')
    assert.equal(vault.recent.value.length, 1)
    assert.equal(vault.recent.value[0]!.batch?.length, 2)
    vault.remember([first])
    assert.equal(vault.recent.value.length, 2)
    await vault.editRecent('batch-test', 'My batch')
    vault.rememberBatch([second], 'batch-test')
    assert.equal(vault.recent.value.length, 2)
    assert.equal(vault.recent.value[0]!.label, 'My batch')
    assert.equal(vault.recent.value[0]!.batch?.[0]?.secret, second.secret)
    assert.equal(vault.recent.value[1]!.label, '')
    vault.clearRecent()
    assert.equal(vault.recent.value.length, 0)
  } finally {
    stop()
  }
})

test('saved batches retain grouping through backup without absorbing single records', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    await vault.erase()
    await vault.enable()
    const first = {
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-1' as const,
      digits: 6 as const,
      period: 30,
      label: '',
      issuer: ''
    }
    const second = { ...first, secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' }
    await vault.save([first, second], 'saved-batch')
    await vault.save([first])
    assert.equal(vault.records.value.length, 3)
    assert.equal(vault.records.value.filter((r) => r.batchId === 'saved-batch').length, 2)
    vault.remember([{ ...first, label: 'Single label' }])
    await vault.save([{ ...first, label: 'Batch label' }], 'another-batch')
    assert.equal(
      vault.records.value.find((r) => r.batchId === 'another-batch')?.label,
      'Batch label'
    )
    await vault.editRecent(vault.recent.value[0]!.id, 'Renamed single')
    assert.equal(
      vault.records.value.find((r) => r.batchId === 'another-batch')?.label,
      'Batch label'
    )
    assert.equal(vault.records.value.find((r) => !r.batchId)?.label, 'Renamed single')
    const backup = await vault.backup()
    const imported = await vault.inspectBackup(backup, '')
    assert.equal(imported.filter((r) => r.batchId === 'saved-batch').length, 2)
    await vault.erase()
    await vault.enable()
    await vault.merge(imported)
    assert.equal(vault.records.value.length, 4)
    await vault.save([{ ...first, label: 'Updated batch account' }], 'saved-batch', true)
    assert.equal(vault.records.value.filter((r) => r.batchId === 'saved-batch').length, 1)
    assert.equal(
      vault.records.value.find((r) => r.batchId === 'saved-batch')?.label,
      'Updated batch account'
    )
    assert.equal(vault.records.value.find((r) => !r.batchId)?.label, 'Renamed single')
    await vault.erase()
  } finally {
    stop()
  }
})

test('an account recognised after the first save fills in the still-empty name', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    const base = {
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA-1' as const,
      digits: 6 as const,
      period: 30,
      label: '',
      issuer: ''
    }
    // Smart paste records the key first and only learns the account once the
    // user links it, so the empty name has to yield to the one that arrives.
    vault.remember([base])
    assert.equal(vault.recent.value[0]!.label, '')
    vault.remember([{ ...base, label: 'alice@example.com' }])
    assert.equal(vault.recent.value[0]!.label, 'alice@example.com')
    await vault.enable()
    await vault.save([base])
    assert.equal(vault.records.value[0]!.label, 'alice@example.com')
    // A name the user typed still wins over anything recognised later.
    await vault.editRecent(vault.recent.value[0]!.id, 'Mine')
    vault.remember([{ ...base, label: 'bob@example.com' }])
    assert.equal(vault.recent.value[0]!.label, 'Mine')
  } finally {
    stop()
  }
})

test('a batch name is shared by every record of the group, survives a backup and follows a session rename', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    // Earlier tests share this store; start from an empty one.
    if (vault.exists.value) await vault.erase()
    await vault.enable()
    const base = {
      algorithm: 'SHA-1' as const,
      digits: 6 as const,
      period: 30,
      issuer: ''
    }
    const configs = [
      { ...base, secret: 'JBSWY3DPEHPK3PXP', label: 'one' },
      { ...base, secret: 'KRSXG5CTMVRXEZLU', label: 'two' }
    ]
    vault.rememberBatch(configs, 'batch-1')
    await vault.save(configs, 'batch-1', true)
    assert.deepEqual(
      vault.records.value.map((row) => row.batchId),
      ['batch-1', 'batch-1']
    )
    assert.deepEqual(
      vault.records.value.map((row) => row.batchLabel),
      [undefined, undefined]
    )

    await vault.editBatch('batch-1', '工作账号')
    assert.deepEqual(
      vault.records.value.map((row) => row.batchLabel),
      ['工作账号', '工作账号']
    )
    // Each key keeps its own label; only the group name is shared.
    assert.deepEqual(vault.records.value.map((row) => row.label).sort(), ['one', 'two'])
    assert.equal(vault.recent.value[0]!.label, '工作账号')

    const backup = await vault.backup()
    const restored = await vault.inspectBackup(backup, '')
    assert.deepEqual(
      restored.map((row) => row.batchLabel),
      ['工作账号', '工作账号']
    )

    // Renaming the same batch from the session list reaches the saved records.
    await vault.editRecent('batch-1', '私人账号')
    assert.deepEqual(
      vault.records.value.map((row) => row.batchLabel),
      ['私人账号', '私人账号']
    )
    await vault.erase()
  } finally {
    stop()
  }
})

test('a hand-arranged order and batch moves persist, survive a backup and let new saves lead', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    if (vault.exists.value) await vault.erase()
    await vault.enable()
    const base = { algorithm: 'SHA-1' as const, digits: 6 as const, period: 30, issuer: '' }
    await vault.save([{ ...base, secret: 'JBSWY3DPEHPK3PXP', label: 'single' }])
    await vault.save(
      [
        { ...base, secret: 'KRSXG5CTMVRXEZLU', label: 'one' },
        { ...base, secret: 'GEZDGNBVGY3TQOJQ', label: 'two' }
      ],
      'batch-1',
      true
    )
    await vault.editBatch('batch-1', 'Work')
    const id = (label: string) => vault.records.value.find((row) => row.label === label)!.id
    // The single record joins the batch, placed between its two members.
    await vault.arrange([
      { id: id('one'), batchId: 'batch-1', batchLabel: 'Work' },
      { id: id('single'), batchId: 'batch-1', batchLabel: 'Work' },
      { id: id('two'), batchId: 'batch-1', batchLabel: 'Work' }
    ])
    const order = () =>
      [...vault.records.value]
        .sort((a, b) => (b.position ?? b.usedAt) - (a.position ?? a.usedAt))
        .map((row) => `${row.label}@${row.batchId || ''}:${row.batchLabel || ''}`)
    assert.deepEqual(order(), ['one@batch-1:Work', 'single@batch-1:Work', 'two@batch-1:Work'])

    const restored = await vault.inspectBackup(await vault.backup(), '')
    assert.deepEqual(
      [...restored]
        .sort((a, b) => (b.position ?? b.usedAt) - (a.position ?? a.usedAt))
        .map((row) => row.label),
      ['one', 'single', 'two']
    )
    // A list that no longer matches the stored records is refused.
    await assert.rejects(() => vault.arrange([{ id: id('one') }]))

    await new Promise((resolve) => setTimeout(resolve, 5))
    await vault.save([{ ...base, secret: 'MFRGGZDFMZTWQ2LK', label: 'newest' }])
    assert.equal(order()[0], 'newest@:')
    await vault.erase()
  } finally {
    stop()
  }
})

test('a history entry of a retired code kind keeps the rest of history readable', async () => {
  const { vault, stop } = mount()
  try {
    await waitFor(() => vault.ready.value)
    if (vault.exists.value) await vault.erase()
    await vault.enable()
    const base = { algorithm: 'SHA-1', period: 30, label: '', issuer: '', note: '', usedAt: 0 }
    const backup = JSON.stringify({
      version: 2,
      protection: 'none',
      data: [
        { ...base, id: 'totp-entry', secret: 'JBSWY3DPEHPK3PXP', digits: 6 },
        // Saved by an older version of the site, with a kind it no longer generates.
        {
          ...base,
          id: 'retired-entry',
          secret: 'cnOgv/KdpLoP6Nbh0GMkXkPXALQ=',
          digits: 5,
          kind: 'legacy'
        }
      ]
    })
    const records = await vault.inspectBackup(backup, '')
    assert.deepEqual(
      records.map((record) => record.id),
      ['totp-entry', 'retired-entry']
    )
    // The secret is kept as saved so it can still be copied or backed up.
    assert.equal(records[1]!.secret, 'cnOgv/KdpLoP6Nbh0GMkXkPXALQ=')
    await vault.merge(records)
    assert.equal(vault.records.value.length, 2)
    await vault.erase()
  } finally {
    stop()
  }
})
