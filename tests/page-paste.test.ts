import test from 'node:test'
import assert from 'node:assert/strict'
import { usePagePaste } from '../app/composables/usePagePaste.ts'
import { clipboardText, pastedImages, transferText } from '../app/utils/transfer-text.ts'

test('native Excel paste chooses cells over its PNG representation; image-only still imports', (t) => {
  const doc = Object.assign(new EventTarget(), { querySelector: () => null })
  const cleanup: Array<() => void> = []
  class Element {
    closest() {
      return null
    }
  }
  const globals = {
    document: doc,
    HTMLElement: Element,
    onMounted: (fn: () => void) => fn(),
    onBeforeUnmount: (fn: () => void) => cleanup.push(fn)
  }
  const descriptors = Object.getOwnPropertyDescriptors(globalThis)
  Object.assign(globalThis, globals)
  t.after(() => {
    cleanup.forEach((fn) => fn())
    for (const key of Object.keys(globals)) {
      if (descriptors[key]) Object.defineProperty(globalThis, key, descriptors[key]!)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  const texts: string[] = [],
    images: File[] = []
  usePagePaste({
    enabled: () => true,
    input: () => undefined,
    text: (value) => texts.push(value),
    images: (files) => images.push(...files)
  })
  const image = new File(['bitmap'], 'image.png', { type: 'image/png' })
  function paste(text: string) {
    const event = new Event('paste', { cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (type: string) => (type === 'text/plain' ? text : ''),
        items: [{ kind: 'file', type: image.type, getAsFile: () => image }]
      }
    })
    doc.dispatchEvent(event)
    return event
  }
  assert.equal(
    paste('account\tJBSWY3DPEHPK3PXP\r\nsecond\tGEZDGNBVGY3TQOJQ').defaultPrevented,
    true
  )
  assert.equal(texts.length, 1)
  assert.equal(images.length, 0)
  paste('invalid cells are still text')
  assert.equal(texts.length, 2)
  assert.equal(images.length, 0)
  paste('')
  assert.equal(images[0], image)
})

test('clipboard button searches text across all items before any image decoding', async () => {
  const item = (types: string[], value: string) =>
    ({
      types,
      getType: async (type: string) => {
        assert.equal(type, 'text/plain')
        return new Blob([value], { type })
      }
    }) as ClipboardItem
  assert.equal(
    await clipboardText([item(['image/png'], ''), item(['text/plain', 'image/png'], 'a\tb\nc\td')]),
    'a\tb\nc\td'
  )
  assert.equal(
    transferText({
      getData: (type) => (type === 'text/plain' ? 'a\tb' : '<table>ignored</table>')
    }),
    'a\tb'
  )
})

test('copied image files paste as images, not as their file names', () => {
  const file = (name: string, type: string) => new File(['x'], name, { type })
  const clip = (text: string, ...files: File[]) => ({
    getData: (type: string) => (type === 'text/plain' ? text : ''),
    items: files.map((value) => ({ kind: 'file', type: value.type, getAsFile: () => value }))
  })
  const a = file('qr-a.png', 'image/png'),
    b = file('qr-b.jpg', 'image/jpeg'),
    pdf = file('notes.pdf', 'application/pdf')
  // Screenshots and browser image copies carry no text.
  assert.deepEqual(pastedImages(clip('', a)), [a])
  // Finder and Explorer copies name every file, one per line.
  assert.deepEqual(pastedImages(clip('qr-a.png\rqr-b.jpg', a, b)), [a, b])
  assert.deepEqual(pastedImages(clip('C:\\Users\\me\\qr-a.png\r\nqr-b.jpg\n', a, b)), [a, b])
  // Only the images of a mixed selection are recognised.
  assert.deepEqual(pastedImages(clip('qr-a.png\nnotes.pdf', a, pdf)), [a])
  // Office cells beside a rendered picture remain text.
  assert.deepEqual(
    pastedImages(clip('account\tJBSWY3DPEHPK3PXP', file('image.png', 'image/png'))),
    []
  )
  assert.deepEqual(pastedImages(clip('qr-a.png and a note', a)), [])
  assert.deepEqual(pastedImages(clip('notes.pdf', pdf)), [])
})
