/**
 * A background the visitor supplies stays in this browser's IndexedDB and is
 * never uploaded. Six images form a rotating cube, like a resource pack's
 * panorama_0-5; a single image is a still backdrop.
 */
export type CustomPanoramaLayout = 'cube' | 'flat'
export interface CustomPanorama {
  layout: CustomPanoramaLayout
  images: Blob[]
}

const imageTypes = ['image/png', 'image/jpeg', 'image/webp']
const maxBytes = 10_000_000

/** Validate a selection and put six faces in panorama_0-5 order. */
export function customPanoramaFromFiles<T extends { name: string; type: string; size: number }>(
  files: readonly T[]
): { layout: CustomPanoramaLayout; images: T[] } {
  if (files.some((file) => !imageTypes.includes(file.type) || file.size > maxBytes))
    throw new Error('请选择 10MB 以内的 PNG、JPEG 或 WebP 图片。')
  if (files.length === 1) return { layout: 'flat', images: [...files] }
  if (files.length !== 6) throw new Error('请选择 1 张背景图，或 6 张全景面（panorama_0–5）。')
  // A face's index is the last number in its name: panorama_3.png, face-3.jpg.
  const face = (file: T) => Number(file.name.match(/(\d+)\D*$/)?.[1] ?? NaN)
  const indexed = new Set(files.map(face)).size === 6 && files.every((file) => face(file) <= 5)
  const images = [...files].sort((a, b) =>
    indexed ? face(a) - face(b) : a.name.localeCompare(b.name, undefined, { numeric: true })
  )
  return { layout: 'cube', images }
}

const databaseName = '2fa-custom-panorama',
  storeName = 'backgrounds',
  recordKey = 'current'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(storeName, mode)
      const request = run(transaction.objectStore(storeName))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function loadCustomPanorama(): Promise<CustomPanorama | null> {
  const value = await transact('readonly', (store) => store.get(recordKey))
  return value && (value.layout === 'cube' || value.layout === 'flat') ? value : null
}

export function saveCustomPanorama(value: CustomPanorama) {
  return transact('readwrite', (store) => store.put(value, recordKey))
}

export function removeCustomPanorama() {
  return transact('readwrite', (store) => store.delete(recordKey))
}

/**
 * A few-kilobyte copy of each image, kept in localStorage under this key.
 * public/panorama-preference.js paints it before the page can read IndexedDB,
 * so a reload opens on a soft preview of the backdrop instead of an empty one.
 */
export const customPreviewKey = '2fa-panorama-custom-preview'
export function customPanoramaPreviews(images: readonly Blob[]): Promise<string[]> {
  return Promise.all(
    images.map(async (image) => {
      const bitmap = await createImageBitmap(image)
      const scale = 64 / Math.max(bitmap.width, bitmap.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      bitmap.close()
      return canvas.toDataURL('image/jpeg', 0.7)
    })
  )
}

/**
 * What the head script already read, so the page reuses its images and URLs:
 * null when nothing is stored, undefined when it did not or could not read.
 */
export interface EarlyCustomPanorama extends CustomPanorama {
  urls: string[]
}
type EarlyRead = Promise<EarlyCustomPanorama | null | undefined>
export async function takeEarlyCustomPanorama(): Promise<EarlyCustomPanorama | null | undefined> {
  const holder = window as { __2faCustomPanorama?: EarlyRead }
  const early = holder.__2faCustomPanorama
  delete holder.__2faCustomPanorama
  return early?.catch(() => undefined)
}
