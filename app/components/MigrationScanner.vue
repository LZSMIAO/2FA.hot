<script setup lang="ts">
import { decodeQrImage } from '~/utils/qr-image'
const props = defineProps<{ enabled: boolean }>()
const emit = defineEmits<{ detected: [values: string[]]; issue: [message: string] }>()
const { tx } = useMessages()
const scanning = shallowRef(false),
  busy = shallowRef(false),
  opening = shallowRef(false)
const facing = shallowRef<'environment' | 'user'>('environment')
const video = useTemplateRef<HTMLVideoElement>('video'),
  input = useTemplateRef<HTMLInputElement>('file')
let stream: MediaStream | undefined,
  timer: ReturnType<typeof setTimeout> | undefined,
  session = 0,
  active = true
const seen = new Set<string>()
function stop() {
  session++
  clearTimeout(timer)
  stream?.getTracks().forEach((track) => track.stop())
  stream = undefined
  scanning.value = false
  opening.value = false
}
async function images(files: File[]) {
  if (!files.length || busy.value) return
  stop()
  const token = session
  busy.value = true
  emit('issue', '')
  try {
    if (files.length > 100) throw new Error('每次最多 100 条，请分批处理。')
    for (const file of files) {
      if (!active || !props.enabled || token !== session) break
      try {
        if (
          !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
          file.size > 10_000_000
        )
          throw new Error('请选择 10MB 以内的 PNG、JPEG 或 WebP 图片。')
        const bitmap = await createImageBitmap(file)
        try {
          if (bitmap.width * bitmap.height > 16_000_000)
            throw new Error('图片尺寸过大，请裁剪二维码后重试。')
          const values = await decodeQrImage(bitmap, bitmap.width, bitmap.height, true)
          if (!active || !props.enabled || token !== session) break
          if (values.length) emit('detected', values)
          else emit('issue', '未识别到二维码，请换一张清晰图片。')
        } finally {
          bitmap.close()
        }
      } catch (e) {
        emit('issue', (e as Error).message)
      }
    }
  } catch (e) {
    emit('issue', (e as Error).message)
  } finally {
    busy.value = false
    if (input.value) input.value.value = ''
  }
}
async function frame(token: number) {
  if (token !== session || !active || !props.enabled || !stream || !video.value) return
  try {
    if (video.value.readyState >= 2) {
      const values = await decodeQrImage(
        video.value,
        video.value.videoWidth,
        video.value.videoHeight,
        true
      )
      if (token !== session || !active || !props.enabled) return
      const fresh = values.filter((value) => !seen.has(value))
      fresh.forEach((value) => seen.add(value))
      if (fresh.length) emit('detected', fresh)
    }
  } catch {
    emit('issue', '暂时无法识别，请尝试图片导入。')
    stop()
    return
  }
  if (token === session) timer = setTimeout(() => frame(token), 250)
}
async function camera() {
  stop()
  if (busy.value || !props.enabled) return
  const token = session
  opening.value = true
  seen.clear()
  emit('issue', '')
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing.value } },
      audio: false
    })
    if (!active || !props.enabled || token !== session) {
      media.getTracks().forEach((track) => track.stop())
      return
    }
    stream = media
    scanning.value = true
    await nextTick()
    if (video.value && token === session) {
      video.value.srcObject = media
      await video.value.play()
      frame(token)
    }
  } catch {
    if (token === session) {
      emit('issue', '未获得摄像头权限或摄像头不可用，可选择二维码图片。')
      stop()
    }
  } finally {
    if (token === session) opening.value = false
  }
}
function switchCamera() {
  facing.value = facing.value === 'environment' ? 'user' : 'environment'
  camera()
}
function visibility() {
  if (document.hidden) stop()
}
watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled) stop()
  }
)
// The dialog forwards pasted screenshots here, so they are read like chosen files.
defineExpose({ images })
onMounted(() => document.addEventListener('visibilitychange', visibility))
onBeforeUnmount(() => {
  active = false
  stop()
  document.removeEventListener('visibilitychange', visibility)
})
</script>
<template>
  <div class="migration-scan">
    <div
      class="migration-drop ore-drop-zone"
      @dragover.prevent
      @drop.prevent="images(Array.from($event.dataTransfer?.files || []))"
    >
      <UIcon name="i-lucide-scan-line" class="size-8" />
      <p>{{ tx('将二维码图片拖到这里') }}</p>
      <div class="migration-scan-actions">
        <UButton
          icon="i-lucide-image-plus"
          class="primary-button"
          :loading="busy"
          @click="input?.click()"
          >{{ tx('选择图片') }}</UButton
        >
        <UButton
          :icon="scanning ? 'i-lucide-camera-off' : 'i-lucide-camera'"
          color="neutral"
          variant="outline"
          :disabled="busy"
          :loading="opening"
          @click="scanning ? stop() : camera()"
          >{{ tx(scanning ? '关闭摄像头' : '使用摄像头扫描') }}</UButton
        >
      </div>
      <span>{{ tx('PNG · JPEG · WebP') }} · {{ tx('支持多张图片，每张不超过 10MB。') }}</span>
      <input
        ref="file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        class="sr-only"
        :aria-label="tx('选择二维码图片')"
        @change="images(Array.from(($event.target as HTMLInputElement).files || []))"
      />
    </div>
    <template v-if="scanning">
      <video ref="video" autoplay muted playsinline class="migration-camera" />
      <UButton
        icon="i-lucide-switch-camera"
        color="neutral"
        variant="outline"
        @click="switchCamera"
        >{{ tx('切换摄像头') }}</UButton
      >
    </template>
  </div>
</template>
<style scoped>
.migration-scan {
  display: grid;
  gap: 0.75rem;
}
.migration-drop {
  display: grid;
  justify-items: center;
  gap: 0.75rem;

  text-align: center;
}
.migration-drop p {
  margin: 0;
}
.migration-drop > span {
  color: var(--ui-text-muted);
}
.migration-scan-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}
.migration-camera {
  width: 100%;
  max-height: 240px;
  background: #111;
}
</style>
