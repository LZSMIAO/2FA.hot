import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { usePageTextDrop } from '../app/composables/usePageTextDrop.ts'

class DropElement {
  editor: DropElement | null = null
  children: DropElement[] = []
  focused = false
  contains(element: DropElement): boolean {
    return element === this || this.children.some((child) => child.contains(element))
  }
  closest() {
    return this.editor
  }
  focus() {
    this.focused = true
  }
}

function setup(t: TestContext) {
  const state = { enabled: true, dialog: false }
  const document = Object.assign(new EventTarget(), {
    querySelector: () => (state.dialog ? {} : null)
  })
  const cleanup: Array<() => void> = []
  const globals = {
    document,
    Element: DropElement,
    onMounted: (fn: () => void) => fn(),
    onBeforeUnmount: (fn: () => void) => cleanup.push(fn)
  }
  const previous = Object.getOwnPropertyDescriptors(globalThis)
  Object.assign(globalThis, globals)
  t.after(() => {
    cleanup.forEach((fn) => fn())
    for (const key of Object.keys(globals)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]!)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  const input = new DropElement()
  input.editor = input
  const field = new DropElement()
  const hint = new DropElement()
  field.children = [input, hint]
  const page = new DropElement()
  const received: string[] = []
  const { dragging } = usePageTextDrop({
    enabled: () => state.enabled,
    input: () => input as unknown as HTMLInputElement,
    target: () => field as unknown as HTMLElement,
    text: (value) => received.push(value)
  })
  function dispatch(type: string, target = page, data = textData(), prevented = false) {
    const event = new Event(type, { cancelable: true })
    Object.defineProperties(event, { target: { value: target }, dataTransfer: { value: data } })
    if (prevented) event.preventDefault()
    document.dispatchEvent(event)
    return event
  }
  return { state, input, field, hint, page, received, dispatch, cleanup, dragging }
}

function textData(text = 'GEZDGNBVGY3TQOJQ') {
  return {
    types: ['text/plain', 'text/html'],
    files: [] as File[],
    dropEffect: 'none',
    getData: (type: string) => (type === 'text/plain' ? text : `<b>${text}</b>`)
  }
}

test('text dropped within the highlighted field is received once and focuses the input', (t) => {
  const c = setup(t)
  for (const [index, target] of [c.field, c.input, c.hint].entries()) {
    const data = textData()
    assert.equal(c.dispatch('dragover', target, data).defaultPrevented, true)
    assert.equal(data.dropEffect, 'copy')
    assert.equal(c.dragging.value, true)
    assert.equal(c.received.length, index)
    assert.equal(c.dispatch('drop', target, data).defaultPrevented, true)
    assert.equal(c.dragging.value, false)
  }
  assert.deepEqual(c.received, Array(3).fill('GEZDGNBVGY3TQOJQ'))
  assert.equal(c.input.focused, true)
})

test('releasing text outside the highlighted field never fills or focuses the input', (t) => {
  const c = setup(t)
  const data = textData()
  c.dispatch('dragover', c.input, data)
  assert.equal(data.dropEffect, 'copy')
  c.dispatch('dragover', c.page, data)
  assert.equal(c.dragging.value, true)
  assert.equal(data.dropEffect, 'none')
  assert.equal(c.dispatch('drop', c.page, data).defaultPrevented, true)
  assert.equal(c.dragging.value, false)
  assert.deepEqual(c.received, [])
  assert.equal(c.input.focused, false)
  // Also reject drops that did not first pass through the input.
  c.dispatch('drop', c.page, textData('ANOTHER_SECRET'))
  assert.deepEqual(c.received, [])
})

test('other editors, dialogs and inactive workspaces keep their own text handling', (t) => {
  const c = setup(t)
  const other = new DropElement()
  other.editor = other
  assert.equal(c.dispatch('drop', other).defaultPrevented, false)
  c.state.dialog = true
  assert.equal(c.dispatch('drop', c.input).defaultPrevented, false)
  c.state.dialog = false
  c.state.enabled = false
  assert.equal(c.dispatch('drop').defaultPrevented, false)
  assert.deepEqual(c.received, [])
})

test('files, empty text and previously handled drops do not replace the secret', (t) => {
  const c = setup(t)
  const file = textData()
  file.types.push('Files')
  file.files.push(new File(['qr'], 'qr.png', { type: 'image/png' }))
  assert.equal(c.dispatch('drop', c.input, file).defaultPrevented, false)
  assert.equal(c.dispatch('drop', c.input, textData('  ')).defaultPrevented, true)
  c.dispatch('drop', c.input, textData(), true)
  assert.deepEqual(c.received, [])
})

test('unmount removes page drag handlers', (t) => {
  const c = setup(t)
  c.cleanup.forEach((fn) => fn())
  assert.equal(c.dispatch('dragover').defaultPrevented, false)
  c.dispatch('drop')
  assert.deepEqual(c.received, [])
})

test('text highlight clears when leaving the page, cancelling, or moving over another editor', (t) => {
  const c = setup(t)
  for (const type of ['dragleave', 'dragend']) {
    c.dispatch('dragenter')
    assert.equal(c.dragging.value, true)
    c.dispatch(type)
    assert.equal(c.dragging.value, false)
  }
  c.dispatch('dragover')
  const other = new DropElement()
  other.editor = other
  c.dispatch('dragover', other)
  assert.equal(c.dragging.value, false)
  assert.deepEqual(c.received, [])
})
