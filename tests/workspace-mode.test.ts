import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const script = readFileSync(new URL('../public/workspace-mode.js', import.meta.url), 'utf8')
function visit(search: string, stored: Record<string, string>) {
  const data = new Map(Object.entries(stored))
  const attributes = new Set<string>()
  vm.runInNewContext(script, {
    URLSearchParams,
    location: { search },
    document: { documentElement: { setAttribute: (name: string) => void attributes.add(name) } },
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key)
    }
  })
  return { batch: attributes.has('data-workspace-mode'), stored: data.get('2fa-workspace-mode') }
}

test('the tab last used shows from the first paint', () => {
  assert.deepEqual(visit('', { '2fa-workspace-mode': 'batch' }), { batch: true, stored: 'batch' })
  assert.deepEqual(visit('', {}), { batch: false, stored: undefined })
})

test('an app shortcut picks the tab and keeps it as the last one used', () => {
  assert.deepEqual(visit('?shortcut=batch', {}), { batch: true, stored: 'batch' })
  assert.deepEqual(visit('?shortcut=single', { '2fa-workspace-mode': 'batch' }), {
    batch: false,
    stored: undefined
  })
  // Anything else leaves the choice alone.
  assert.deepEqual(visit('?shortcut=other', { '2fa-workspace-mode': 'batch' }), {
    batch: true,
    stored: 'batch'
  })
})
