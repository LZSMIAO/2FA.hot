import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { shallowRef } from 'vue'
import { useImageDrop } from '../app/composables/useImageDrop.ts'

class DropNode {
  readonly parent?: DropNode
  constructor(parent?: DropNode) {
    this.parent = parent
  }
  contains(node: DropNode): boolean {
    return node === this || (!!node.parent && this.contains(node.parent))
  }
}

function setup(t: TestContext, images?: (files: File[]) => void) {
  const document = new EventTarget()
  const cleanup: Array<() => void> = []
  const globals = {
    document,
    Node: DropNode,
    shallowRef,
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
  const target = new DropNode()
  const child = new DropNode(target)
  const outside = new DropNode()
  const imported: File[] = []
  const errors: string[] = []
  let opened = 0,
    rejected = 0
  const handler = useImageDrop({
    enabled: () => true,
    images,
    target: () => target as unknown as HTMLElement,
    enter: () => {
      opened++
    },
    outside: () => {
      rejected++
    },
    image: (file) => {
      imported.push(file)
    },
    issue: (message) => errors.push(message)
  })
  function dispatch(type: string, node: DropNode, data: Partial<DataTransfer>) {
    const event = new Event(type, { cancelable: true })
    Object.defineProperties(event, {
      target: { value: node },
      dataTransfer: { value: data }
    })
    document.dispatchEvent(event)
    return event
  }
  return {
    handler,
    target,
    child,
    outside,
    imported,
    errors,
    dispatch,
    opened: () => opened,
    rejected: () => rejected
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))
const fileDrop = () => ({
  types: ['Files'],
  files: [new File(['public test image'], 'qr.png', { type: 'image/png' })] as unknown as FileList,
  getData: () => ''
})

test('dropping outside the frame cannot import, while dropping on a child of the frame can', async (t) => {
  const context = setup(t)
  const event = context.dispatch('drop', context.outside, fileDrop())
  await tick()
  assert.equal(event.defaultPrevented, true)
  assert.equal(context.rejected(), 1)
  assert.equal(context.imported.length, 0)
  context.dispatch('drop', context.child, fileDrop())
  await tick()
  assert.equal(context.imported.length, 1)
  assert.deepEqual(context.errors, [])
})

test('dragging rich text neither opens the image dialog nor consumes the input drop', (t) => {
  const context = setup(t)
  const data = {
    types: ['text/plain', 'text/html'],
    files: [] as unknown as FileList,
    getData: (type: string) =>
      type === 'text/html' ? '<b>GEZDGNBVGY3TQOJQ</b>' : 'GEZDGNBVGY3TQOJQ'
  }
  for (const type of ['dragenter', 'dragover', 'drop']) {
    assert.equal(context.dispatch(type, context.child, data).defaultPrevented, false)
  }
  assert.equal(context.opened(), 0)
  assert.equal(context.imported.length, 0)
})

test('ending a drag before dropping cancels the auto-opened dialog without importing', (t) => {
  const context = setup(t)
  context.dispatch('dragenter', context.outside, fileDrop())
  assert.equal(context.opened(), 1)
  context.dispatch('dragend', context.outside, fileDrop())
  assert.equal(context.rejected(), 1)
  assert.equal(context.handler.dragging.value, false)
  assert.equal(context.imported.length, 0)
})

test('leaving the browser cancels the auto-opened dialog even without a dragend event', (t) => {
  const c = setup(t)
  c.dispatch('dragenter', c.outside, fileDrop())
  c.dispatch('dragleave', c.outside, fileDrop())
  assert.equal(c.handler.dragging.value, false)
  assert.equal(c.rejected(), 1)
  c.dispatch('dragend', c.outside, fileDrop())
  assert.equal(c.rejected(), 1)
  assert.equal(c.imported.length, 0)
})

test('moving between nested drop-zone elements keeps the drag dialog open', (t) => {
  const c = setup(t)
  c.dispatch('dragenter', c.target, fileDrop())
  c.dispatch('dragenter', c.child, fileDrop())
  c.dispatch('dragleave', c.target, fileDrop())
  assert.equal(c.handler.dragging.value, true)
  assert.equal(c.opened(), 1)
  assert.equal(c.rejected(), 0)
  c.dispatch('drop', c.child, fileDrop())
  assert.equal(c.imported.length, 1)
})

test('cancelled reads cannot import or reset the loading state of a newer drop', async (t) => {
  const context = setup(t)
  const pending: Array<(response: Response) => void> = []
  t.mock.method(
    globalThis,
    'fetch',
    () => new Promise<Response>((resolve) => pending.push(resolve))
  )
  const remote = {
    types: ['Files'],
    files: [] as unknown as FileList,
    getData: (type: string) => (type === 'text/uri-list' ? 'https://example.com/qr.png' : '')
  }
  context.dispatch('drop', context.child, remote)
  assert.equal(context.handler.loading.value, true)
  context.handler.cancel()
  assert.equal(context.handler.loading.value, false)
  context.dispatch('drop', context.child, remote)
  pending[0]!(new Response('old image', { headers: { 'content-type': 'image/png' } }))
  await tick()
  assert.equal(context.imported.length, 0)
  assert.equal(context.handler.loading.value, true)
  pending[1]!(new Response('new image', { headers: { 'content-type': 'image/png' } }))
  await tick()
  assert.equal(context.imported.length, 1)
  assert.equal(context.handler.loading.value, false)
  assert.deepEqual(context.errors, [])
})

test('a multi-file drop delivers every file once and does not import outside the frame', async (t) => {
  const batches: File[][] = []
  const c = setup(t, (files) => {
    batches.push(files)
  })
  const files = [
    new File(['one'], 'one.png', { type: 'image/png' }),
    new File(['two'], 'two.png', { type: 'image/png' })
  ]
  const data = { types: ['Files'], files: files as unknown as FileList, getData: () => '' }
  c.dispatch('drop', c.outside, data)
  await tick()
  assert.equal(batches.length, 0)
  c.dispatch('drop', c.child, data)
  await tick()
  assert.deepEqual(batches, [files])
  assert.equal(c.imported.length, 0)
})
