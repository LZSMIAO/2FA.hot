const maxBytes = 10_000_000
const imageTypes = ['image/png', 'image/jpeg', 'image/webp']

export function hasImageDrop(
  data: Pick<DataTransfer, 'types'> & Partial<Pick<DataTransfer, 'items' | 'files' | 'getData'>>
) {
  const types = Array.from(data.types)
  // Spreadsheet drags may include a rendered image alongside their text.
  if (types.includes('text/plain') && !types.includes('text/uri-list')) return false
  const files = Array.from(data.files || [])
  if (files.length) return files.some((file) => file.type.startsWith('image/'))
  const items = Array.from(data.items || []).filter((item) => item.kind === 'file')
  if (items.length) return items.some((item) => !item.type || item.type.startsWith('image/'))
  if (Array.from(data.types).includes('Files')) return true
  // Rich text and links share these MIME types with browser images. Only an
  // actual image element is evidence of an image; protected drag data is empty.
  const html = data.getData?.('text/html') || ''
  return (
    !!html &&
    typeof DOMParser !== 'undefined' &&
    !!new DOMParser().parseFromString(html, 'text/html').querySelector('img[src]')
  )
}

export function droppedImageUrl(uriList: string, html = '') {
  const uri = uriList
    .split(/\r?\n/)
    .find((line) => line.trim() && !line.startsWith('#'))
    ?.trim()
  // Browser image drags may include a wrapping link; prefer the image itself.
  const src =
    html && typeof DOMParser !== 'undefined'
      ? new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src')
      : null
  const value = src || uri
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ||
      /^data:image\/(png|jpeg|webp);base64,/i.test(value)
      ? url.href
      : null
  } catch {
    return null
  }
}

export async function readDroppedImage(data: DataTransfer, signal: AbortSignal): Promise<File> {
  const file =
    Array.from(data.files).find((file) => file.type.startsWith('image/')) || data.files[0]
  if (file) return file
  const url = droppedImageUrl(data.getData('text/uri-list'), data.getData('text/html'))
  if (!url) throw new Error('请选择 10MB 以内的 PNG、JPEG 或 WebP 图片。')
  // Keep QR data in the browser: never proxy image URLs through our server.
  const response = await fetch(url, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (!response.ok) throw new Error('暂时无法识别，请尝试图片导入。')
  const type = response.headers.get('content-type')?.split(';')[0]?.trim() || ''
  if (!imageTypes.includes(type)) throw new Error('请选择 10MB 以内的 PNG、JPEG 或 WebP 图片。')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('暂时无法识别，请尝试图片导入。')
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) throw new Error('请选择 10MB 以内的 PNG、JPEG 或 WebP 图片。')
      chunks.push(new Uint8Array(value))
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  return new File(chunks, 'dropped-qr-image', { type })
}
