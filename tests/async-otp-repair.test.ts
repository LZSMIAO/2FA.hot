import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, effectScope, shallowRef, watch } from 'vue'

function source(name: string) {
  return ts.transpileModule(
    readFileSync(new URL(`../app/composables/${name}.ts`, import.meta.url), 'utf8')
      .replace(/^import .*\n/gm, '')
      .replace(/export /g, '')
      .replaceAll('import.meta.client', 'true'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
  ).outputText
}
function setupOtp() {
  let time = 29999
  let tick: (at: number) => void = () => {}
  const requests: { at: number; resolve: (value: string) => void }[] = []
  const config = shallowRef({ secret: 'demo', period: 30 })
  const scope = effectScope()
  const context = vm.createContext({
    computed,
    shallowRef,
    watch,
    Date: { now: () => time },
    identity: () => 'demo',
    remainingSeconds: () => 1,
    generateOtp: (_: unknown, at: number) =>
      new Promise<string>((resolve) => requests.push({ at, resolve })),
    otpClock: {
      subscribe: (fn: typeof tick) => {
        tick = fn
        return () => {}
      }
    },
    onMounted: (fn: () => void) => fn(),
    onBeforeUnmount() {}
  })
  vm.runInContext(source('useOtp'), context)
  const state = scope.run(() => context.useOtp(config))!
  return {
    state,
    config,
    requests,
    scope,
    advance: (at: number) => {
      time = at
      tick(at)
    }
  }
}
test('copy crossing a clock tick regenerates the current code instead of reporting changed input', async () => {
  const s = setupOtp()
  const copying = s.state.current()
  s.advance(30001)
  s.requests[1]!.resolve('old')
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(s.requests[3]!.at, 30001)
  s.requests[3]!.resolve('new')
  assert.equal(await copying, 'new')
  assert.equal(s.state.code.value, 'new')
  s.scope.stop()
})
test('copy still rejects a real input change', async () => {
  const s = setupOtp()
  const copying = s.state.current()
  s.config.value = { secret: 'changed', period: 30 }
  s.requests[1]!.resolve('old')
  await assert.rejects(copying, /输入已变化/)
  s.scope.stop()
})
test('an older clipboard attempt cannot finish a newer reminder', async () => {
  const timers = new Map<number, () => void>()
  let id = 0
  const context = vm.createContext({
    shallowRef,
    useState: (_: string, init: () => boolean) => shallowRef(init()),
    nextTick: () => Promise.resolve(),
    requestAnimationFrame: (fn: () => void) => fn(),
    localStorage: { getItem: () => null, setItem() {} },
    setTimeout: (fn: () => void) => {
      timers.set(++id, fn)
      return id
    },
    clearTimeout: (key: number) => timers.delete(key),
    onBeforeUnmount() {}
  })
  vm.runInContext(source('useClipboardHint'), context)
  const hint = context.useClipboardHint()
  const old = await hint.start(),
    current = await hint.start()
  hint.finish(true, old)
  assert.equal(timers.size, 0)
  assert.equal(hint.visible.value, true)
  hint.finish(false, current)
  for (const timer of timers.values()) timer()
  assert.equal(hint.visible.value, false)
})
