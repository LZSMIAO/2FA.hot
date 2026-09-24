<script setup lang="ts">
const { tx, message: deferredMessage } = useMessages()
import {
  analyzePaste,
  pastedBatchText,
  parseSmartBatch,
  removeBatchLines,
  insertBatchText,
  batchPasteText,
  batchFillRows,
  keptBatchFill
} from '~/utils/smart-paste'
import { countdownState } from '~/utils/countdown-state'
import { generateOtp, groupCode, remainingSeconds, toOtpUri, type BatchEntry } from '~/utils/otp'
import { codeOutput } from '~/utils/code-output'
import { pastedImages, transferText } from '~/utils/transfer-text'
const props = defineProps<{
  initial?: string
  importVersion?: number
  replace?: boolean
  standalone?: boolean
  guideStep?: number
  demo?: { input: number; results: number; copied: string }
}>()
const emit = defineEmits<{ single: [value: string]; collapse: [] }>()
const localePath = useLocalePath()
async function expandBatch() {
  if (guiding.value || !valid.value.length) return
  if (props.standalone) {
    emit('collapse')
    return
  }
  const payload = pastedBatchText(valid.value.map((row) => row.config!))
  await navigateTo(localePath('/2fa/batch') + '#' + encodeURIComponent(payload))
}
function createBatchSessionId() {
  // Batch grouping needs a unique ID even on a LAN HTTP development page.
  // getRandomValues is available there; randomUUID requires a secure context.
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
    part.toString(16).padStart(8, '0')
  ).join('')
}
const batchSessionId = shallowRef(createBatchSessionId())
const raw = shallowRef(''),
  entries = shallowRef<BatchEntry[]>([]),
  codes = shallowRef<Record<number, string>>({}),
  selected = shallowRef<number[]>([]),
  issue = shallowRef(''),
  note = shallowRef(''),
  now = shallowRef(Date.now())
const guiding = computed(() => props.guideStep !== undefined)
const demoSecrets = [
  'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
  'JBSWY3DPEHPK3PXP',
  'JBSWY3DPEHPK3PXQ',
  'JBSWY3DPEHPK3PXR'
]
const displayRaw = computed(() =>
  guiding.value ? demoSecrets.slice(0, props.demo?.input || 0).join('\n') : raw.value
)
const parsedRaw = computed(() =>
  guiding.value ? demoSecrets.slice(0, props.demo?.results || 0).join('\n') : raw.value
)
const matching = shallowRef(false)
let pastedSecrets = new Set<string>()
const batchRoot = useTemplateRef<HTMLElement>('batchRoot')
usePagePaste({
  enabled: () =>
    !props.standalone &&
    !guiding.value &&
    !matching.value &&
    !!batchRoot.value?.getClientRects().length,
  input: () =>
    batchRoot.value?.querySelector<HTMLTextAreaElement>('#batch-demo-input') || undefined,
  text: receivePaste,
  images: (files) => {
    void recognizeImages(files)
  }
})
const qrOpen = shallowRef(false)
const qrOpenedByDrag = shallowRef(false)
const qrImages = shallowRef<File[]>([])
const qrIssue = shallowRef('')
const migrationSource = shallowRef<string | null>(null)
const qrImport = useTemplateRef<{ dropTarget: HTMLElement | null }>('qrImport')
const { loading: imageDropLoading, cancel: cancelImageDrop } = useImageDrop({
  target: () => qrImport.value?.dropTarget,
  enabled: () =>
    !props.standalone &&
    !guiding.value &&
    !matching.value &&
    !!batchRoot.value?.getClientRects().length &&
    (qrOpenedByDrag.value ||
      !document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')),
  enter: () => {
    qrOpenedByDrag.value = true
    qrOpen.value = true
  },
  outside: () => {
    if (qrOpenedByDrag.value) qrOpen.value = false
  },
  image: (file) => {
    qrImages.value = [file]
  },
  images: (files) => {
    qrImages.value = files
  },
  issue: (message) => {
    qrIssue.value = message
  }
})
function closeQr() {
  qrOpen.value = false
  qrOpenedByDrag.value = false
  qrImages.value = []
  qrIssue.value = ''
  cancelImageDrop()
}
function receivePaste(value: string) {
  const analysis = analyzePaste(value)
  const hadRows = !!raw.value.trim()
  clear()
  if (!hadRows && analysis.candidates.length === 1) emit('single', value)
  else importBatchSource(value)
}
let imageRevision = 0
/** Pasted into the box itself, codes join its rows; elsewhere they start a new batch. */
async function recognizeImages(files: File[], field?: HTMLTextAreaElement) {
  const revision = ++imageRevision
  qrIssue.value = ''
  if (files.length > 20) {
    qrIssue.value = '每次最多选择 20 张图片，请分批导入。'
    return
  }
  const { decodeQrFile } = await import('~/utils/qr-image')
  const { collectQrChoices } = await import('~/utils/qr-choices')
  const { isMigrationUri } = await import('~/utils/ga-migration')
  const values: string[] = []
  const errors: string[] = []
  for (const file of files) {
    try {
      const decoded = await decodeQrFile(file)
      if (!decoded.length) errors.push('未识别到二维码，请换一张清晰图片。')
      values.push(...decoded)
    } catch (cause) {
      errors.push((cause as Error).message)
    }
    if (revision !== imageRevision) return
  }
  const result = collectQrChoices(values)
  const ordinary = result.choices.filter((value) => !isMigrationUri(value))
  const migration = result.choices.find(isMigrationUri)
  if (ordinary.length && field) insertPaste(field, ordinary.join('\n'))
  else if (ordinary.length) receivePaste(ordinary.join('\n'))
  else if (migration) migrationSource.value = migration
  qrIssue.value =
    errors[0] ||
    (result.unsupported ? '二维码不是 TOTP 配置。' : '') ||
    (!result.choices.length ? '没有可导入的 TOTP 配置。' : '')
}
onBeforeUnmount(() => {
  imageRevision++
})
const matchAssociations = shallowRef<Record<number, string>>({})
const matchSource = shallowRef('')
const matchSnapshot = shallowRef('')
const reviewSource = computed(() =>
  raw.value === matchSnapshot.value ? matchSource.value : raw.value
)
const reviewAnalysis = computed(() => analyzePaste(reviewSource.value))
function finishMatching(value: string, source: string, associations: Record<number, string>) {
  raw.value = value
  matchSource.value = source
  matchAssociations.value = associations
  matchSnapshot.value = value
  matching.value = false
}
function importBatchSource(value: string) {
  value = batchPasteText(value)
  const state = fillState()
  const source = [reviewSource.value.trimEnd(), value].filter(Boolean).join('\n')
  const analysis = analyzePaste(value)
  pastedSecrets = new Set(analysis.candidates.map((candidate) => candidate.config.secret))
  const normalized =
    analysis.candidates.length && analysis.accounts?.length
      ? pastedBatchText(analysis.candidates.map((candidate) => candidate.config))
      : value
  const kept = raw.value.trimEnd()
  raw.value = [kept, normalized].filter(Boolean).join('\n')
  matchSource.value = source
  matchAssociations.value = {}
  matchSnapshot.value = raw.value
  rememberFill(state, normalized, state.raw.length, (rows) => {
    const text = [kept, rows].filter(Boolean).join('\n')
    return { text, cursor: text.length }
  })
  nextTick(() => update())
}
// Pastes are inserted programmatically, so the textarea's native history cannot undo them.
// Undo returns to the text as it was before a fill, like stepping back through each later edit.
type FillState = {
  raw: string
  source: string
  snapshot: string
  associations: Record<number, string>
}
type BatchFill = {
  state: FillState
  text: string
  rows: number
  cursor: number
  place: (rows: string) => { text: string; cursor: number }
}
let fills: BatchFill[] = []
function fillState(): FillState {
  return {
    raw: raw.value,
    source: matchSource.value,
    snapshot: matchSnapshot.value,
    associations: matchAssociations.value
  }
}
function rememberFill(state: FillState, text: string, cursor: number, place: BatchFill['place']) {
  const rows = batchFillRows(text)
  if (rows) fills = [...fills.slice(-49), { state, text, rows, cursor, place }]
}
function undoFill(single: boolean) {
  const fill = fills.at(-1)
  if (!fill) return
  let cursor = fill.cursor
  if (single && fill.rows > 1) {
    fill.rows--
    const placed = fill.place(keptBatchFill(fill.text, fill.rows))
    raw.value = matchSource.value = matchSnapshot.value = placed.text
    matchAssociations.value = {}
    cursor = placed.cursor
  } else {
    fills.pop()
    raw.value = fill.state.raw
    matchSource.value = fill.state.source
    matchSnapshot.value = fill.state.snapshot
    matchAssociations.value = fill.state.associations
  }
  pastedSecrets.clear()
  const input = batchInput()
  if (input && document.activeElement === input)
    nextTick(() => input.setSelectionRange(cursor, cursor))
}
function batchInput() {
  return batchRoot.value?.querySelector<HTMLTextAreaElement>('#batch-demo-input') || undefined
}
function handleUndoShortcut(event: KeyboardEvent) {
  if (
    event.key.toLowerCase() !== 'z' ||
    !(event.ctrlKey || event.metaKey) ||
    event.altKey ||
    event.defaultPrevented ||
    event.isComposing ||
    !fills.length ||
    props.standalone ||
    guiding.value ||
    matching.value ||
    !batchRoot.value?.getClientRects().length
  )
    return
  if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
  // Page-level pastes are undoable too, but other editors keep their own history.
  const editor =
    event.target instanceof HTMLElement
      ? event.target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
        )
      : null
  if (editor && editor !== batchInput()) return
  event.preventDefault()
  undoFill(event.shiftKey)
  // Someone who already reaches for the keys needs praise, not the deletion tip.
  if (!undoShortcutUsed.value) {
    undoShortcutUsed.value = true
    rememberHint('2fa-batch-undo-shortcut-used-v1')
    showUndoHint('shortcut')
  } else if (undoHintOpen.value && undoHintKind.value === 'delete') finishUndoHint()
}
const undoHintOpen = shallowRef(false)
const undoHintKind = shallowRef<'delete' | 'shortcut'>('delete')
const undoKeys = shallowRef({ undo: 'Ctrl+Z', single: 'Ctrl+Shift+Z' })
const undoHintSeen = useState('batch-undo-hint-seen-v1', () => false)
const undoShortcutUsed = useState('batch-undo-shortcut-used-v1', () => false)
let undoHintTimer: ReturnType<typeof setTimeout> | undefined
let keyboardMedia: MediaQueryList | undefined
function rememberHint(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {}
}
function showUndoHint(kind: 'delete' | 'shortcut') {
  undoHintKind.value = kind
  undoHintOpen.value = true
  clearTimeout(undoHintTimer)
  undoHintTimer = setTimeout(finishUndoHint, 8000)
}
function finishUndoHint() {
  clearTimeout(undoHintTimer)
  undoHintOpen.value = false
}
/** Teach the undo keys once, when someone first starts deleting pasted rows by hand. */
function offerUndoHint(event: InputEvent) {
  if (
    undoHintSeen.value ||
    undoShortcutUsed.value ||
    !event.inputType.startsWith('delete') ||
    !fills.length ||
    guiding.value ||
    !keyboardMedia?.matches
  )
    return
  undoHintSeen.value = true
  rememberHint('2fa-batch-undo-hint-seen-v1')
  showUndoHint('delete')
}
const valid = computed(() => entries.value.filter((x) => x.config))
const associationState = computed(() => {
  if (valid.value.length && valid.value.every((entry) => !!entry.config?.label)) return 'linked'
  if (reviewAnalysis.value.accounts?.length || valid.value.some((entry) => !!entry.config?.label))
    return 'uncertain'
  return 'unlinked'
})
const associationHint = computed(() => {
  if (associationState.value === 'linked')
    return tx('每个密钥都有对应的账号名称。点击可查看或修改。')
  if (associationState.value === 'uncertain')
    return tx('已从粘贴内容认出账号名称，但还没和密钥全部对应。点击确认。')
  return tx('密钥还没有账号名称。点击可手动对应。')
})
const successfulKeys = computed(() =>
  guiding.value
    ? []
    : valid.value
        .filter((entry) => codes.value[entry.line])
        .map(({ config }) =>
          JSON.stringify([
            config!.secret,
            config!.kind,
            config!.algorithm,
            config!.digits,
            config!.period
          ])
        )
)
const selectionIds = computed(() => valid.value.map((row) => String(row.line)))
const selectedIds = computed({
  get: () => selected.value.map(String),
  set: (ids: string[]) => {
    selected.value = ids.map(Number)
  }
})
const {
  surface,
  start: startSelection,
  click: clickSelection,
  cancelSelection
} = useHistorySelection(selectionIds, selectedIds)
const autoHistoryError = useAutoHistory(
  () => (guiding.value || props.standalone ? [] : valid.value.map((entry) => entry.config!)),
  () => true,
  () => batchSessionId.value
)
const { copied, message, copy } = useCopy(),
  vault = useVault()
const copiedLine = shallowRef<number | 'all' | null>(null)
const demoCopied = computed(() => (guiding.value ? props.demo?.copied : ''))
watch(guiding, () => {
  copied.value = false
  copiedLine.value = null
  message.value = ''
  note.value = ''
})
let timer: ReturnType<typeof setInterval>,
  sequence = 0
// Keep only the current rows and time windows; adding a line reuses existing codes.
let codeCache = new Map<string, Promise<string>>()
function removeRows(lines: number[]) {
  if (guiding.value || !lines.length) return
  raw.value = removeBatchLines(raw.value, lines)
  selected.value = []
}
async function update() {
  const id = ++sequence,
    time = Date.now(),
    result: Record<number, string> = {}
  const nextCache = new Map<string, Promise<string>>()
  await Promise.all(
    valid.value.map(async (row) => {
      const config = row.config!
      const key = JSON.stringify(config) + ':' + Math.floor(time / 1000 / config.period)
      const pending = codeCache.get(key) || generateOtp(config, time)
      nextCache.set(key, pending)
      try {
        result[row.line] = await pending
      } catch {
        nextCache.delete(key)
        result[row.line] = ''
      }
    })
  )
  if (id !== sequence) return
  const previousKeys = successfulKeys.value
  const pasteSucceeded = valid.value.some(
    (row) => result[row.line] && pastedSecrets.has(row.config!.secret)
  )
  pastedSecrets.clear()
  codeCache = nextCache
  codes.value = result
  if (
    !guiding.value &&
    !props.standalone &&
    (pasteSucceeded || successfulKeys.value.some((key) => !previousKeys.includes(key)))
  )
    window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'success' }))
}
watch(parsedRaw, () => {
  sequence++
  issue.value = ''
  note.value = ''
  copied.value = false
  copiedLine.value = null
  message.value = ''
  try {
    const previous = new Map(entries.value.map((row) => [row.line, JSON.stringify(row.config)]))
    const next = parseSmartBatch(parsedRaw.value)
    const unchanged = new Set(
      next
        .filter((row) => row.config && previous.get(row.line) === JSON.stringify(row.config))
        .map((row) => row.line)
    )
    selected.value = selected.value.filter((line) => unchanged.has(line))
    codes.value = Object.fromEntries(
      Object.entries(codes.value).filter(([line]) => unchanged.has(Number(line)))
    )
    entries.value = next
    void update()
  } catch (e) {
    pastedSecrets.clear()
    entries.value = []
    codes.value = {}
    selected.value = []
    codeCache.clear()
    issue.value = (e as Error).message
  }
})

watch(
  () => [props.initial, props.importVersion] as const,
  ([value]) => {
    if (value) {
      if (props.replace) clear()
      importBatchSource(value)
    }
  },
  { immediate: true }
)
async function copyRows(line?: number) {
  if (guiding.value) return
  const id = sequence,
    time = Date.now(),
    rows = line ? valid.value.filter((r) => r.line === line) : valid.value
  try {
    const text = await Promise.all(
      rows.map(async (r) => {
        const c = await generateOtp(r.config!, time)
        return line ? c : codeOutput(r.config!.label, c)
      })
    )
    if (id !== sequence) return
    if (await copy(text.join('\n'))) {
      if (id !== sequence) {
        copied.value = false
        return
      }
      copiedLine.value = line ?? 'all'
      note.value = line
        ? '验证码已复制'
        : deferredMessage('已复制有效验证码：{count}；跳过错误记录：{skipped}。', {
            count: rows.length,
            skipped: entries.value.length - rows.length
          })
    }
  } catch (e) {
    issue.value = (e as Error).message
  }
}
async function save() {
  if (guiding.value) return
  try {
    const ok = await vault.save(
      valid.value.filter((r) => selected.value.includes(r.line)).map((r) => r.config!),
      batchSessionId.value
    )
    note.value = ok ? '所选记录已保存。' : '请先开启并解锁本地历史。'
  } catch (e) {
    issue.value = (e as Error).message
  }
}
function pasteBatch(event: ClipboardEvent) {
  if (guiding.value || !event.clipboardData) return
  const input = event.target as HTMLTextAreaElement
  const images = pastedImages(event.clipboardData)
  if (images.length) {
    event.preventDefault()
    void recognizeImages(images, input)
    return
  }
  const text = batchPasteText(transferText(event.clipboardData))
  if (!text.trim()) return
  event.preventDefault()
  imageRevision++
  qrIssue.value = ''
  insertPaste(input, text)
}
/** Insert pasted text at the box's selection, as one undoable fill. */
function insertPaste(input: HTMLTextAreaElement, value: string) {
  const text = batchPasteText(value)
  const analysis = analyzePaste(text)
  const normalized =
    analysis.candidates.length && analysis.accounts?.length
      ? pastedBatchText(analysis.candidates.map((candidate) => candidate.config))
      : text
  const inserted = insertBatchText(raw.value, normalized, input.selectionStart, input.selectionEnd)
  const source =
    input.selectionStart === input.value.length && raw.value
      ? reviewSource.value + '\n' + text
      : insertBatchText(raw.value, text, input.selectionStart, input.selectionEnd).text
  pastedSecrets = new Set(analysis.candidates.map((candidate) => candidate.config.secret))
  const before = raw.value,
    start = input.selectionStart,
    end = input.selectionEnd
  rememberFill(fillState(), normalized, start, (rows) =>
    rows ? insertBatchText(before, rows, start, end) : { text: before, cursor: start }
  )
  raw.value = inserted.text
  matchSource.value = source
  matchAssociations.value = {}
  matchSnapshot.value = raw.value
  nextTick(() => {
    input.setSelectionRange(inserted.cursor, inserted.cursor)
    void update()
  })
}
function clear() {
  pastedSecrets.clear()
  fills = []
  finishUndoHint()
  imageRevision++
  qrIssue.value = ''
  batchSessionId.value = createBatchSessionId()
  matching.value = false
  matchSource.value = ''
  matchAssociations.value = {}
  matchSnapshot.value = ''
  raw.value = ''
}
onMounted(() => {
  timer = setInterval(() => {
    const old = now.value
    now.value = Date.now()
    if (
      valid.value.some(
        (r) =>
          Math.floor(old / 1000 / r.config!.period) !==
          Math.floor(now.value / 1000 / r.config!.period)
      )
    )
      update()
  }, 250)
  window.addEventListener('pagehide', clear)
  window.addEventListener('keydown', handleUndoShortcut)
  keyboardMedia = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)')
  if (/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent))
    undoKeys.value = { undo: '⌘Z', single: '⇧⌘Z' }
  try {
    undoHintSeen.value ||= localStorage.getItem('2fa-batch-undo-hint-seen-v1') === '1'
    undoShortcutUsed.value ||= localStorage.getItem('2fa-batch-undo-shortcut-used-v1') === '1'
  } catch {}
})
onBeforeUnmount(() => {
  sequence++
  clearInterval(timer)
  clearTimeout(undoHintTimer)
  codeCache.clear()
  fills = []
  window.removeEventListener('pagehide', clear)
  window.removeEventListener('keydown', handleUndoShortcut)
})
</script>
<template>
  <p v-if="autoHistoryError" class="inline-error" role="alert">{{ tx(autoHistoryError) }}</p>
  <div ref="batchRoot" class="batch-workspace ore-workspace-frame" @keydown="cancelSelection">
    <div class="batch-input">
      <div class="section-heading">
        <h2 class="workspace-title">{{ tx('批量获取验证码') }}</h2>
        <AppHint :text="tx(standalone ? '返回工具首页' : '查看独立取码页')">
          <UButton
            color="neutral"
            variant="ghost"
            class="expand-button batch-expand"
            :disabled="guiding || !valid.length"
            :icon="standalone ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
            :aria-label="tx(standalone ? '返回工具首页' : '查看独立取码页')"
            @click="expandBatch"
          />
        </AppHint>
      </div>
      <SmartPasteReview
        v-if="matching"
        :source="reviewSource"
        :analysis="reviewAnalysis"
        :initial-associations="raw === matchSnapshot ? matchAssociations : {}"
        matching
        @complete="finishMatching"
        @select="
          (config) => {
            matching = false
            emit('single', toOtpUri(config))
          }
        "
        @cancel="matching = false"
        @clear="clear"
      />
      <UTextarea
        v-else-if="!standalone"
        @paste="pasteBatch"
        @beforeinput="offerUndoHint"
        :model-value="displayRaw"
        @update:model-value="
          (value) => {
            if (!guiding) raw = String(value)
          }
        "
        :readonly="guiding"
        id="batch-demo-input"
        :rows="5"
        class="w-full secret-field"
        size="xl"
        :placeholder="tx('每行一个密钥，可以连续粘贴多条。\n也支持 otpauth:// 配置链接。')"
        :aria-label="tx('批量密钥')"
        aria-keyshortcuts="Control+Z Control+Shift+Z Meta+Z Meta+Shift+Z"
        aria-describedby="batch-input-hint"
        :ui="{ base: 'font-mono text-base leading-6 px-3 py-3 ring-[var(--control-line)]' }"
        :spellcheck="false"
        autocomplete="off"
      />
      <ActionHint
        :key="undoHintKind"
        :open="undoHintOpen && !guiding"
        :message="
          undoHintKind === 'shortcut'
            ? tx('太好了，看来你会用快捷键！\n{undo} 撤回整次粘贴，{single} 逐条撤回', undoKeys)
            : tx('按 {undo} 撤回本次粘贴，按 {single} 逐条撤回', undoKeys)
        "
        :icon="undoHintKind === 'shortcut' ? 'i-lucide-thumbs-up' : 'i-lucide-undo-2'"
        @close="finishUndoHint"
      />
      <div v-if="!standalone && !matching && !guiding && valid.length" class="batch-paste-notice">
        <PasteNotice
          v-if="raw && raw === matchSnapshot && matchSource !== raw"
          message="已从粘贴内容中提取密钥，已忽略周围文字。"
          :source="matchSource"
        />
        <AppHint :text="associationHint">
          <button
            type="button"
            class="batch-match-icon"
            :class="`is-${associationState}`"
            :aria-label="associationHint"
            @click="matching = true"
          >
            <UIcon name="i-lucide-link" />
          </button>
        </AppHint>
      </div>
      <div v-if="!standalone && !matching" class="batch-input-footer">
        <p
          id="batch-input-hint"
          class="batch-input-hint"
          :class="{ 'batch-input-error': qrIssue && !qrOpen }"
          role="status"
          aria-live="polite"
        >
          <Transition name="issue-fade" mode="out-in">
            <span :key="qrIssue && !qrOpen ? 'issue' : 'hint'">{{
              tx(qrIssue && !qrOpen ? qrIssue : '最多 100 条 · 仅在当前页面保留')
            }}</span>
          </Transition>
        </p>
        <div class="batch-input-status" role="status">
          <span :class="{ 'has-valid': valid.length > 0 }">{{
            tx('有效：{count}', { count: valid.length })
          }}</span>
          <span v-if="entries.length - valid.length" class="batch-invalid">{{
            tx('需修正：{count}', { count: entries.length - valid.length })
          }}</span>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          class="batch-clear"
          :disabled="guiding || !raw"
          @click="clear"
        >
          {{ tx('清空批量') }}
        </UButton>
      </div>
    </div>
    <div
      v-show="!matching"
      class="batch-reveal"
      :class="{ 'is-open': entries.length > 0 }"
      :inert="!entries.length"
      :aria-hidden="!entries.length"
    >
      <div class="batch-reveal-inner">
        <div
          id="batch-demo-results"
          ref="surface"
          class="batch-results"
          :class="{ 'demo-highlight': guideStep === 3 }"
        >
          <div class="batch-toolbar">
            <div v-if="!standalone" class="batch-selection-actions">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-save"
                :disabled="
                  guiding || !selected.length || !vault.unlocked.value || !vault.enabled.value
                "
                @click="save"
                >{{ tx('保存所选：{count}', { count: selected.length }) }}</UButton
              >
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-lucide-trash-2"
                :disabled="guiding || !selected.length"
                @click="removeRows([...selected])"
              >
                {{ tx('删除所选：{count}', { count: selected.length }) }}
              </UButton>
            </div>
            <span v-else>{{ tx('有效：{count}', { count: valid.length }) }}</span>
            <UButton
              id="batch-demo-copy"
              class="primary-button"
              :class="{ 'demo-highlight': guideStep === 5 }"
              size="sm"
              :disabled="!valid.length"
              :icon="
                (copied && copiedLine === 'all') || demoCopied === 'all'
                  ? 'i-mc-check'
                  : 'i-lucide-copy'
              "
              @click="copyRows()"
              >{{
                tx(
                  (copied && copiedLine === 'all') || demoCopied === 'all'
                    ? '已复制'
                    : '复制全部有效验证码'
                )
              }}</UButton
            >
          </div>
          <div
            v-for="entry in entries"
            :key="entry.line"
            class="batch-row"
            :data-selection-id="entry.config ? String(entry.line) : undefined"
            :class="{ 'demo-row': guiding }"
          >
            <SelectionCheck
              v-if="entry.config && !standalone"
              :checked="selected.includes(entry.line)"
              :label="tx('选择第 {count} 条', { count: entry.line })"
              @pointerdown="startSelection($event, String(entry.line))"
              @click="clickSelection($event, String(entry.line))"
            /><span v-else-if="!entry.config" class="batch-error-marker" aria-hidden="true"
              ><UIcon name="i-lucide-circle-alert"
            /></span>
            <div class="batch-name" :class="{ 'has-label': entry.config?.label }">
              <span v-if="entry.config?.label" class="batch-account">{{ entry.config.label }}</span>
              <code v-if="entry.config" class="mono">{{
                standalone
                  ? entry.config.secret.slice(0, 4) + '••••' + entry.config.secret.slice(-4)
                  : entry.config.secret
              }}</code>
              <span v-else>{{ tx('第 {count} 条', { count: entry.line }) }}</span>
              <small>{{
                tx(entry.error || (entry.duplicate ? '重复记录' : entry.config?.algorithm))
              }}</small>
            </div>
            <template v-if="entry.config"
              ><span class="batch-code mono">{{
                tx(codes[entry.line] ? groupCode(codes[entry.line]!) : '— — —')
              }}</span
              ><span
                class="small-label mono"
                :data-countdown-state="
                  countdownState(
                    !!codes[entry.line],
                    remainingSeconds(entry.config.period, now),
                    entry.config.period
                  )
                "
                >{{ tx(remainingSeconds(entry.config.period, now)) }}s</span
              ><UButton
                color="neutral"
                variant="ghost"
                :id="`batch-demo-copy-${entry.line}`"
                :icon="
                  (copied && copiedLine === entry.line) ||
                  (demoCopied === 'single' && entry.line === 1)
                    ? 'i-mc-check'
                    : 'i-lucide-copy'
                "
                :class="{ 'demo-highlight': guideStep === 4 && entry.line === 1 }"
                :aria-label="tx('复制第 {count} 条验证码', { count: entry.line })"
                @click="copyRows(entry.line)"
            /></template>
            <AppHint v-if="!standalone" :text="tx('删除记录')">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                :aria-label="tx('删除记录')"
                :disabled="guiding"
                @click="removeRows([entry.line])"
              />
            </AppHint>
          </div>
        </div>
      </div>
    </div>
    <p v-if="issue || message" class="inline-error px-7 pb-4" role="alert">
      {{ tx(issue || message) }}
    </p>
    <p v-if="note" class="inline-notice px-7 pb-4" role="status">{{ tx(note) }}</p>
  </div>
  <LazyQrImport
    v-if="qrOpen"
    ref="qrImport"
    :initial-images="qrImages"
    :initial-image-pasted="false"
    :initial-issue="qrIssue"
    :external-drop="qrOpenedByDrag"
    :external-loading="imageDropLoading"
    @close="closeQr"
    @dismiss="cancelImageDrop"
    @import="receivePaste"
    @text="receivePaste"
    @batch="receivePaste"
    @migration="migrationSource = $event"
  />
  <MigrationDialog
    v-if="migrationSource !== null"
    :initial="migrationSource"
    @close="migrationSource = null"
    @import="receivePaste"
    @batch="receivePaste"
  />
</template>
<style scoped>
.batch-input {
  position: relative;
}
.batch-input .section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline-end: 2rem;
}
.batch-expand {
  position: absolute;
  inset-block-start: 0.125rem;
  inset-inline-end: 0.125rem;
  color: var(--ui-text-muted);
  flex-shrink: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
  transform: none;
  transition: color 120ms ease;
}
.batch-expand:hover:not(:disabled) {
  background: transparent;
  box-shadow: none;
  color: var(--ui-text-highlighted);
  transform: none;
}
.batch-expand:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}
.demo-row {
  animation: batch-row-enter 180ms ease-out both;
}
@keyframes batch-row-enter {
  from {
    transform: translateY(-6px);
  }
  to {
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .demo-row {
    animation: none;
  }
}

.batch-reveal {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 240ms var(--ease-out);
}
.batch-reveal.is-open {
  grid-template-rows: 1fr;
}
.batch-reveal-inner {
  min-height: 0;
  overflow: hidden;
}
.batch-reveal .batch-results {
  transform: translateY(-8px);
  transition: transform 240ms var(--ease-out);
}
.batch-reveal.is-open .batch-results {
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .batch-reveal,
  .batch-reveal .batch-results {
    transition: none;
  }
}

.demo-highlight {
  outline: 2px solid var(--accent-ink);
  outline-offset: -3px;
}
.batch-workspace {
  border-radius: var(--ui-radius);
  background: var(--panel);
  overflow: hidden;
}
.batch-paste-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-size: var(--text-label);
  color: var(--ui-text-muted);
}
.batch-paste-notice :deep(.field-hint) {
  margin: 0;
}
.batch-match-icon {
  display: grid;
  place-items: center;
  flex: 0 0 1.75rem;
  width: 1.75rem;
  height: 1.75rem;
  color: var(--ui-text-muted);
}
.batch-match-icon.is-linked {
  color: var(--accent-ink);
}
.batch-match-icon.is-uncertain {
  color: var(--ui-warning);
}
.batch-match-icon:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.batch-input-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  margin-top: 0.75rem;
  font-size: var(--text-label);
  color: var(--ui-text-muted);
}
.batch-input-hint {
  margin: 0;
  flex: 1 1 18rem;
}
.batch-input-error {
  color: var(--ui-error);
}
.batch-input-hint {
  transition: color 160ms var(--ease-out);
}
.batch-input-status {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.batch-input-status .has-valid {
  color: var(--ui-text-highlighted);
}
.batch-invalid {
  color: var(--ui-error);
}
.batch-input-footer .batch-clear {
  min-height: 2.75rem;
  padding-inline: 0.5rem;
  border: 0;
  box-shadow: none;
  background: transparent;
  transform: none;
  font-size: inherit;
  color: var(--ui-text-muted);
}
.batch-input-footer .batch-clear:hover:not(:disabled) {
  color: var(--ui-text-highlighted);
  background: transparent;
}
.batch-clear:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
@media (max-width: 600px) {
  .batch-input-hint {
    flex-basis: 100%;
  }
  .batch-input-status {
    flex: 1;
  }
}
.batch-selection-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--control-gap);
}
.batch-toolbar {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 12px 0;
  color: var(--ui-text-muted);
  font-size: var(--text-caption);
}
.batch-results {
  padding: 5px 32px 24px;
  background: var(--wash);
  border-top: 1px solid var(--ui-border);
}
.batch-row {
  display: flex;
  align-items: center;
  gap: var(--control-gap);
  min-height: 72px;
  padding-block: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
}
.batch-name {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  overflow-wrap: anywhere;
}
.batch-account {
  font-size: 0.9375rem;
  line-height: 1.375rem;
  font-weight: 600;
  color: var(--ui-text-highlighted);
}
.batch-name code {
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 500;
  color: var(--ui-text);
}
.batch-name.has-label code {
  font-size: 0.8125rem;
  font-weight: 400;
  color: var(--ui-text-muted);
}
.batch-name small {
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
}
.batch-code {
  font-size: 1.5rem;
  white-space: nowrap;
}
.batch-error-marker {
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  color: var(--ui-error);
}
.batch-error-marker .iconify {
  width: 1.125rem;
  height: 1.125rem;
}
@media (pointer: coarse) {
  .batch-error-marker {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
  }
}
@media (max-width: 600px) {
  .batch-results {
    padding-inline: 20px;
  }
  .batch-toolbar {
    flex-wrap: wrap;
  }
  .batch-row {
    gap: 9px;
    flex-wrap: wrap;
    padding: 14px 0;
  }
  .batch-name {
    flex-basis: 75%;
  }
  .batch-code {
    margin-inline-start: 25px;
    font-size: 1.5rem;
  }
}
</style>
