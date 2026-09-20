import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { computed, effectScope, nextTick, shallowRef, watch } from 'vue'
import { selectionRange } from '../app/utils/selection-range.ts'

function setup(visible = ['a', 'b', 'c'], expand?: (unit: string) => string[]) {
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
  const ids = shallowRef(['a', 'b', 'c'])
  const rangeIds = shallowRef(visible)
  const state = scope.run(() => context.useHistorySelection(ids, selected, rangeIds, expand))!
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
    ids,
    rangeIds,
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

test('Shift range skips collapsed children while explicit select-all includes them', () => {
  const s = setup(['a', 'c'])
  s.selected.value = []
  s.state.click({ detail: 0 }, 'a')
  s.state.click({ detail: 0, shiftKey: true }, 'c')
  assert.deepEqual(Array.from(s.selected.value), ['a', 'c'])
  s.state.toggleAll()
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b', 'c'])
  s.scope.stop()
})

test('dragging below the list resolves to its last visible record', () => {
  const s = setup(['a', 'c'])
  s.selected.value = []
  s.state.surface.value = {
    getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 200 }),
    querySelectorAll: () =>
      ['a', 'c', 'b'].map((id) => ({
        dataset: { selectionId: id },
        getClientRects: () => (id === 'b' ? [] : [{}]),
        getBoundingClientRect: () => ({ bottom: id === 'a' ? 100 : 200 })
      }))
  }
  s.state.start(
    {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 300,
      currentTarget: s.target,
      preventDefault() {}
    },
    'a'
  )
  s.runFrame()
  assert.deepEqual(Array.from(s.selected.value), ['a', 'c'])
  s.state.cancelSelection(escape())
  s.scope.stop()
})

test('picking a visible row keeps rows selected inside a collapsed batch', () => {
  // 'a' sits in a collapsed batch, so it is selected but out of range.
  const s = setup(['b', 'c'])
  s.selected.value = ['a']
  s.state.click({ detail: 0 }, 'b')
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b'])
  s.state.click({ detail: 0 }, 'c')
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b', 'c'])
  s.state.click({ detail: 0 }, 'b')
  assert.deepEqual(Array.from(s.selected.value), ['a', 'c'])
  s.scope.stop()
})

test('a drag starting on a visible row leaves a collapsed batch selection intact', () => {
  const s = setup(['b', 'c'])
  s.selected.value = ['a']
  s.state.start(
    {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
      currentTarget: s.target,
      preventDefault() {}
    },
    'b'
  )
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b'])
  s.state.cancelSelection(escape())
  s.scope.stop()
})

test('dragging down the list keeps extending the selection', () => {
  const bottoms: Record<string, number> = { a: 100, b: 200, c: 300 }
  const s = setup(['a', 'b', 'c'])
  s.selected.value = []
  s.state.surface.value = {
    getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 300 }),
    querySelectorAll: () =>
      ['a', 'b', 'c'].map((id) => ({
        dataset: { selectionId: id },
        getClientRects: () => [{}],
        getBoundingClientRect: () => ({ bottom: bottoms[id] })
      }))
  }
  s.state.start(
    {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 50,
      currentTarget: s.target,
      preventDefault() {}
    },
    'a'
  )
  assert.deepEqual(Array.from(s.selected.value), ['a'])
  const move = s.listeners.get('pointermove') as (event: unknown) => void
  for (const [y, expected] of [
    [150, ['a', 'b']],
    [250, ['a', 'b', 'c']]
  ] as const) {
    move({
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
      clientX: 100,
      clientY: y,
      preventDefault() {}
    })
    assert.deepEqual(Array.from(s.selected.value), expected, `at y=${y}`)
  }
  s.state.cancelSelection(escape())
  s.scope.stop()
})

test('a re-rendered list does not interrupt a drag that is still going', async () => {
  const s = setup(['a', 'b', 'c'])
  s.selected.value = []
  s.state.start(
    {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
      currentTarget: s.target,
      preventDefault() {}
    },
    'a'
  )
  assert.ok(s.listeners.has('pointermove'))
  // A computed hands back a fresh array with the same contents on every pass.
  s.rangeIds.value = ['a', 'b', 'c']
  s.ids.value = ['a', 'b', 'c']
  await nextTick()
  assert.ok(s.listeners.has('pointermove'), 'drag survives an identical list')
  // Losing the row the drag started from does end it.
  s.rangeIds.value = ['b', 'c']
  await nextTick()
  assert.equal(s.listeners.has('pointermove'), false)
  s.scope.stop()
})

test('a range over a collapsed batch takes in every record it stands for', () => {
  // 'g' is one row standing in for records a and b; 'c' is an ordinary row.
  const s = setup(['g', 'c'], (unit) => (unit === 'g' ? ['a', 'b'] : [unit]))
  s.ids.value = ['a', 'b', 'c']
  s.selected.value = []
  s.state.click({ detail: 0 }, 'g')
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b'])
  s.state.click({ detail: 0, shiftKey: true }, 'c')
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b', 'c'])
  // Picking the batch again clears only the records it holds.
  s.state.click({ detail: 0 }, 'g')
  assert.deepEqual(Array.from(s.selected.value), ['c'])
  s.scope.stop()
})

test('a drag beginning on a collapsed batch selects through to the row it ends on', () => {
  const s = setup(['g', 'c'], (unit) => (unit === 'g' ? ['a', 'b'] : [unit]))
  s.ids.value = ['a', 'b', 'c']
  s.selected.value = []
  s.state.surface.value = {
    getBoundingClientRect: () => ({ left: 0, right: 300, top: 0, bottom: 200 }),
    querySelectorAll: () =>
      ['g', 'c'].map((id) => ({
        dataset: { selectionId: id },
        getClientRects: () => [{}],
        getBoundingClientRect: () => ({ bottom: id === 'g' ? 100 : 200 })
      }))
  }
  s.state.start(
    {
      isPrimary: true,
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 50,
      currentTarget: s.target,
      preventDefault() {}
    },
    'g'
  )
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b'])
  const move = s.listeners.get('pointermove') as (event: unknown) => void
  move({
    pointerId: 1,
    pointerType: 'mouse',
    buttons: 1,
    clientX: 100,
    clientY: 150,
    preventDefault() {}
  })
  assert.deepEqual(Array.from(s.selected.value), ['a', 'b', 'c'])
  s.state.cancelSelection(escape())
  s.scope.stop()
})
