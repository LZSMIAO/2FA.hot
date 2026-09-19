import assert from 'node:assert/strict'
import test from 'node:test'
import { effectScope } from 'vue'
import { useBackupImport } from '../app/composables/useBackupImport.ts'
import type { VaultRecord } from '../app/composables/useVault.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (cause: Error) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
const record = { id: 'test', label: 'test' } as VaultRecord
function setup(inspect: (text: string, password: string) => Promise<VaultRecord[]>) {
  const scope = effectScope()
  const merges: VaultRecord[][] = []
  const state = scope.run(() =>
    useBackupImport({
      active: () => true,
      inspect,
      merge: async (rows) => {
        merges.push(rows)
      }
    })
  )!
  return { scope, state, merges }
}
test('cancelled decryptions cannot resurrect previews or overwrite a new operation', async () => {
  const old = deferred<VaultRecord[]>(),
    latest = deferred<VaultRecord[]>()
  let calls = 0
  const { scope, state } = setup(() => (++calls === 1 ? old.promise : latest.promise))
  state.text.value = 'old'
  const first = state.inspect()
  state.reset() // close/lock/pagehide synchronously invalidates the session
  state.text.value = 'new'
  state.password.value = 'new password'
  const second = state.inspect()
  old.reject(new Error('stale password failure'))
  await first
  assert.equal(state.inspecting.value, true)
  assert.equal(state.error.value, '')
  assert.equal(state.password.value, 'new password')
  latest.resolve([record])
  await second
  assert.deepEqual(state.records.value, [record])
  assert.equal(state.password.value, '')
  scope.stop()
})
test('file replacement immediately invalidates previews and ignores old reads/decryptions', async () => {
  const oldRead = deferred<string>(),
    decrypt = deferred<VaultRecord[]>()
  const { scope, state, merges } = setup(() => decrypt.promise)
  const readA = state.read({ size: 10, text: () => oldRead.promise })
  await state.read({ size: 10, text: async () => 'B' })
  oldRead.resolve('A')
  await readA
  assert.equal(state.text.value, 'B')
  const inspecting = state.inspect()
  await state.read({ size: 10, text: async () => 'C' })
  decrypt.resolve([record])
  await inspecting
  assert.equal(state.records.value, null)
  assert.equal(await state.merge(), false)
  assert.deepEqual(merges, [])
  state.records.value = [record]
  await state.read({ size: 10_000_001, text: async () => 'oversized' })
  assert.equal(state.text.value, '')
  assert.equal(state.records.value, null)
  assert.equal(state.error.value, '备份不能超过 10MB。')
  scope.stop()
})
test('unmount and reset discard pending read and successful decrypted result', async () => {
  const value = deferred<VaultRecord[]>(),
    read = deferred<string>()
  const { scope, state } = setup(() => value.promise)
  state.text.value = 'backup'
  const inspecting = state.inspect()
  state.reset()
  value.resolve([record])
  await inspecting
  assert.equal(state.records.value, null)
  const reading = state.read({ size: 10, text: () => read.promise })
  scope.stop()
  read.resolve('late')
  await reading
  assert.equal(state.text.value, '')
})
test('current errors allow retry, empty and valid previews can merge', async () => {
  const { scope, state, merges } = setup(async (_, password) => {
    if (password !== 'correct') throw new Error('wrong password')
    return []
  })
  await state.read({ size: 10, text: async () => 'backup' })
  await state.inspect()
  assert.equal(state.error.value, 'wrong password')
  state.password.value = 'correct'
  await state.inspect()
  assert.deepEqual(state.records.value, [])
  assert.equal(await state.merge(), true)
  assert.deepEqual(merges, [[]])
  await state.read({
    size: 10,
    text: async () => {
      throw new Error('read failed')
    }
  })
  assert.equal(state.error.value, '无法完成操作，请重试。')
  assert.equal(state.reading.value, false)
  scope.stop()
})
test('stale merge completion cannot close a newer import session', async () => {
  const done = deferred<void>()
  const scope = effectScope()
  const state = scope.run(() =>
    useBackupImport({
      active: () => true,
      inspect: async () => [record],
      merge: () => done.promise
    })
  )!
  state.text.value = 'old'
  await state.inspect()
  const pending = state.merge()
  state.reset()
  state.text.value = 'new'
  done.resolve()
  assert.equal(await pending, false)
  assert.equal(state.text.value, 'new')
  scope.stop()
})
