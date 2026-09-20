<script setup lang="ts">
import { transferText, clipboardText } from '~/utils/transfer-text'
import { historyTarget } from '~/utils/history-navigation'
import PasskeyButton from '~/components/passkeys/PasskeyButton.vue'
const clipboardHint = useClipboardHint()
const secretFocused = shallowRef(false)
function handleSecretFocus() {
  historyOrder = []
  historyCursor = undefined
  secretFocused.value = true
  dismissInputNotices()
}
function dismissInputNotices() {
  clearTimeout(validation)
  issue.value = ''
  pasteIssue.value = ''
  extracted.value = ''
}
function handleSecretBlur() {
  secretFocused.value = false
  recognizeMixedInput()
}
import {
  analyzePaste,
  extractedSurroundingText,
  pastedInputText,
  type PasteAnalysis
} from '~/utils/smart-paste'
import SmartPasteReview from './SmartPasteReview.vue'
import MigrationDialog from './MigrationDialog.vue'
import { isMigrationUri } from '~/utils/ga-migration'
const migrationSource = shallowRef<string | null>(null)
const { tx } = useMessages()
import {
  parseOtp,
  defaults,
  identity,
  DEMO_SECRET,
  type Algorithm,
  type OtpConfig,
  type OtpKind
} from '~/utils/otp'
const props = defineProps<{ guideStep?: number }>()
const emit = defineEmits<{ batch: [value: string]; guideCode: [value: string] }>()
const guiding = computed(() => props.guideStep !== undefined)
const raw = shallowRef(''),
  revealed = shallowRef(true),
  advanced = shallowRef(true),
  qrOpen = shallowRef(false),
  issue = shallowRef(''),
  pasteIssue = shallowRef(''),
  composing = shallowRef(false)
const algorithm = shallowRef<Algorithm>('SHA-1'),
  digits = shallowRef<6 | 8>(6),
  period = shallowRef(30),
  kind = shallowRef<OtpKind>('totp')
const kindItems = [
  { label: 'TOTP', value: 'totp' as const },
  { label: 'Steam Guard', value: 'steam' as const }
]
const algorithmItems = [
  { label: 'SHA-1', value: 'SHA-1' as const },
  { label: 'SHA-256', value: 'SHA-256' as const },
  { label: 'SHA-512', value: 'SHA-512' as const }
]
const digitItems = computed(() => [
  { label: tx('{count} 位', { count: 6 }), value: 6 as const },
  { label: tx('{count} 位', { count: 8 }), value: 8 as const }
])
const periodItems = computed(() => [
  { label: tx('30 秒'), value: 30 },
  { label: tx('60 秒'), value: 60 }
])
const extracted = shallowRef('')
const originalInput = shallowRef('')
const pendingPaste = shallowRef<{ source: string; analysis: PasteAnalysis } | null>(null)
const accountAnalysis = computed(() => analyzePaste(originalInput.value))
const hasAccountSuggestion = computed(
  () =>
    accountAnalysis.value.candidates.length === 1 &&
    accountAnalysis.value.kind === 'review' &&
    !!accountAnalysis.value.accounts?.length
)
function reviewAccount() {
  pendingPaste.value = { source: originalInput.value, analysis: accountAnalysis.value }
}

const restoredDetails = shallowRef({ label: '', issuer: '' })
const historyPreviewIdentity = shallowRef('')
const historyPreview = computed(
  () => !!config.value && historyPreviewIdentity.value === identity(config.value)
)
const field = useTemplateRef<{ inputRef?: HTMLInputElement }>('secretField')
const workspaceRoot = useTemplateRef<HTMLElement>('workspaceRoot')
const reviewHint = shallowRef('')
const qrImage = shallowRef<File>()
const qrImages = shallowRef<File[]>([])
const qrImagePasted = shallowRef(true)
const qrInitialIssue = shallowRef('')
const qrOpenedByDrag = shallowRef(false)
const qrImport = useTemplateRef<{ dropTarget: HTMLElement | null }>('qrImport')
const { loading: imageDropLoading, cancel: cancelImageDrop } = useImageDrop({
  target: () => qrImport.value?.dropTarget,
  outside: () => {
    if (qrOpenedByDrag.value) qrOpen.value = false
  },
  enabled: () =>
    !guiding.value &&
    (!qrOpen.value || qrOpenedByDrag.value) &&
    migrationSource.value === null &&
    !!workspaceRoot.value?.getClientRects().length &&
    (qrOpenedByDrag.value ||
      !document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')),
  enter: () => {
    qrOpenedByDrag.value = true
    qrImagePasted.value = false
    qrOpen.value = true
  },
  image: (file) => {
    qrImagePasted.value = false
    qrImage.value = file
    qrOpen.value = true
  },
  images: (files) => {
    qrImagePasted.value = false
    qrImages.value = files
    qrOpen.value = true
  },
  issue: (message) => {
    qrInitialIssue.value = message
    qrOpen.value = true
  }
})
const pasteConfirmed = shallowRef(false)
let pasteFeedbackTimer: ReturnType<typeof setTimeout> | undefined
function clearPasteFeedback() {
  clearTimeout(pasteFeedbackTimer)
  pasteConfirmed.value = false
}
function confirmPaste() {
  clearPasteFeedback()
  pasteConfirmed.value = true
  pasteFeedbackTimer = setTimeout(clearPasteFeedback, 3000)
}
function pasteText(value: string) {
  inspectPaste(value)
  if (value.trim()) confirmPaste()
}
usePagePaste({
  enabled: () =>
    !guiding.value &&
    !qrOpen.value &&
    migrationSource.value === null &&
    !!workspaceRoot.value?.getClientRects().length,
  input: () => field.value?.inputRef,
  text: pasteText,
  image: (file) => {
    void recognizeImages([file], true)
  }
})
const { dragging: textDragging } = usePageTextDrop({
  target: () => field.value?.inputRef?.closest<HTMLElement>('.secret-field'),
  enabled: () =>
    !guiding.value &&
    !qrOpen.value &&
    migrationSource.value === null &&
    !!workspaceRoot.value?.getClientRects().length,
  input: () => field.value?.inputRef,
  text: inspectPaste
})
watch(qrOpen, (open) => {
  if (!open) {
    cancelImageDrop()
    qrOpenedByDrag.value = false
    qrImage.value = undefined
    qrImages.value = []
    qrInitialIssue.value = ''
  }
})
onBeforeUnmount(() => {
  pasteRevision++
  clearPasteFeedback()
})
const vault = useVault()
const historyKeyboardTipShown = useState('history-keyboard-tip-shown', () => false)
const historyKeyboardHint = shallowRef(false)
let historyHintTimer: ReturnType<typeof setTimeout> | undefined
function closeHistoryHint() {
  historyKeyboardHint.value = false
  clearTimeout(historyHintTimer)
}
function closeActionHint() {
  clipboardHint.visible.value = false
  closeHistoryHint()
}
onBeforeUnmount(closeHistoryHint)
let historyOrder: string[] = []
let historyCursor: string | undefined
watch(
  [vault.enabled, vault.unlocked],
  () => {
    historyOrder = []
    historyCursor = undefined
    if (vault.enabled.value && vault.unlocked.value) closeHistoryHint()
  },
  { flush: 'sync' }
)
function navigateHistory(event: KeyboardEvent) {
  if (
    !['ArrowUp', 'ArrowDown'].includes(event.key) ||
    event.isComposing ||
    composing.value ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    guiding.value
  )
    return
  event.preventDefault()
  if (!vault.enabled.value || !vault.unlocked.value) {
    if (!historyKeyboardTipShown.value) {
      historyKeyboardTipShown.value = true
      historyKeyboardHint.value = true
      historyHintTimer = setTimeout(closeHistoryHint, 8000)
    }
    return
  }
  const records = vault.records.value
  if (!historyOrder.length) {
    // Browse a stable snapshot, including if another tab updates the vault.
    historyOrder = [...records].sort((a, b) => b.usedAt - a.usedAt).map((row) => row.id)
    historyCursor = config.value
      ? records.find((row) => identity(row) === identity(config.value!))?.id
      : undefined
  }
  historyOrder = historyOrder.filter((id) => records.some((row) => row.id === id))
  const target = historyTarget(historyOrder, historyCursor, event.key === 'ArrowUp')
  const record = records.find((row) => row.id === target)
  if (!record || target === historyCursor) return
  historyCursor = target
  acceptPaste(record)
  historyPreviewIdentity.value = identity(record)
}
const displayRaw = computed(() =>
  guiding.value ? (props.guideStep! >= 2 ? DEMO_SECRET : '') : raw.value
)
function toggleAdvanced() {
  advanced.value = !advanced.value
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'parameters' }))
}
function updateRaw(value: string) {
  if (guiding.value) return
  historyOrder = []
  historyCursor = undefined
  if (isMigrationUri(value)) {
    migrationSource.value = value
    raw.value = value
    nextTick(() => {
      raw.value = ''
    })
  } else raw.value = value
}
const inputAnalysis = computed(() => analyzePaste(raw.value))
const config = computed<OtpConfig | null>(() => {
  if (guiding.value) return props.guideStep! >= 2 ? parseOtp(DEMO_SECRET) : null
  if (
    !raw.value.trim() ||
    composing.value ||
    pendingPaste.value ||
    inputAnalysis.value.candidates.length > 1
  )
    return null
  try {
    const kindOptions = kind.value === 'steam' ? { kind: 'steam' as const } : {}
    return parseOtp(raw.value, {
      ...restoredDetails.value,
      ...kindOptions,
      algorithm: algorithm.value,
      digits: digits.value,
      period: period.value
    })
  } catch {
    return null
  }
})
const activeKind = computed(() => config.value?.kind ?? kind.value)
const steamSelected = computed(() => activeKind.value === 'steam')
const isUri = computed(() => /^otpauth:/i.test(raw.value.trim()))
const compactScreen = shallowRef(false)
const resultExpanded = shallowRef(false)
let compactQuery: MediaQueryList | undefined
function updateCompactScreen() {
  compactScreen.value = compactQuery?.matches || false
}
// Keep the result open during edits; only clearing the input collapses it again.
watch([config, raw], () => {
  if (config.value) resultExpanded.value = true
  else if (!raw.value.trim() && !guiding.value) resultExpanded.value = false
})
onMounted(() => {
  compactQuery = window.matchMedia('(max-width: 700px)')
  updateCompactScreen()
  compactQuery.addEventListener('change', updateCompactScreen)
})
onBeforeUnmount(() => compactQuery?.removeEventListener('change', updateCompactScreen))
let pasteRevision = 0
watch(guiding, () => {
  pasteRevision++
})
let validation: ReturnType<typeof setTimeout> | undefined
watch(
  raw,
  () => {
    pasteRevision++
    clearPasteFeedback()
    historyPreviewIdentity.value = ''
    extracted.value = ''
    originalInput.value = ''
    pendingPaste.value = null

    restoredDetails.value = { label: '', issuer: '' }
    // Keep the selected code type while the user enters or replaces a secret.
    algorithm.value = defaults.algorithm
    digits.value = defaults.digits
    period.value = defaults.period
    pasteIssue.value = ''
    issue.value = ''
  },
  { flush: 'sync' }
)
watch([raw, kind, algorithm, digits, period, composing], () => {
  clearTimeout(validation)
  issue.value = ''
  if (!raw.value.trim() || composing.value) return
  validation = setTimeout(() => {
    if (pendingPaste.value || guiding.value) return
    if (!config.value && inputAnalysis.value.candidates.length) {
      inspectPaste(raw.value)
      return
    }
    try {
      parseOtp(raw.value, {
        ...(kind.value === 'steam' ? { kind: 'steam' as const } : {}),
        algorithm: algorithm.value,
        digits: digits.value,
        period: period.value
      })
    } catch (e) {
      issue.value = (e as Error).message
    }
  }, 300)
})
onBeforeUnmount(() => clearTimeout(validation))
function clear() {
  clearPasteFeedback()
  clearTimeout(validation)
  pasteRevision++
  pasteIssue.value = ''
  issue.value = ''
  pendingPaste.value = null
  extracted.value = ''
  originalInput.value = ''

  raw.value = ''
  kind.value = 'totp'
  revealed.value = true
  advanced.value = true
  field.value?.inputRef?.focus()
}
function clearWithSound() {
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'parameters' }))
  clear()
}
watch(
  vault.unlocked,
  (unlocked) => {
    if (!unlocked && historyPreviewIdentity.value) clear()
  },
  { flush: 'sync' }
)
async function paste() {
  const revision = ++pasteRevision
  const hintToken = await clipboardHint.start()
  let hintSuccess = false
  try {
    if (revision !== pasteRevision || guiding.value) return
    let text = await navigator.clipboard.readText()
    if (revision !== pasteRevision || guiding.value) return
    if (!text.trim() && navigator.clipboard.read) {
      const items = await navigator.clipboard.read()
      text = await clipboardText(items)
      if (revision !== pasteRevision || guiding.value) return
      if (!text.trim()) {
        for (const item of items) {
          const type = item.types.find((type) => type.startsWith('image/'))
          if (!type) continue
          const blob = await item.getType(type)
          if (revision !== pasteRevision || guiding.value) return
          await recognizeImages([new File([blob], 'clipboard-image', { type })], true)
          hintSuccess = true
          return
        }
      }
    }
    hintSuccess = true
    pasteText(text)
  } catch {
    if (revision !== pasteRevision) return
    pasteIssue.value = '无法读取剪贴板，请使用系统粘贴。'
  } finally {
    clipboardHint.finish(hintSuccess, hintToken)
  }
}
async function recognizeImages(files: File[], fromPaste = false) {
  qrOpenedByDrag.value = false
  const revision = ++pasteRevision
  pasteIssue.value = ''
  if (files.length > 20) {
    pasteIssue.value = '每次最多选择 20 张图片，请分批导入。'
    return
  }
  const { decodeQrFile } = await import('~/utils/qr-image')
  const { collectQrChoices } = await import('~/utils/qr-choices')
  const { isMigrationUri } = await import('~/utils/ga-migration')
  const values: string[] = []
  const errors: string[] = []
  for (const file of files) {
    if (revision !== pasteRevision) return
    try {
      const decoded = await decodeQrFile(file)
      if (!decoded.length) errors.push('未识别到二维码，请换一张清晰图片。')
      values.push(...decoded)
    } catch (cause) {
      errors.push((cause as Error).message)
    }
  }
  if (revision !== pasteRevision) return
  const result = collectQrChoices(values)
  const ordinary = result.choices.filter((value) => !isMigrationUri(value))
  const migration = result.choices.find(isMigrationUri)
  if (ordinary.length) inspectPaste(ordinary.join('\n'))
  else if (migration) migrationSource.value = migration
  pasteIssue.value =
    errors[0] ||
    (result.unsupported ? '二维码不是 TOTP 配置。' : '') ||
    (!result.choices.length ? '没有可导入的 TOTP 配置。' : '')
  if (fromPaste) confirmPaste()
}
function acceptPaste(value: OtpConfig, source = '') {
  historyPreviewIdentity.value = ''
  raw.value = value.secret
  kind.value = value.kind ?? 'totp'
  algorithm.value = value.algorithm
  digits.value = value.kind === 'steam' || value.digits === 5 ? 6 : value.digits
  period.value = value.period
  restoredDetails.value = { label: value.label, issuer: value.issuer }
  pendingPaste.value = null
  originalInput.value = source
  extracted.value = extractedSurroundingText(source)
    ? '已从粘贴内容中提取密钥，已忽略周围文字。'
    : source && source !== value.secret
      ? '已自动整理输入格式。'
      : ''
  pasteIssue.value = ''
  issue.value = ''
}
function inspectPaste(source: string) {
  historyOrder = []
  historyCursor = undefined
  extracted.value = ''
  originalInput.value = ''
  pasteRevision++
  if (guiding.value) return
  pasteIssue.value = ''
  if (!source.trim()) {
    pasteIssue.value = '剪贴板中没有文本，请先复制密钥。'
    return
  }
  if (isMigrationUri(source.trim())) {
    updateRaw(source.trim())
    return
  }
  // A bare Steam secret may also look like Base32; honor the explicit selection.
  if (kind.value === 'steam' && /^[A-Za-z0-9+/=_-]+$/.test(source.trim())) {
    try {
      acceptPaste(parseOtp(source, { kind: 'steam' }), source)
      return
    } catch {
      // Let normal input validation explain malformed secrets.
    }
  }
  const analysis = analyzePaste(source)
  if (analysis.candidates.length > 1) transferPaste(source)
  else if (analysis.candidates.length === 1) {
    // One key beside exactly one account is the case smart paste exists to
    // recognise, so carry that account through as the record's name.
    const { config, suggestedAccount } = analysis.candidates[0]!
    acceptPaste(
      suggestedAccount && !config.label ? { ...config, label: suggestedAccount } : config,
      source
    )
  } else {
    updateRaw(source)
    pendingPaste.value = null
    pasteIssue.value = analysis.issue || ''
  }
}
function recognizeMixedInput() {
  if (guiding.value || composing.value || !raw.value.trim()) return
  if (config.value && inputAnalysis.value.candidates.length <= 1) return
  if (analyzePaste(raw.value).candidates.length) inspectPaste(raw.value)
}
function finishComposition() {
  composing.value = false
  nextTick(recognizeMixedInput)
}
function handlePaste(event: ClipboardEvent) {
  if (guiding.value || !event.clipboardData) return
  const text = transferText(event.clipboardData)
  if (!text) return
  event.preventDefault()
  const input = event.target as HTMLInputElement
  const start = input.selectionStart ?? 0,
    end = input.selectionEnd ?? raw.value.length
  inspectPaste(pastedInputText(raw.value, text, start, end))
  confirmPaste()
}
defineExpose({ paste: pasteText })
function transferPaste(value: string) {
  pendingPaste.value = null

  emit('batch', value)
}
function importValue(value: string) {
  pendingPaste.value = null
  try {
    acceptPaste(parseOtp(value), value)
  } catch {
    updateRaw(value)
  }
  qrOpen.value = false
}
watch(
  vault.pending,
  (handoff) => {
    if (!handoff) return
    const value = handoff.config
    if (handoff.historyPreview && !vault.unlocked.value) {
      vault.pending.value = undefined
      return
    }
    pendingPaste.value = null

    raw.value = value.secret
    kind.value = value.kind ?? 'totp'
    algorithm.value = value.algorithm
    digits.value = value.kind === 'steam' || value.digits === 5 ? 6 : value.digits
    period.value = value.period
    restoredDetails.value = { label: value.label, issuer: value.issuer }
    historyPreviewIdentity.value = handoff.historyPreview ? identity(value) : ''
    vault.pending.value = undefined
  },
  { immediate: true }
)
onMounted(() => {
  window.addEventListener('pagehide', clear)
})
onBeforeUnmount(() => {
  clearTimeout(validation)
  window.removeEventListener('pagehide', clear)
})
</script>
<template>
  <div
    ref="workspaceRoot"
    class="workspace ore-workspace-frame"
    :class="{ 'is-reviewing': pendingPaste && !guiding }"
  >
    <section class="input-panel" aria-labelledby="secret-heading">
      <div class="section-heading">
        <h2 id="secret-heading" class="workspace-title">{{ tx('输入密钥') }}</h2>
      </div>
      <div class="secret-entry">
        <p class="paste-confirmation" role="status" aria-live="polite">
          <span v-if="pasteConfirmed">{{ tx('已粘贴内容') }}</span>
        </p>
        <label class="sr-only" for="secret">{{ tx('2FA 密钥') }}</label>
        <UInput
          v-show="!pendingPaste || guiding"
          id="secret"
          ref="secretField"
          :model-value="displayRaw"
          :readonly="guiding"
          @update:model-value="updateRaw"
          class="w-full secret-field"
          :class="{ 'is-text-dragging': textDragging }"
          dir="ltr"
          :type="revealed ? 'text' : 'password'"
          size="xl"
          :placeholder="
            !textDragging && (secretFocused || guiding)
              ? tx('密钥：Base32 / otpauth:// / Steam')
              : ''
          "
          autocomplete="off"
          autocapitalize="off"
          :spellcheck="false"
          :aria-invalid="!guiding && !!issue"
          :aria-describedby="!guiding && issue ? 'secret-help secret-error' : 'secret-help'"
          :ui="{
            base: `font-mono text-base h-13 ${
              displayRaw ? 'pr-24' : 'pr-4'
            } ring-[var(--control-line)] focus-visible:ring-primary`
          }"
          @keydown="navigateHistory"
          @paste="handlePaste"
          @compositionstart="composing = true"
          @compositionend="finishComposition"
          @focus="handleSecretFocus"
          @pointerdown="dismissInputNotices"
          @blur="handleSecretBlur"
        >
          <template #default>
            <SecretInputHints
              v-if="!displayRaw && (!secretFocused || textDragging) && !guiding && !pendingPaste"
              :override="textDragging ? tx('将文字拖到此处') : undefined"
              :default-hint="tx('密钥：Base32 / otpauth:// / Steam')"
            />
          </template>
          <template #trailing>
            <div
              class="secret-actions"
              :class="{ 'has-content': !!displayRaw }"
              :inert="!displayRaw"
              :aria-hidden="!displayRaw"
            >
              <AppHint :text="tx(revealed ? '隐藏密钥' : '显示密钥')">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="secret-action"
                  :icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="tx(revealed ? '隐藏密钥' : '显示密钥')"
                  :aria-pressed="revealed"
                  @click="revealed = !revealed"
                />
              </AppHint>
              <UTooltip
                :text="tx('清空')"
                :delay-duration="0"
                :content="{ side: 'top', align: 'center', sideOffset: 4 }"
                :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
                disable-hoverable-content
                arrow
              >
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-x"
                  class="secret-action secret-clear"
                  :aria-label="tx('清空')"
                  :disabled="guiding || (!raw && !pendingPaste)"
                  data-sound-custom
                  @click="clearWithSound"
                />
              </UTooltip>
            </div>
          </template>
        </UInput>
        <SmartPasteReview
          v-if="pendingPaste && !guiding"
          :key="pendingPaste.source"
          :source="pendingPaste.source"
          :analysis="pendingPaste.analysis"
          :initial-associations="
            pendingPaste.source === originalInput && restoredDetails.label
              ? { 0: restoredDetails.label }
              : undefined
          "
          :masked="!revealed"
          @select="acceptPaste"
          @batch="transferPaste"
          @cancel="pendingPaste = null"
          @clear="clear"
          @inspect="inspectPaste"
          @notice="reviewHint = $event"
        />
        <div class="input-tools">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-clipboard-paste"
            :disabled="guiding"
            @click="paste"
            >{{ tx('粘贴') }}</UButton
          >
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-scan-line"
            :disabled="guiding"
            @click="qrOpen = true"
            >{{ tx('导入二维码') }}</UButton
          >
          <PasskeyButton :disabled="guiding" />
        </div>
      </div>
      <div class="input-details">
        <div class="input-notices">
          <p v-if="pendingPaste" class="field-hint" role="status">
            {{ reviewHint || tx('密钥：Base32 / otpauth:// / Steam') }}
          </p>
          <Transition name="input-notice">
            <PasteNotice
              v-if="extracted && !pendingPaste"
              :message="extracted"
              :source="originalInput"
            />
          </Transition>
          <AppHint
            v-if="hasAccountSuggestion && !pendingPaste && !guiding"
            :text="
              tx(
                restoredDetails.label
                  ? '每个密钥都有对应的账号名称。点击可查看或修改。'
                  : '已从粘贴内容认出账号名称，但还没和密钥全部对应。点击确认。'
              )
            "
          >
            <button
              type="button"
              class="account-review-action icon-action"
              :class="{ linked: !!restoredDetails.label }"
              :aria-label="tx('前往关联账号')"
              @click="reviewAccount"
            >
              <UIcon name="i-lucide-link" />
            </button>
          </AppHint>
          <p id="secret-help" class="sr-only">
            {{ tx('密钥：Base32 / otpauth:// / Steam') }}
          </p>
          <Transition name="input-notice">
            <p
              v-if="!guiding && !pendingPaste && issue"
              id="secret-error"
              class="inline-error"
              role="alert"
            >
              {{ tx(issue) }}
            </p>
          </Transition>
          <ActionHint
            :open="clipboardHint.visible.value || historyKeyboardHint"
            :message="
              tx(
                clipboardHint.visible.value
                  ? '如果浏览器询问剪贴板权限，请点允许。'
                  : '请先开启并解锁本地历史。'
              )
            "
            :icon="clipboardHint.visible.value ? 'i-lucide-clipboard-paste' : 'i-lucide-history'"
            @close="closeActionHint"
          />
          <Transition name="input-notice">
            <p v-if="!guiding && pasteIssue" class="inline-notice" role="status">
              {{ tx(pasteIssue) }}
            </p>
          </Transition>
        </div>
        <div class="advanced">
          <button
            class="advanced-toggle"
            data-sound-custom
            :disabled="guiding"
            :aria-label="tx('验证参数')"
            :aria-expanded="advanced && !guiding"
            aria-controls="verification-options"
            @click="toggleAdvanced"
          >
            <span
              class="parameter-sky"
              :class="{ 'is-moon': advanced && !guiding }"
              aria-hidden="true"
            >
              <span class="parameter-sun" />
              <span class="parameter-moon" />
            </span>
          </button>
          <div class="advanced-stage">
            <div
              id="verification-options"
              class="advanced-options"
              :class="{ 'is-hidden': !advanced || guiding }"
              :inert="!advanced || guiding"
              :aria-hidden="!advanced || guiding"
            >
              <p v-if="isUri" class="field-hint">
                {{ tx('参数由配置链接指定，请在原链接中修改。') }}
              </p>
              <div v-else class="option-grid" :class="{ 'steam-options': steamSelected }">
                <div class="option-field option-kind">
                  <McSelect
                    id="otp-kind"
                    v-model="kind"
                    :items="kindItems"
                    :caption="tx('验证方式')"
                  />
                </div>
                <template v-if="!steamSelected">
                  <div class="option-field">
                    <McSelect
                      id="algorithm"
                      v-model="algorithm"
                      :items="algorithmItems"
                      :caption="tx('算法')"
                      :hint="tx('哈希算法')"
                    />
                  </div>
                  <div class="option-field">
                    <McSelect
                      id="digits"
                      v-model="digits"
                      :items="digitItems"
                      :caption="tx('位数')"
                      :hint="tx('验证码长度')"
                    />
                  </div>
                  <div class="option-field">
                    <McSelect
                      id="period"
                      v-model="period"
                      :items="periodItems"
                      :caption="tx('周期')"
                      :hint="tx('更新周期')"
                    />
                  </div>
                </template>
                <div v-else class="steam-profile">
                  <UTooltip
                    :text="
                      tx(
                        '用于已有 Steam 密钥备份的账号：粘贴 shared_secret 或 maFile 内容，即可在浏览器生成登录验证码。本站不能从官方手机 App 导出密钥，也不能替代扫码登录或交易确认。'
                      )
                    "
                    :delay-duration="0"
                    :content="{ side: 'top', align: 'start', sideOffset: 6 }"
                    :ui="{
                      content: 'parameter-help-tooltip',
                      arrow: 'parameter-help-arrow',
                      text: 'whitespace-normal break-words'
                    }"
                    arrow
                  >
                    <button
                      type="button"
                      class="steam-help"
                      :aria-label="`Steam Guard · ${tx('使用说明')}`"
                    >
                      <UIcon name="i-lucide-circle-help" aria-hidden="true" />
                    </button>
                  </UTooltip>
                  <span class="steam-profile-title">Steam Guard</span>
                  <span>{{
                    tx('{digits} 位 · 每 {period} 秒更新', { digits: 5, period: 30 })
                  }}</span>
                </div>
              </div>
            </div>
            <DesertAccent :open="!advanced || guiding" />
          </div>
        </div>
      </div>
    </section>
    <div
      v-if="!pendingPaste || guiding"
      class="result-reveal"
      :class="{ 'is-expanded': resultExpanded }"
      :inert="compactScreen && !resultExpanded"
      :aria-hidden="compactScreen && !resultExpanded ? true : undefined"
    >
      <div class="result-reveal-clip">
        <section class="result-panel" :aria-label="tx('验证码结果')">
          <OtpResult
            compact-layout
            :config="config"
            :history-preview="historyPreview"
            :guide-step="guideStep"
            @code="emit('guideCode', $event)"
          />
        </section>
      </div>
    </div>
  </div>
  <LazyQrImport
    v-if="qrOpen"
    ref="qrImport"
    :initial-image="qrImage"
    :initial-images="qrImages"
    :initial-image-pasted="qrImagePasted"
    :initial-issue="qrInitialIssue"
    :external-drop="qrOpenedByDrag"
    :external-loading="imageDropLoading"
    @pasted="confirmPaste"
    @migration="migrationSource = $event"
    @close="qrOpen = false"
    @dismiss="cancelImageDrop"
    @import="importValue"
    @text="pasteText"
    @batch="
      (value) => {
        qrOpen = false
        emit('batch', value)
      }
    "
  />
  <MigrationDialog
    v-if="migrationSource !== null"
    :initial="migrationSource"
    @close="migrationSource = null"
    @import="importValue"
    @batch="emit('batch', $event)"
  />
</template>

<style scoped>
.account-review-action.linked {
  color: var(--accent-ink);
}
.account-review-action {
  color: var(--ui-warning);
}
.workspace :deep(.result-head) {
  font-size: 1.375rem;
  line-height: 1.4;
}
.secret-entry {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
}
.paste-confirmation {
  position: absolute;
  inset-block-start: -0.75rem;
  inset-inline-end: 0.75rem;
  z-index: 1;
  margin: 0;
  color: var(--accent-ink);
  font-size: var(--text-caption);
  line-height: 1.5rem;
  pointer-events: none;
}
.paste-confirmation span {
  padding-inline: 0.375rem;
  background: var(--panel);
}
.secret-entry .input-tools {
  margin: 0 0 0.25rem;
  flex-wrap: wrap;
}
.input-details {
  min-width: 0;
}
.input-notices {
  /* The account-link button belongs beside the notice, not on its own line. */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem 0.5rem;
  min-height: 1.5rem;
  margin-block: 0.5rem 0.75rem;
}
.input-notices :deep(.field-hint),
.input-notices .inline-error,
.input-notices .inline-notice {
  margin: 0;
  font-size: var(--text-label);
  line-height: 1.5rem;
}
.input-notice-enter-active,
.input-notice-leave-active {
  transition: opacity 180ms ease;
}
.input-notice-enter-from,
.input-notice-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .input-notice-enter-active,
  .input-notice-leave-active {
    transition: none;
  }
}
.workspace :deep(.result-panel) {
  position: relative;
}
.workspace :deep(.result-copy) {
  margin-top: 0;
}
@media (min-width: 701px) and (min-height: 501px), (min-width: 701px) and (pointer: fine) {
  .workspace {
    grid-template-rows: auto auto auto 1fr;
    row-gap: 0.75rem;
  }
  .workspace.is-reviewing {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
  }
  .workspace.is-reviewing .input-panel {
    grid-column: 1;
    grid-row: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    border-inline-end: 0;
  }
  .workspace.is-reviewing .secret-entry {
    align-self: stretch;
    width: 100%;
  }
  .workspace.is-reviewing .input-details {
    display: block;
    margin-top: 0;
  }
  .workspace.is-reviewing .input-notices {
    min-height: 0;
  }
  .input-panel,
  .result-reveal,
  .result-reveal-clip,
  .workspace :deep(.result-panel) {
    display: grid;
    grid-template-rows: subgrid;
    grid-template-columns: minmax(0, 1fr);
    grid-row: 1 / span 4;
  }
  .input-panel {
    grid-column: 1;
  }
  .input-panel,
  .workspace :deep(.result-panel) {
    padding-top: 2.5rem;
  }
  .result-reveal {
    grid-column: 2;
  }
  .section-heading,
  .workspace :deep(.result-head) {
    grid-row: 1;
    margin: 0;
    padding: 0;
    border: 0;
    align-self: start;
  }
  .workspace :deep(.result-head) {
    padding-inline-end: 2rem;
  }
  .secret-entry {
    grid-row: 2;
    align-self: start;
  }
  .secret-entry .input-tools {
    margin-bottom: 0;
  }
  .workspace :deep(.result-code) {
    display: contents;
  }
  .workspace :deep(.otp-digits) {
    /* The input row determines height, never the font metrics of loading digits. */
    position: relative;
    min-height: 0;
    grid-row: 2;
    align-self: stretch;
    margin: 0;
    padding-block: 0;
  }
  .workspace :deep(.otp-slots),
  .workspace :deep(.otp-slot) {
    height: 100%;
  }
  .workspace :deep(.otp-slots) {
    position: absolute;
    inset: 0;
    width: 100%;
  }
  .workspace :deep(.otp-slot) {
    flex: 1;
    min-width: 0;
    width: auto;
  }
  .workspace :deep(.result-progress) {
    grid-row: 4;
    grid-column: 1;
    align-self: start;
    transform: translateY(-50%);
  }
  .workspace :deep(.result-code .countdown-track) {
    margin-top: 0;
    max-width: none;
  }
  .input-details .advanced,
  .workspace :deep(.result-output) {
    grid-row: 4;
  }
  .input-details {
    display: contents;
  }
  .input-notices {
    grid-row: 3;
    margin: 0;
  }
  .input-details .advanced {
    display: flex;
    flex-direction: column;
  }
  .input-details .advanced {
    flex: 1;
  }
  .input-details .advanced-stage {
    margin-top: 0;
    flex: 1;
  }
  .workspace :deep(.result-output) {
    display: grid;
    grid-template-rows: repeat(2, minmax(3rem, auto));
    gap: 1rem;
    grid-column: 1;
    align-self: start;
    margin-top: 1.25rem;
  }
  /* Reserve the actual export row, including wrapped translations, before a code exists. */
  .workspace :deep(.export-reveal) {
    grid-row: 1;
    grid-template-rows: 1fr;
    transition: none;
  }
  .workspace :deep(.result-copy-position) {
    grid-row: 2;
    display: flex;
  }
  .workspace :deep(.result-copy-position .result-copy) {
    flex: 1;
  }
  .workspace :deep(.result-output.has-exports .result-copy-position) {
    grid-row: 1;
  }
  .workspace :deep(.result-output.has-exports .export-reveal) {
    grid-row: 2;
  }
  .workspace :deep(.export-reveal:not(.is-open)) {
    visibility: hidden;
    opacity: 0;
  }
  .workspace :deep(.export-reveal.is-open) {
    transition: opacity 200ms ease 100ms;
  }
  .workspace :deep(.export-reveal .result-links) {
    height: 100%;
    margin-top: 0;
    transform: none;
  }
}
@media (max-width: 700px) {
  .workspace :deep(.result-head) {
    font-size: 1.25rem;
  }
}
@media (max-width: 700px), (max-height: 500px) and (pointer: coarse) {
  .input-details {
    position: relative;
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--ui-border);
  }
  .input-details .input-notices {
    min-height: 0;
    margin: 0 0 0.75rem;
    text-align: start;
  }
  .input-details .advanced {
    position: static;
    border-top: 0;
    padding-top: 0;
  }
  .workspace :deep(.otp-digits) {
    font-size: clamp(2rem, 8vw, 3rem);
  }
  .workspace :deep(.otp-digits.eight) {
    font-size: clamp(1.75rem, 7vw, 2.5rem);
  }
  .workspace :deep(.otp-slots) {
    width: 100%;
    height: 4rem;
  }
  .workspace :deep(.otp-slot) {
    flex: 1;
    width: auto;
    min-width: 0;
    height: 100%;
  }
  .workspace :deep(.result-output) {
    margin-top: 1rem;
  }
}
.advanced-toggle {
  position: absolute;
  inset-inline-end: 0;
  top: -1.375rem;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  justify-content: center;
  background: var(--panel);
  cursor: pointer;
  z-index: 1;
}
.advanced {
  position: relative;
  padding-top: 0.75rem;
}
.parameter-sky {
  position: relative;
  overflow: hidden;
  display: block;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  pointer-events: none;
}
.parameter-sun,
.parameter-moon {
  position: absolute;
  inset: 0;
  image-rendering: pixelated;
  background: var(--panel) url('/textures/sun.png') center / 3rem 3rem no-repeat;
  background-blend-mode: screen;
  mask-image: radial-gradient(circle at center, #000 20%, rgb(0 0 0 / 80%) 35%, transparent 68%);
  pointer-events: none;
  transition:
    opacity 240ms ease-out,
    transform 240ms var(--ease-out);
}
.parameter-moon {
  background-image: url('/textures/moon_phases.png');
  background-size: 11rem 5.5rem;
  background-position: left top;
  opacity: 0;
  transform: translateY(65%);
}
.is-moon .parameter-sun {
  opacity: 0;
  transform: translateY(-65%);
}
.is-moon .parameter-moon {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .parameter-sun,
  .parameter-moon {
    transition: none;
  }
}
.option-grid {
  font-family:
    system-ui,
    -apple-system,
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
}
.secret-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}
.secret-actions.has-content {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}
.secret-actions .secret-action,
.secret-actions .secret-action:hover,
.secret-actions .secret-action:active {
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  min-height: 2rem;
  flex: 0 0 auto;
  padding: 0;
  justify-content: center;
  border: 0;
  background: transparent;
  box-shadow: none;
  transform: none;
  color: var(--ui-text-muted);
}
.secret-actions .secret-action:hover:not(:disabled) {
  color: var(--ui-text-highlighted);
}
.secret-actions .secret-action:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}
.secret-actions .secret-clear {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}
.secret-field:focus-within .has-content .secret-clear {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
}
@media (hover: hover) and (pointer: fine) {
  .secret-field:hover .has-content .secret-clear {
    visibility: visible;
    opacity: 1;
    pointer-events: auto;
  }
}
@media (pointer: coarse) {
  .secret-actions .secret-action,
  .secret-actions .secret-action:hover,
  .secret-actions .secret-action:active {
    width: 2.75rem;
    height: 2.75rem;
    min-width: 2.75rem;
    min-height: 2.75rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .secret-actions,
  .secret-actions .secret-clear {
    transition: none;
  }
}
.advanced-stage {
  display: grid;
}
.advanced-stage > * {
  grid-area: 1 / 1;
  min-width: 0;
}
.advanced-stage .is-hidden {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}
.advanced-options {
  align-self: end;
  transition:
    opacity 200ms ease,
    visibility 0s;
}
.advanced-options.is-hidden {
  transition:
    opacity 160ms ease,
    visibility 0s 160ms;
}
@media (prefers-reduced-motion: reduce) {
  .advanced-options,
  .advanced-options.is-hidden {
    transition: none;
  }
}
.option-field {
  min-width: 0;
}
@media (max-width: 480px) {
  .option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .input-notices {
    min-height: 2.5rem;
  }
  .input-notices :deep(.field-hint),
  .input-notices .inline-error,
  .input-notices .inline-notice {
    font-size: var(--text-caption);
    line-height: 1.25rem;
  }
}
.option-grid.steam-options {
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
}
.steam-profile {
  position: relative;
  display: flex;
  align-items: center;
  align-self: end;
  gap: 0.75rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--ore-outline);
  background: var(--ore-control);
  box-shadow: var(--ore-bevel);
  color: var(--ui-text-highlighted);
  font-size: var(--text-caption);
}
.steam-help {
  position: absolute;
  inset-block-start: -0.625rem;
  inset-inline-start: -0.625rem;
  display: grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--panel);
  color: var(--ui-text-muted);
  font: 600 0.75rem/1 var(--font-sans);
  cursor: help;
}
.steam-help .iconify {
  width: 1.25rem;
  height: 1.25rem;
}
.steam-help:hover,
.steam-help:focus-visible {
  color: var(--ui-text-highlighted);
  border-color: currentColor;
}
.steam-help:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.steam-profile-title {
  font-family: 'VT323', monospace;
  font-size: 1.25rem;
  line-height: 1;
}
@media (max-width: 700px) {
  .option-grid.steam-options {
    grid-template-columns: 1fr;
  }
  .steam-profile {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>

<style scoped>
/* Keep first-paint hints independent of downloaded Latin fonts. */
#secret-help {
  font-family:
    system-ui,
    -apple-system,
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
}
</style>

<style scoped>
.clipboard-permission-notice {
  color: var(--accent-ink);
  font-weight: 600;
}
.secret-field.is-text-dragging {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
</style>

<style scoped>
.workspace.is-reviewing .secret-entry,
.workspace.is-reviewing .input-details {
  width: 100%;
}
.workspace.is-reviewing .advanced-stage .is-hidden {
  display: none;
}
.workspace.is-reviewing .advanced-stage {
  flex: none;
}
</style>

<style scoped>
.workspace.is-reviewing .input-notices {
  margin-block: 0.5rem 1.25rem;
  min-height: 1.5rem;
}
.workspace.is-reviewing .advanced-stage :deep(.desert-accent:not(.is-open)) {
  height: 0;
}
.workspace.is-reviewing .advanced-options {
  align-self: start;
  padding-top: 0.75rem;
}
</style>
