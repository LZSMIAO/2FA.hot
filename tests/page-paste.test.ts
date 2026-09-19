import test from 'node:test'
import assert from 'node:assert/strict'
import { usePagePaste } from '../app/composables/usePagePaste.ts'
import { clipboardText, transferText } from '../app/utils/transfer-text.ts'

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
    image: (file) => images.push(file)
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
