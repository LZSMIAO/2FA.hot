import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
const code = readFileSync(new URL('../public/brand-splash.js', import.meta.url), 'utf8')
const key = '2fa-brand-splash-visit-v2'
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v)
  }
}
function browser() {
  const localStorage = storage()
  const held: { name: string }[] = []
  let queue = Promise.resolve()
  let id = 0
  const locks = {
    query: async () => ({ held }),
    request(name: string, options: any, callback?: any) {
      const run = async () => {
        const entry = { name }
        held.push(entry)
        try {
          await (callback || options)()
        } finally {
          held.splice(held.indexOf(entry), 1)
        }
      }
      if (callback) return run()
      queue = queue.then(run)
      return queue
    }
  }
  function open(sessionStorage = storage()) {
    const events: Record<string, Function> = {}
    const root = { dataset: {} as Record<string, string>, style: { setProperty() {} } }
    vm.runInNewContext(code, {
      localStorage,
      sessionStorage,
      navigator: { locks },
      crypto: { randomUUID: () => String(++id) },
      document: { documentElement: root },
      window: {
        localStorage,
        sessionStorage,
        addEventListener: (name: string, cb: Function) => (events[name] = cb)
      }
    })
    return {
      sessionStorage,
      root,
      close: () => events.pagehide(),
      restore: () => events.pageshow({ persisted: true })
    }
  }
  return { open, settle: () => queue, text: () => JSON.parse(localStorage.getItem(key)!).text }
}
test('first visit is Hot; tabs and reloads share it; subsequent visits alternate message and Hot', async () => {
  const b = browser()
  const first = b.open()
  await b.settle()
  assert.equal(b.text(), '.hot')
  const second = b.open()
  await b.settle()
  first.close()
  const reload = b.open(first.sessionStorage)
  await b.settle()
  assert.equal(b.text(), '.hot')
  second.close()
  reload.close()
  const next = b.open()
  await b.settle()
  assert.notEqual(b.text(), '.hot')
  const message = b.text()
  next.close()
  const refreshed = b.open(next.sessionStorage)
  await b.settle()
  assert.equal(b.text(), message)
  refreshed.close()
  const third = b.open()
  await b.settle()
  assert.equal(b.text(), '.hot')
  third.close()
  const fourth = b.open()
  await b.settle()
  assert.notEqual(b.text(), '.hot')
  fourth.close()
})
test('simultaneous new tabs do not advance the visit twice', async () => {
  const b = browser()
  const first = b.open()
  await b.settle()
  first.close()
  const a = b.open(),
    c = b.open()
  await b.settle()
  assert.equal(a.root.dataset.brandSplash, 'message')
  assert.equal(c.root.dataset.brandSplash, 'message')
  assert.equal(a.sessionStorage.getItem(key), c.sessionStorage.getItem(key))
  a.close()
  c.close()
})
