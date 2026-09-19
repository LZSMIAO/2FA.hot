import { test } from 'node:test'
import assert from 'node:assert/strict'
import { droppedImageUrl, hasImageDrop, readDroppedImage } from '../app/utils/dropped-image.ts'

test('rich text and links do not open the image importer merely because of their MIME types', () => {
  assert.equal(hasImageDrop({ types: ['Files'] }), true)
  for (const types of [
    ['text/plain'],
    ['text/html'],
    ['text/uri-list'],
    ['text/plain', 'text/html']
  ])
    assert.equal(hasImageDrop({ types }), false)
  assert.equal(
    hasImageDrop({
      types: ['Files'],
      files: [new File(['x'], 'text.txt', { type: 'text/plain' })] as unknown as FileList
    }),
    false
  )
  assert.equal(
    hasImageDrop({
      types: ['Files'],
      files: [new File(['x'], 'qr.png', { type: 'image/png' })] as unknown as FileList
    }),
    true
  )
})

test('URI lists skip comments and reject executable or local-file URLs', () => {
  assert.equal(
    droppedImageUrl('# image\r\nhttps://example.com/qr.png\r\n'),
    'https://example.com/qr.png'
  )
  for (const uri of [
    'javascript:alert(1)',
    'file:///private/test.png',
    'blob:https://example.com/1',
    '/relative.png'
  ])
    assert.equal(droppedImageUrl(uri), null)
})

test('desktop file drops retain the original file without making a network request', async () => {
  const image = new File(['test'], 'qr.png', { type: 'image/png' })
  const data = { files: [image], getData: () => '' } as unknown as DataTransfer
  assert.equal(await readDroppedImage(data, new AbortController().signal), image)
})

test('reads browser image URLs locally without cookies or referrer and preserves image bytes', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    assert.equal(options.credentials, 'omit')
    assert.equal(options.referrerPolicy, 'no-referrer')
    assert.ok(options.signal)
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } })
  })
  const data = {
    files: [],
    getData: (type: string) => (type === 'text/uri-list' ? 'https://example.com/qr.png' : '')
  } as unknown as DataTransfer
  const file = await readDroppedImage(data, new AbortController().signal)
  assert.equal(file.type, 'image/png')
  assert.equal(file.size, 3)
})

test('rejects non-image pages, oversized remote images and blocked cross-origin requests', async (t) => {
  const data = { files: [], getData: () => 'https://example.com/qr.png' } as unknown as DataTransfer
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('page', { headers: { 'content-type': 'text/html' } })
  )
  await assert.rejects(readDroppedImage(data, new AbortController().signal))
  fetchMock.mock.mockImplementation(
    async () =>
      new Response(new Uint8Array(10_000_001), { headers: { 'content-type': 'image/png' } })
  )
  await assert.rejects(readDroppedImage(data, new AbortController().signal), /10MB/)
  fetchMock.mock.mockImplementation(async () => {
    throw new TypeError('Failed to fetch')
  })
  await assert.rejects(readDroppedImage(data, new AbortController().signal))
})
