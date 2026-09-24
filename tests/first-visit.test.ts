import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../public/first-visit.js', import.meta.url), 'utf8')
function run(initial: Record<string, string>) {
  const data = new Map(Object.entries(initial))
  const localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value))
  }
  const store = new Proxy(localStorage, {
    ownKeys: () => [...data.keys()],
    getOwnPropertyDescriptor: (_, key) =>
      data.has(String(key)) ? { enumerable: true, configurable: true } : undefined
  })
  vm.runInNewContext(code, { localStorage: store, Date })
  return data.get('2fa-first-visit')
}

test('a browser with no settings yet is new; one with earlier settings is returning', () => {
  const before = Date.now()
  const fresh = Number(run({}))
  assert.ok(fresh >= before && fresh <= Date.now())
  assert.equal(run({ '2fa-hot-theme': 'dark' }), '0')
  // Once noted, later visits keep the first answer.
  assert.equal(
    run({ '2fa-first-visit': '1700000000000', '2fa-hot-theme': 'dark' }),
    '1700000000000'
  )
})
