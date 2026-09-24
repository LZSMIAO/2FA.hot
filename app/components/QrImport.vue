<script setup lang="ts">
import { transferText, clipboardText } from '~/utils/transfer-text'
const clipboardHint = useClipboardHint()
import { collectQrChoices } from '~/utils/qr-choices'
import { decodeQrImage, decodeQrFile } from '~/utils/qr-image'
import { hasImageDrop } from '~/utils/dropped-image'
import { isMigrationUri } from '~/utils/ga-migration'
const { tx } = useMessages()
import { parseOtp, toOtpUri } from '~/utils/otp'
const props = defineProps<{
  initialImages?: File[]
  initialImage?: File
  initialImagePasted?: boolean
  initialIssue?: string
  externalDrop?: boolean
  externalLoading?: boolean
  demo?: boolean
}>()
const emit = defineEmits<{
  close: []
  dismiss: []
  import: [value: string, images: File[]]
  text: [value: string]
  batch: [value: string]
  migration: [value: string]
  pasted: []
}>()
const pasteConfirmed = shallowRef(false)
let pasteTimer: ReturnType<typeof setTimeout> | undefined
let imageWasPasted = false
function confirmImagePaste() {
  clearTimeout(pasteTimer)
  pasteConfirmed.value = true
  pasteTimer = setTimeout(() => (pasteConfirmed.value = false), 3000)
}
const open = shallowRef(true),
  issue = shallowRef(props.initialIssue || ''),
  scanning = shallowRef(false),
  processing = shallowRef(false)
const choices = shallowRef<string[]>([]),
  facing = shallowRef<'environment' | 'user'>('environment')
const selectedChoices = shallowRef<string[]>([])
const ordinaryChoices = computed(() => choices.value.filter((value) => !isMigrationUri(value)))
const migrationChoices = computed(() => choices.value.filter(isMigrationUri))
const fileIssues = shallowRef<Array<{ name: string; message: string }>>([])
const duplicateCount = shallowRef(0)
const progress = shallowRef({ done: 0, total: 0 })
const {
  surface: choiceSurface,
  start: startSelection,
  click: clickSelection,
  cancelSelection
} = useHistorySelection(ordinaryChoices, selectedChoices)
const dropZone = useTemplateRef<HTMLElement>('dropZone')
defineExpose({ dropTarget: dropZone })
const { loading: localDropLoading, cancel: cancelLocalDrop } = useImageDrop({
  enabled: () => open.value && !props.externalDrop,
  target: () => dropZone.value,
  image: (file) => image(file),
  images: (files) => images(files),
  issue: (message) => {
    issue.value = message
  }
})
const dragging = shallowRef(false)
function highlightDropZone(event: DragEvent) {
  dragging.value = !!event.dataTransfer && hasImageDrop(event.dataTransfer)
}
function leaveDropZone(event: DragEvent) {
  if (!(event.relatedTarget instanceof Node) || !dropZone.value?.contains(event.relatedTarget))
    dragging.value = false
}
function clearDropHighlight() {
  dragging.value = false
}
const dropLoading = computed(() =>
  props.externalDrop ? !!props.externalLoading : localDropLoading.value
)
watch(
  () => props.initialIssue,
  (message) => {
    issue.value = message || ''
  }
)
watch(
  () => props.initialImage,
  (file) => {
    if (file) void image(file, props.initialImagePasted !== false)
  }
)
watch(
  () => props.initialImages,
  (files) => {
    if (files?.length) void images(files)
  }
)
const video = useTemplateRef<HTMLVideoElement>('video'),
  input = useTemplateRef<HTMLInputElement>('file')
let stream: MediaStream | undefined,
  timer: ReturnType<typeof setTimeout> | undefined,
  active = true
let pendingResult:
  { kind: 'import' | 'batch' | 'migration' | 'text'; value: string; images?: File[] } | undefined
function finishClose() {
  if (pendingResult?.kind === 'text') emit('text', pendingResult.value)
  if (pendingResult?.kind === 'import')
    emit('import', pendingResult.value, pendingResult.images || [])
  if (pendingResult?.kind === 'batch') emit('batch', pendingResult.value)
  if (pendingResult?.kind === 'migration') emit('migration', pendingResult.value)
  // Restore the same feedback on the home input after importing resets its value.
  if (pendingResult && imageWasPasted) emit('pasted')
  pendingResult = undefined
  emit('close')
}
function stop() {
  clearTimeout(timer)
  stream?.getTracks().forEach((t) => t.stop())
  stream = undefined
  scanning.value = false
}
function openMigration(value = '') {
  if (!value) imageWasPasted = false
  pendingResult = { kind: 'migration', value }
  open.value = false
}
/** `images` is the picture the code came from, so the home input can show it as the source. */
function accept(value: string, images: File[] = []) {
  if (!active || !open.value) return
  if (isMigrationUri(value)) {
    openMigration(value)
    return
  }
  try {
    const c = parseOtp(value)
    if (!value.startsWith('otpauth://')) throw new Error('二维码不是 TOTP 配置。')
    pendingResult = { kind: 'import', value: toOtpUri(c), images }
    open.value = false
  } catch (e) {
    issue.value = (e as Error).message
  }
}
async function image(file?: File, fromPaste = false) {
  if (file) await images([file], fromPaste)
}
async function images(files: File[], fromPaste = false) {
  if (!files.length || processing.value || !open.value || !active) return
  if (files.length > 20) {
    issue.value = '每次最多选择 20 张图片，请分批导入。'
    if (input.value) input.value.value = ''
    return
  }
  imageWasPasted = fromPaste
  clearTimeout(pasteTimer)
  pasteConfirmed.value = false
  if (fromPaste) confirmImagePaste()
  stop()
  issue.value = ''
  choices.value = []
  selectedChoices.value = []
  fileIssues.value = []
  duplicateCount.value = 0
  progress.value = { done: 0, total: files.length }
  processing.value = true
  const values: string[] = []
  try {
    for (const file of files) {
      if (!active || !open.value) return
      try {
        const decoded = await decodeQrFile(file)
        if (!active || !open.value) return
        if (!decoded.length) throw new Error('未识别到二维码，请换一张清晰图片。')
        const result = collectQrChoices(decoded)
        if (result.unsupported) {
          fileIssues.value = [
            ...fileIssues.value,
            { name: file.name, message: '二维码不是 TOTP 配置。' }
          ]
        }
        values.push(...decoded)
      } catch (e) {
        if (!active || !open.value) return
        fileIssues.value = [...fileIssues.value, { name: file.name, message: (e as Error).message }]
      }
      progress.value = { done: progress.value.done + 1, total: files.length }
    }
    if (!active || !open.value) return
    const result = collectQrChoices(values)
    duplicateCount.value = result.duplicates
    if (files.length === 1 && result.choices.length === 1 && !fileIssues.value.length) {
      accept(result.choices[0]!, files)
    } else {
      choices.value = result.choices
      selectedChoices.value = result.choices.filter((value) => !isMigrationUri(value))
      if (!choices.value.length) issue.value = '没有可导入的 TOTP 配置。'
    }
  } finally {
    processing.value = false
    if (input.value) input.value.value = ''
  }
}
function pastedImage(event: ClipboardEvent) {
  if (event.defaultPrevented || !open.value || !active) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"]')) return
  const text = event.clipboardData ? transferText(event.clipboardData) : ''
  if (text.trim()) {
    event.preventDefault()
    pendingResult = { kind: 'text', value: text }
    open.value = false
    return
  }
  const file = Array.from(event.clipboardData?.items || [])
    .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
    ?.getAsFile()
  if (!file) return
  event.preventDefault()
  void image(file, true)
}
async function pasteImage() {
  if (processing.value || !open.value) return
  issue.value = ''
  await clipboardHint.start()
  if (!active || !open.value) return
  try {
    const items = await navigator.clipboard.read()
    clipboardHint.finish(true)
    if (!active || !open.value) return
    const text = await clipboardText(items)
    if (!active || !open.value) return
    if (text.trim()) {
      pendingResult = { kind: 'text', value: text }
      open.value = false
      return
    }
    for (const item of items) {
      const type = item.types.find((type) =>
        ['image/png', 'image/jpeg', 'image/webp'].includes(type)
      )
      if (type) {
        const blob = await item.getType(type)
        await image(new File([blob], 'clipboard-image', { type }), true)
        return
      }
    }
    issue.value = '剪贴板中没有图片。'
  } catch {
    clipboardHint.finish(false)
    if (active && open.value) issue.value = '无法读取剪贴板，请使用系统粘贴。'
  }
}
async function scan() {
  if (!active || !stream || !video.value) return
  try {
    if (video.value.readyState >= 2) {
      const found = await decodeQrImage(
        video.value,
        video.value.videoWidth,
        video.value.videoHeight
      )
      if (found.length) {
        stop()
        accept(found[0]!)
        return
      }
    }
  } catch {
    issue.value = '暂时无法识别，请尝试图片导入。'
    stop()
    return
  }
  timer = setTimeout(scan, 200)
}
async function camera() {
  imageWasPasted = false
  stop()
  issue.value = ''
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing.value } },
      audio: false
    })
    if (!active || !open.value) {
      media.getTracks().forEach((t) => t.stop())
      return
    }
    stream = media
    scanning.value = true
    await nextTick()
    if (video.value) {
      video.value.srcObject = media
      await video.value.play()
      scan()
    }
  } catch {
    issue.value = '未获得摄像头权限或摄像头不可用，可选择二维码图片。'
    stop()
  }
}
function switchCamera() {
  facing.value = facing.value === 'environment' ? 'user' : 'environment'
  return camera()
}
function importSelected() {
  if (processing.value || !open.value || !selectedChoices.value.length) return
  if (selectedChoices.value.length > 100) {
    issue.value = '每次最多 100 条，请分批处理。'
    return
  }
  if (selectedChoices.value.length === 1) {
    accept(selectedChoices.value[0]!)
    return
  }
  pendingResult = { kind: 'batch', value: selectedChoices.value.join('\n') }
  open.value = false
}
function choiceLabel(value: string, index: number) {
  if (isMigrationUri(value)) return `Google Authenticator · QR ${index + 1}`
  try {
    const c = parseOtp(value)
    return c.label || c.issuer || tx('二维码 {count}', { count: index + 1 })
  } catch {
    return tx('二维码 {count}（格式不支持）', { count: index + 1 })
  }
}
function hidden() {
  if (document.hidden) stop()
}
watch(open, (v) => {
  if (!v) {
    cancelLocalDrop()
    emit('dismiss')
    stop()
  }
})
onMounted(() => {
  document.addEventListener('dragend', clearDropHighlight)
  window.addEventListener('blur', clearDropHighlight)
  document.addEventListener('visibilitychange', hidden)
  document.addEventListener('paste', pastedImage)
  if (props.initialImages?.length) void images(props.initialImages)
  else if (props.initialImage) void image(props.initialImage, props.initialImagePasted !== false)
})
onBeforeUnmount(() => {
  document.removeEventListener('dragend', clearDropHighlight)
  window.removeEventListener('blur', clearDropHighlight)
  active = false
  clearTimeout(pasteTimer)
  stop()
  document.removeEventListener('visibilitychange', hidden)
  document.removeEventListener('paste', pastedImage)
})
</script>
<template>
  <UModal
    v-model:open="open"
    @after:leave="finishClose"
    :title="tx('导入二维码')"
    :description="tx('识别在此设备完成，图片不会上传。')"
    :overlay="!demo"
    :modal="!demo"
    ><template #body
      ><div class="modal-stack" @keydown="cancelSelection">
        <div class="qr-import-region">
          <p class="qr-paste-confirmation" role="status" aria-live="polite">
            <span v-if="pasteConfirmed">{{ tx('已粘贴内容') }}</span>
          </p>
          <UContextMenu
            :items="[
              {
                label: tx('粘贴'),
                icon: 'i-lucide-clipboard-paste',
                disabled: processing,
                onSelect: pasteImage
              }
            ]"
          >
            <div
              ref="dropZone"
              class="drop-zone ore-drop-zone"
              :class="{ 'is-dragging': dragging }"
              :aria-busy="processing || dropLoading"
              @dragenter="highlightDropZone"
              @dragover="highlightDropZone"
              @dragleave="leaveDropZone"
              @drop="clearDropHighlight"
            >
              <UIcon name="i-lucide-scan-line" class="text-3xl text-muted" />
              <div class="qr-drop-line">
                <p class="qr-drop-instruction" :class="{ 'is-active': dragging }" role="status">
                  {{ tx(dragging ? '松开鼠标，识别二维码' : '将二维码图片拖到这里') }}
                </p>
                <UPopover
                  mode="hover"
                  :open-delay="0"
                  :close-delay="100"
                  enable-touch
                  arrow
                  :content="{ side: 'top', align: 'center', sideOffset: 2 }"
                  :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
                >
                  <button type="button" class="info-mark" :aria-label="tx('使用说明')">
                    <UIcon name="i-lucide-info" aria-hidden="true" />
                  </button>
                  <template #content>
                    <div class="qr-import-tips">
                      <p>PNG · JPEG · WebP</p>
                      <p>{{ tx('支持多张图片，每张不超过 10MB。') }}</p>
                      <p>{{ tx('每次最多选择 20 张图片，请分批导入。') }}</p>
                      <p>{{ tx('识别在此设备完成，图片不会上传。') }}</p>
                    </div>
                  </template>
                </UPopover>
              </div>
              <div class="qr-image-actions">
                <UButton
                  variant="outline"
                  color="neutral"
                  :loading="processing || dropLoading"
                  @click="input?.click()"
                  >{{ tx('选择图片') }}</UButton
                >
                <UButton
                  variant="outline"
                  color="neutral"
                  icon="i-lucide-clipboard-paste"
                  :disabled="processing || dropLoading"
                  @click="pasteImage"
                  >{{ tx('粘贴') }}</UButton
                >
              </div>
              <input
                ref="file"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                class="sr-only"
                :aria-label="tx('选择二维码图片')"
                @change="images(Array.from(($event.target as HTMLInputElement).files || []))"
              />
              <p v-if="issue" class="qr-error" role="alert">{{ tx(issue) }}</p>
            </div>
          </UContextMenu>
        </div>
        <p v-if="processing" role="status" aria-live="polite">
          {{ tx('正在识别图片：{done}/{total}', progress) }}
        </p>
        <Transition name="issue-fade">
          <div v-if="fileIssues.length" class="qr-file-issues" role="status">
            <p v-for="(failure, index) in fileIssues" :key="index">
              <strong>{{ failure.name }}</strong
              >：{{ tx(failure.message) }}
            </p>
          </div>
        </Transition>
        <div v-if="choices.length" class="modal-stack">
          <p>{{ tx('识别到二维码：{count}，请选择配置。', { count: choices.length }) }}</p>
          <p v-if="duplicateCount" class="text-muted">
            {{ tx('已去除 {count} 个重复配置。', { count: duplicateCount }) }}
          </p>
          <template v-if="ordinaryChoices.length">
            <UCheckbox
              :label="tx('全选')"
              :model-value="
                selectedChoices.length === ordinaryChoices.length
                  ? true
                  : selectedChoices.length
                    ? 'indeterminate'
                    : false
              "
              @update:model-value="selectedChoices = $event === true ? [...ordinaryChoices] : []"
            />
            <div ref="choiceSurface" class="qr-choice-list">
              <div
                v-for="(choice, index) in ordinaryChoices"
                :key="choice"
                :data-selection-id="choice"
                class="qr-choice-row"
              >
                <SelectionCheck
                  :label="choiceLabel(choice, index)"
                  :checked="selectedChoices.includes(choice)"
                  @pointerdown="startSelection($event, choice)"
                  @click="clickSelection($event, choice)"
                />
                <span>{{ choiceLabel(choice, index) }}</span>
              </div>
            </div>
            <UButton
              class="primary-button"
              :disabled="!selectedChoices.length || processing"
              @click="importSelected"
            >
              {{ tx('导入所选（{count}）', { count: selectedChoices.length }) }}
            </UButton>
          </template>
          <UButton
            v-for="(choice, index) in migrationChoices"
            :key="choice"
            color="neutral"
            variant="outline"
            @click="accept(choice)"
            >{{ choiceLabel(choice, index) }}</UButton
          >
        </div>
        <video
          v-if="scanning"
          ref="video"
          autoplay
          muted
          playsinline
          class="camera-preview"
        /><UButton
          v-if="scanning"
          color="neutral"
          variant="outline"
          icon="i-lucide-switch-camera"
          @click="switchCamera"
          >{{ tx('切换摄像头') }}</UButton
        >
        <ActionHint
          :open="clipboardHint.visible.value"
          :message="tx('如果浏览器询问剪贴板权限，请点允许。')"
          icon="i-lucide-clipboard-paste"
          @close="clipboardHint.visible.value = false"
        />
        <div class="qr-source-actions">
          <UButton
            color="neutral"
            variant="outline"
            :disabled="processing"
            :icon="scanning ? 'i-lucide-camera-off' : 'i-lucide-camera'"
            @click="scanning ? stop() : camera()"
            >{{ tx(scanning ? '关闭摄像头' : '使用摄像头扫描') }}</UButton
          >
          <UButton color="neutral" variant="outline" icon="i-lucide-import" @click="openMigration()"
            >Google Authenticator · {{ tx('导入') }}</UButton
          >
        </div>
      </div></template
    ></UModal
  >
</template>
<style scoped>
.qr-choice-row {
  display: flex;
  align-items: center;
  gap: var(--control-gap);
}
.qr-choice-row > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.qr-choice-list,
.qr-file-issues {
  color: var(--ui-error);
  display: grid;
  gap: 0.75rem;
  max-height: 220px;
  overflow-y: auto;
  overscroll-behavior: contain;
  overflow-wrap: anywhere;
}
.qr-file-issues {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
.qr-source-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.qr-source-actions > button {
  flex: 1 0 auto;
  justify-content: center;
  white-space: nowrap;
  overflow-wrap: normal;
}
@media (max-width: 380px) {
  .qr-source-actions > button {
    font-size: 0.8125rem;
  }
}
.drop-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.qr-drop-line {
  text-align: center;
  /* Match the modal's paragraph size; the mark aligns to this line's text. */
  font-size: var(--text-label);
}
/* Inline, so the info mark trails the instruction's last word. */
.qr-drop-instruction {
  display: inline;
}
.qr-drop-line .info-mark {
  cursor: default;
}
.qr-import-tips {
  display: grid;
  gap: 0.375rem;
}
.drop-zone.is-dragging {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
  background: var(--accent-wash);
}
.drop-zone .qr-drop-instruction.is-active {
  color: var(--accent-ink);
  font-weight: 600;
}
.qr-import-region {
  position: relative;
  padding-top: 1.5rem;
}
.qr-paste-confirmation {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  margin: 0;
  color: var(--accent-ink);
  font-size: var(--text-caption);
  line-height: 1.25rem;
}
.qr-error {
  width: 100%;
  margin-top: 0.25rem;
  padding-top: 0.875rem;
  border-top: 1px solid var(--control-line);
  color: var(--ui-error);
  font-size: var(--text-caption);
  line-height: 1.6;
  text-align: start;
  overflow-wrap: anywhere;
}
.qr-error {
  margin-block: 0.25rem 0;
}
.qr-image-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
}
.qr-image-actions > button {
  min-width: 0;
  justify-content: center;
  white-space: normal;
  overflow-wrap: anywhere;
}
.camera-preview {
  width: 100%;
  max-height: 260px;
  background: black;
  border-radius: var(--ui-radius);
}
</style>

<style scoped>
.clipboard-permission-notice {
  color: var(--accent-ink);
  font-weight: 600;
}
</style>
