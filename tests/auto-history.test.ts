import test from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, nextTick, shallowRef, watch } from 'vue'
import { useAutoHistory } from '../app/composables/useAutoHistory.ts'

test('browsing history cancels pending writes and never records previews, including after remount', async () => {
  const preview = shallowRef(false),
    input = shallowRef<any[]>([{ secret: 'draft' }])
  const enabled = shallowRef(true),
    unlocked = shallowRef(true),
    busy = shallowRef(false)
  const recent: any[] = [],
    saved: any[] = []
  Object.assign(globalThis, {
    shallowRef,
    watch,
    useVault: () => ({
      enabled,
      unlocked,
      busy,
      recentVersion: shallowRef(0),
      remember: (rows: any[]) => recent.push(...rows),
      save: async (rows: any[]) => {
        saved.push(...rows)
      }
    })
  })
  let scope = effectScope()
  const mount = () =>
    scope.run(() =>
      useAutoHistory(
        () => input.value,
        () => !preview.value
      )
    )
  const settle = () => new Promise((resolve) => setTimeout(resolve, 900))
  mount()
  preview.value = true
  input.value = [{ secret: 'older' }]
  await nextTick()
  await settle()
  input.value = [{ secret: 'newer' }]
  enabled.value = false
  await nextTick()
  enabled.value = true
  await nextTick()
  scope.stop()
  scope = effectScope()
  mount()
  await settle()
  assert.deepEqual(recent, [])
  assert.deepEqual(saved, [])
  // Editing a preview is a new input and should still be recorded normally.
  preview.value = false
  input.value = [{ secret: 'edited' }]
  await nextTick()
  await settle()
  assert.deepEqual(recent, [{ secret: 'edited' }])
  assert.deepEqual(saved, [{ secret: 'edited' }])
  // A save waiting on another vault operation must also be cancelled on browsing.
  busy.value = true
  input.value = [{ secret: 'queued' }]
  await nextTick()
  await settle()
  preview.value = true
  await nextTick()
  busy.value = false
  await new Promise((resolve) => setTimeout(resolve, 150))
  assert.deepEqual(saved, [{ secret: 'edited' }])
  scope.stop()
})

test('auto history waits for settled input, requires enable/unlock, and cancels pending writes', async () => {
  const enabled = shallowRef(false),
    unlocked = shallowRef(true)
  const input = shallowRef<any[]>([])
  const saved: any[] = []
  const recent: any[] = []
  Object.assign(globalThis, {
    shallowRef,
    watch,
    useVault: () => ({
      enabled,
      unlocked,
      busy: shallowRef(false),
      recentVersion: shallowRef(0),
      remember: (rows: any[]) => recent.push(rows),
      save: async (rows: any[]) => {
        saved.push(rows)
      }
    })
  })
  const scope = effectScope()
  scope.run(() => useAutoHistory(() => input.value))
  const settle = () => new Promise((resolve) => setTimeout(resolve, 850))
  input.value = [{ secret: 'first' }]
  await nextTick()
  await settle()
  assert.equal(saved.length, 0)
  assert.deepEqual(recent, [[{ secret: 'first' }]])
  enabled.value = true
  await nextTick()
  input.value = [{ secret: 'final' }]
  await nextTick()
  await settle()
  assert.deepEqual(saved, [[{ secret: 'final' }]])
  input.value = [{ secret: 'cancelled' }]
  await nextTick()
  unlocked.value = false
  await nextTick()
  await settle()
  assert.equal(saved.length, 1)
  unlocked.value = true
  await nextTick()
  scope.stop()
  await settle()
  assert.equal(saved.length, 1)
})

test('concurrent workspaces wait for the vault and cancel queued saves on lock', async () => {
  const enabled = shallowRef(true),
    unlocked = shallowRef(true),
    busy = shallowRef(false)
  const saved: string[] = []
  const vault = {
    enabled,
    unlocked,
    busy,
    recentVersion: shallowRef(0),
    remember: () => {},
    save: async (rows: any[]) => {
      assert.equal(busy.value, false)
      busy.value = true
      await new Promise((resolve) => setTimeout(resolve, 80))
      saved.push(rows[0].secret)
      busy.value = false
    }
  }
  Object.assign(globalThis, { shallowRef, watch, useVault: () => vault })
  const scope = effectScope()
  let errors: any[] = []
  scope.run(() => {
    errors = [
      useAutoHistory(() => [{ secret: 'single' }] as any),
      useAutoHistory(() => [{ secret: 'batch' }] as any)
    ]
  })
  await new Promise((resolve) => setTimeout(resolve, 1100))
  assert.deepEqual(saved.sort(), ['batch', 'single'])
  assert.deepEqual(
    errors.map((error) => error.value),
    ['', '']
  )
  scope.stop()
  busy.value = true
  const queued = effectScope()
  queued.run(() => useAutoHistory(() => [{ secret: 'cancelled' }] as any))
  await new Promise((resolve) => setTimeout(resolve, 850))
  unlocked.value = false
  await nextTick()
  busy.value = false
  await new Promise((resolve) => setTimeout(resolve, 150))
  assert.equal(saved.length, 2)
  queued.stop()
})

test('clearing recent history cancels an already scheduled entry', async () => {
  const recentVersion = shallowRef(0),
    rows: any[] = []
  const vault = {
    recentVersion,
    enabled: shallowRef(false),
    unlocked: shallowRef(false),
    remember: (values: any[]) => rows.push(...values)
  }
  Object.assign(globalThis, { shallowRef, watch, useVault: () => vault })
  const scope = effectScope()
  scope.run(() => useAutoHistory(() => [{ secret: 'example' }] as any))
  recentVersion.value++
  await new Promise((resolve) => setTimeout(resolve, 850))
  assert.deepEqual(rows, [])
  scope.stop()
})
