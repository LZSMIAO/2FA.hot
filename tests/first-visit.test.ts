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

test('the page is marked new for a browser first day here and returning after that', () => {
  const mark = (initial: Record<string, string>, storage = true) => {
    const data = new Map(Object.entries(initial))
    const localStorage = {
      getItem: (key: string) => {
        if (!storage) throw new Error('blocked')
        return data.get(key) ?? null
      },
      setItem: (key: string, value: string) => void data.set(key, String(value))
    }
    const store = new Proxy(localStorage, {
      ownKeys: () => [...data.keys()],
      getOwnPropertyDescriptor: (_, key) =>
        data.has(String(key)) ? { enumerable: true, configurable: true } : undefined
    })
    const documentElement = { dataset: {} as Record<string, string> }
    vm.runInNewContext(code, { localStorage: store, Date, document: { documentElement } })
    return documentElement.dataset.visitor
  }
  // Crawlers and first-time visitors keep no storage from earlier visits.
  assert.equal(mark({}), 'new')
  assert.equal(mark({}, false), 'new')
  assert.equal(mark({ '2fa-first-visit': String(Date.now() - 60_000) }), 'new')
  assert.equal(mark({ '2fa-first-visit': String(Date.now() - 2 * 864e5) }), 'returning')
  assert.equal(mark({ '2fa-first-visit': '0' }), 'returning')
  assert.equal(mark({ '2fa-hot-theme': 'dark' }), 'returning')
})
