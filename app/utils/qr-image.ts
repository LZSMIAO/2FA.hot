let decoder: typeof import('jsqr').default | undefined
export async function decodeQrImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  multiple = false
) {
  if (!decoder) decoder = (await import('jsqr')).default
  const scale = Math.min(1, 1600 / Math.max(width, height)),
    canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  const found: string[] = []
  for (let attempt = 0; attempt < (multiple ? 16 : 1); attempt++) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = decoder(data.data, data.width, data.height)
    if (!result) break
    if (!found.includes(result.data)) found.push(result.data)
    const corners = [
      result.location.topLeftCorner,
      result.location.topRightCorner,
      result.location.bottomLeftCorner,
      result.location.bottomRightCorner
    ]
    const x = Math.min(...corners.map((p) => p.x)) - 8,
      y = Math.min(...corners.map((p) => p.y)) - 8
    const right = Math.max(...corners.map((p) => p.x)) + 8,
      bottom = Math.max(...corners.map((p) => p.y)) + 8
    ctx.fillStyle = 'white'
    ctx.fillRect(x, y, right - x, bottom - y)
  }
  return found
}

export async function decodeQrFile(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10_000_000)
    throw new Error('请选择 10MB 以内的 PNG、JPEG 或 WebP 图片。')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('未识别到二维码，请换一张清晰图片。')
  })
  try {
    if (bitmap.width * bitmap.height > 16_000_000)
      throw new Error('图片尺寸过大，请裁剪二维码后重试。')
    return await decodeQrImage(bitmap, bitmap.width, bitmap.height, true)
  } finally {
    bitmap.close()
  }
}
