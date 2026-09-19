import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, effectScope, shallowRef, watch } from 'vue'
import { selectionRange } from '../app/utils/selection-range.ts'

function setup() {
  const selected = shallowRef(['a', 'b'])
  const listeners = new Map<string, unknown>()
  let released = false
  let nextFrame: (() => void) | undefined
  let pageScroll = 0
  const scope = effectScope()
  const code = readFileSync(
    new URL('../app/composables/useHistorySelection.ts', import.meta.url),
    'utf8'
  )
    .replace(/^import .*\n/gm, '')
    .replace('export function', 'function')
  const context = vm.createContext({
    computed,
    shallowRef,
    watch,
    selectionRange,
    onBeforeUnmount() {},
    requestAnimationFrame: (callback: () => void) => {
      nextFrame = callback
      return 1
    },
    getComputedStyle: () => ({ overflowY: 'auto' }),
    cancelAnimationFrame() {},
    window: {
      innerHeight: 800,
      scrollBy: () => {
        pageScroll++
      },
      addEventListener: (name: string, handler: unknown) => listeners.set(name, handler),
      removeEventListener: (name: string) => listeners.delete(name)
    }
  })
  vm.runInContext(
    ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
    context
  )
  const state = scope.run(() => context.useHistorySelection(shallowRef(['a', 'b', 'c']), selected))!
  const target = {
    focus() {},
    setPointerCapture() {},
    hasPointerCapture: () => true,
    releasePointerCapture() {
      released = true
    }
  }
  return {
    selected,
    state,
    scope,
    listeners,
    target,
    released: () => released,
    runFrame: () => nextFrame?.(),
    pageScroll: () => pageScroll
  }
}
function escape(overrides = {}) {
  return {
    key: 'Escape',
    defaultPrevented: false,
    isComposing: false,
    stopped: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    stopPropagation() {
      this.stopped = true
    },
    ...overrides
  }
}
test('Escape clears selection and resets the Shift range anchor', () => {
  const s = setup()
  s.state.click({ detail: 0 }, 'a')
  const event = escape()
  s.state.cancelSelection(event)
  assert.equal(s.selected.value.length, 0)
  assert.equal(event.stopped, true)
  s.state.click({ detail: 0, shiftKey: true }, 'c')
  assert.deepEqual(Array.from(s.selected.value), ['c'])
  s.scope.stop()
})
test('Escape releases an active drag and removes its listeners', () => {
  const s = setup()
  s.state.start(
    { isPrimary: true, button: 0, pointerId: 1, currentTarget: s.target, preventDefault() {} },
    'c'
  )
  assert.ok(s.listeners.has('pointermove'))
  s.state.cancelSelection(escape())
  assert.equal(s.selected.value.length, 0)
  assert.equal(s.listeners.size, 0)
  assert.equal(s.released(), true)
  s.scope.stop()
})
test('consumed Escape, composing input and unrelated keys preserve selection', () => {
  const s = setup()
  for (const overrides of [{ defaultPrevented: true }, { isComposing: true }, { key: 'Enter' }]) {
    s.state.cancelSelection(escape(overrides))
    assert.deepEqual(s.selected.value, ['a', 'b'])
  }
  s.selected.value = []
  const event = escape()
  s.state.cancelSelection(event)
  assert.equal(event.defaultPrevented, false)
  s.scope.stop()
})

test('Escape removes checkbox focus without blurring text editors', () => {
  const s = setup()
  let blurred = false
  s.state.cancelSelection(
    escape({
      target: {
        matches: () => true,
        blur: () => {
          blurred = true
        }
      }
    })
  )
  assert.equal(blurred, true)
  s.selected.value = ['a']
  blurred = false
  s.state.cancelSelection(
    escape({
      target: {
        matches: () => false,
        blur: () => {
          blurred = true
        }
      }
    })
  )
  assert.equal(blurred, false)
  s.scope.stop()
})

test('dragging near a nested list edge scrolls that list instead of the page', () => {
  const s = setup()
  let delta = 0
  s.state.surface.value = {
    scrollHeight: 600,
    clientHeight: 200,
    parentElement: null,
    getBoundingClientRect: () => ({ left: 0, right: 300, top: 100, bottom: 300 }),
    scrollBy: (options: { top: number }) => {
      delta += options.top
    },
    querySelectorAll: () => []
  }
  s.state.start(
    {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 290,
      currentTarget: s.target,
      preventDefault() {}
    },
    'a'
  )
  s.runFrame()
  assert.ok(delta > 0)
  assert.equal(s.pageScroll(), 0)
  s.state.cancelSelection(escape())
  s.scope.stop()
})
