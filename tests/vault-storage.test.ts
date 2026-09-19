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
