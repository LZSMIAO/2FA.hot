<script setup lang="ts">
import MigrationScanner from './MigrationScanner.vue'
import {
  decodeMigration,
  isMigrationUri,
  appendMigration,
  migrationGroups,
  migrationAccounts,
  migrationAccountKey,
  type MigrationAccount,
  type MigrationPayload
} from '~/utils/ga-migration'
import { parseOtp } from '~/utils/otp'
import { downloadFile } from '~/utils/download'
import { pastedImages, transferText } from '~/utils/transfer-text'
const props = defineProps<{ initial?: string }>()
const emit = defineEmits<{ close: []; import: [value: string]; batch: [value: string] }>()
const { tx } = useMessages()
const { copy, message } = useCopy()
const open = shallowRef(true),
  raw = shallowRef(''),
  issue = shallowRef(''),
  linkOpen = shallowRef(false)
const payloads = shallowRef<MigrationPayload[]>([]),
  selected = shallowRef<string[]>([]),
  qr = shallowRef(''),
  selectedQr = shallowRef('')
const scannerRevision = shallowRef(0)
let qrSequence = 0
let pending: { kind: 'import' | 'batch'; value: string } | undefined
const accounts = computed(() => migrationAccounts(payloads.value))
const groups = computed(() => migrationGroups(payloads.value))
const incomplete = computed(() => groups.value.some((group) => group.missing.length))
function importIssue(account: MigrationAccount) {
  try {
    parseOtp(account.uri)
    return ''
  } catch (e) {
    return (e as Error).message
  }
}
const chosen = computed(() =>
  accounts.value.filter((account) => selected.value.includes(migrationAccountKey(account)))
)
const importable = computed(() => chosen.value.filter((account) => !importIssue(account)))
const scanner = useTemplateRef<{ images: (files: File[]) => Promise<void> }>('scanner')
const progress = useTemplateRef<HTMLElement>('progress')
function accept(values: string[]) {
  const before = accounts.value.length
  // Errors never erase previously scanned fragments, including those from earlier files.
  for (const value of values) {
    try {
      let payload: MigrationPayload
      if (isMigrationUri(value)) payload = decodeMigration(value)
      else {
        if (!value.startsWith('otpauth://')) throw new Error('配置链接格式不正确。')
        const config = parseOtp(value)
        payload = {
          version: 1,
          batchSize: 1,
          batchIndex: 0,
          batchId: '',
          accounts: [
            {
              secret: config.secret,
              name: config.label,
              issuer: config.issuer,
              algorithm: config.algorithm.replace(/-/g, '') as MigrationAccount['algorithm'],
              digits: config.digits,
              type: 'totp',
              counter: '0',
              uri: value
            }
          ]
        }
      }
      const previous = new Set(accounts.value.map(migrationAccountKey))
      payloads.value = appendMigration(payloads.value, payload)
      selected.value = [
        ...selected.value,
        ...accounts.value.map(migrationAccountKey).filter((key) => !previous.has(key))
      ]
    } catch (error) {
      issue.value = (error as Error).message
    }
  }
  // New accounts land below the scanner; bring the progress and next step into view.
  if (accounts.value.length > before)
    nextTick(() =>
      progress.value?.scrollIntoView({
        block: 'nearest',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      })
    )
}
const pasteConfirmed = shallowRef(false)
let pasteTimer: ReturnType<typeof setTimeout> | undefined
function confirmPaste() {
  clearTimeout(pasteTimer)
  pasteConfirmed.value = true
  pasteTimer = setTimeout(() => (pasteConfirmed.value = false), 3000)
}
/**
 * The page ignores pastes while a dialog is open, so this one reads its own:
 * screenshots and copied image files go to the scanner, export links are decoded.
 * The link field below keeps its native paste.
 */
function pasted(event: ClipboardEvent) {
  if (!open.value || event.defaultPrevented || !event.clipboardData) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    target.closest('input, textarea, [contenteditable]:not([contenteditable="false"])')
  )
    return
  const images = pastedImages(event.clipboardData)
  if (images.length) {
    event.preventDefault()
    issue.value = ''
    confirmPaste()
    void scanner.value?.images(images)
    return
  }
  const lines = transferText(event.clipboardData)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return
  event.preventDefault()
  issue.value = ''
  if (lines.length > 100) {
    issue.value = '每次最多 100 条，请分批处理。'
    return
  }
  confirmPaste()
  accept(lines)
}
function decode() {
  issue.value = ''
  if (raw.value.length > 100_000) {
    issue.value = '文本超过 100KB，请分批处理。'
    return
  }
  const lines = raw.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length || lines.length > 100) {
    issue.value = '配置链接格式不正确。'
    return
  }
  accept(lines)
  if (!issue.value) raw.value = ''
}
function clear() {
  payloads.value = []
  selected.value = []
  raw.value = ''
  qr.value = ''
  selectedQr.value = ''
  issue.value = ''
  message.value = ''
  qrSequence++
  scannerRevision.value++
}
const selectionIds = computed(() => accounts.value.map(migrationAccountKey))
const {
  surface,
  start: startSelection,
  click: clickSelection,
  cancelSelection
} = useHistorySelection(selectionIds, selected)
function importAccounts(account?: MigrationAccount) {
  const rows = account ? [account] : importable.value
  if (!rows.length || incomplete.value || rows.some(importIssue)) return
  pending = {
    kind: rows.length === 1 ? 'import' : 'batch',
    value: rows.map((row) => row.uri).join('\n')
  }
  open.value = false
}
function finish() {
  if (pending?.kind === 'import') emit('import', pending.value)
  if (pending?.kind === 'batch') emit('batch', pending.value)
  pending = undefined
  emit('close')
}
async function showQr(account: MigrationAccount) {
  const sequence = ++qrSequence
  selectedQr.value = migrationAccountKey(account)
  qr.value = ''
  try {
    const { toDataURL } = await import('qrcode')
    const value = await toDataURL(account.uri, { width: 288, margin: 4, errorCorrectionLevel: 'M' })
    if (sequence === qrSequence) qr.value = value
  } catch {
    issue.value = '无法生成二维码，请检查输入长度。'
  }
}
onMounted(() => {
  document.addEventListener('paste', pasted)
  if (props.initial?.trim())
    accept(
      props.initial
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
})
onBeforeUnmount(() => {
  qrSequence++
  clearTimeout(pasteTimer)
  document.removeEventListener('paste', pasted)
})
</script>
<template>
  <UModal
    v-model:open="open"
    title="Google Authenticator"
    :description="tx('二维码和配置文件包含密钥，请仅交给需要使用的人。')"
    @after:leave="finish"
  >
    <template #body>
      <div ref="surface" class="modal-stack" @keydown="cancelSelection">
        <p class="migration-instructions">
          {{
            tx(
              '在 Google Authenticator 中打开“转移账号 → 导出账号”，选好账号后生成二维码。在这里扫码或选择截图；有多张二维码时，请全部导入。'
            )
          }}
          {{ tx('也可以直接粘贴截图或导出链接。') }}
        </p>
        <div class="migration-source">
          <PasteConfirmation class="migration-paste-confirmation" :show="pasteConfirmed" />
          <MigrationScanner
            ref="scanner"
            :key="scannerRevision"
            :enabled="open"
            @detected="accept"
            @issue="
              (value) => {
                if (value) issue = value
              }
            "
          />
        </div>
        <UCollapsible v-model:open="linkOpen">
          <UButton color="neutral" variant="ghost" icon="i-lucide-link">{{
            tx('粘贴导出链接')
          }}</UButton>
          <template #content
            ><div class="modal-stack pt-3">
              <UTextarea
                v-model="raw"
                :rows="3"
                :maxlength="100000"
                class="w-full"
                placeholder="otpauth-migration://offline?data=…"
                :aria-label="tx('包含密钥的配置或获取链接')"
                :autofocus="false"
              />
              <UButton color="neutral" variant="outline" :disabled="!raw.trim()" @click="decode">{{
                tx('导入')
              }}</UButton>
            </div></template
          >
        </UCollapsible>
        <div v-if="groups.length" ref="progress" class="migration-progress" role="status">
          <div v-for="(group, index) in groups" :key="group.key" class="migration-group">
            <p>
              <span v-if="groups.length > 1">{{ index + 1 }} · </span>
              {{
                tx(
                  group.missing.length
                    ? '已读取 {count}/{total} 张二维码，还缺第 {missing} 张。'
                    : '已读取 {count}/{total} 张二维码。',
                  {
                    count: group.received,
                    total: group.total,
                    ...(group.missing.length ? { missing: group.missing.join(', ') } : {})
                  }
                )
              }}
            </p>
            <!-- One marker per QR code of the export, filled in as each is read. -->
            <ol v-if="group.total > 1" class="migration-steps" aria-hidden="true">
              <li
                v-for="step in group.total"
                :key="step"
                :class="{ 'is-read': !group.missing.includes(step) }"
              >
                <UIcon v-if="!group.missing.includes(step)" name="i-mc-check" />
                <span v-else>{{ step }}</span>
              </li>
            </ol>
          </div>
          <p v-if="incomplete" class="migration-next">
            {{ tx('在 Google Authenticator 中点“下一步”显示下一张二维码，继续扫描或粘贴截图。') }}
          </p>
          <p>
            {{
              tx(
                '共 {count} 个账户。勾选需要的账户再导入；不支持取码的账户仍可复制密钥和导出二维码。',
                { count: accounts.length }
              )
            }}
          </p>
          <div class="migration-actions">
            <UCheckbox
              :model-value="
                selected.length === accounts.length
                  ? true
                  : selected.length
                    ? 'indeterminate'
                    : false
              "
              :label="tx('全选账户')"
              @update:model-value="
                (value) => (selected = value === true ? accounts.map(migrationAccountKey) : [])
              "
            />
            <UButton color="neutral" variant="ghost" @click="clear">{{ tx('清空') }}</UButton>
          </div>
        </div>
        <p v-if="issue || message" class="inline-error" role="alert">{{ tx(issue || message) }}</p>
        <div
          v-for="(account, index) in accounts"
          :key="migrationAccountKey(account)"
          class="migration-account"
          :data-selection-id="migrationAccountKey(account)"
        >
          <div class="migration-selection">
            <SelectionCheck
              :checked="selected.includes(migrationAccountKey(account))"
              :label="account.name || account.issuer || tx('第 {count} 条', { count: index + 1 })"
              @pointerdown="startSelection($event, migrationAccountKey(account))"
              @click="clickSelection($event, migrationAccountKey(account))"
            />
            <span>{{
              account.name || account.issuer || tx('第 {count} 条', { count: index + 1 })
            }}</span>
          </div>
          <p class="migration-meta">
            {{ account.type.toUpperCase() }} · {{ account.algorithm }} · {{ account.digits
            }}<span v-if="account.type === 'hotp'"> · {{ account.counter }}</span>
          </p>
          <p v-if="importIssue(account)" class="migration-meta">{{ tx(importIssue(account)) }}</p>
          <code class="migration-secret">{{ account.secret }}</code>
          <div class="migration-actions">
            <UButton variant="outline" color="neutral" @click="copy(account.secret)">{{
              tx('复制密钥')
            }}</UButton>
            <UButton variant="outline" color="neutral" @click="copy(account.uri)">{{
              tx('复制配置 URI')
            }}</UButton>
            <UButton variant="outline" color="neutral" @click="showQr(account)">{{
              tx('二维码')
            }}</UButton>
            <UButton
              v-if="!importIssue(account)"
              :disabled="incomplete"
              variant="outline"
              color="neutral"
              @click="importAccounts(account)"
              >{{ tx('取码') }}</UButton
            >
          </div>
          <div v-if="selectedQr === migrationAccountKey(account) && qr" class="migration-qr">
            <img :src="qr" :alt="tx('二维码')" width="288" height="288" />
            <UButton
              variant="outline"
              color="neutral"
              @click="downloadFile(qr, `account-${index + 1}.png`)"
              >{{ tx('下载 PNG') }}</UButton
            >
          </div>
        </div>
      </div>
    </template>
    <template v-if="accounts.length" #footer>
      <div class="migration-footer">
        <p v-if="incomplete" class="migration-footer-hint">
          {{ tx('读取全部二维码后才能导入。') }}
        </p>
        <div class="migration-actions">
          <UButton
            class="primary-button"
            :disabled="!importable.length || incomplete"
            @click="importAccounts()"
            >{{ tx('导入') }} ({{ importable.length }})</UButton
          >
          <UButton
            color="neutral"
            variant="outline"
            :disabled="!chosen.length"
            @click="copy(chosen.map((account) => account.uri).join('\n'))"
            >{{ tx('复制配置 URI') }} ({{ chosen.length }})</UButton
          >
        </div>
      </div>
    </template>
  </UModal>
</template>
<style scoped>
.migration-selection {
  display: flex;
  align-items: center;
  gap: var(--control-gap);
}
.migration-instructions {
  margin: 0;
  line-height: 1.8;
}
.migration-progress {
  padding: 1rem;
  background: var(--wash);
  border: 2px solid var(--ui-border);
}
.migration-progress p {
  margin: 0 0 0.75rem;
  line-height: 1.7;
}
.migration-source {
  position: relative;
  padding-top: 1.5rem;
}
.migration-paste-confirmation {
  position: absolute;
  inset-block-start: 0;
  inset-inline-end: 0;
  line-height: 1.25rem;
}
.migration-group {
  margin-bottom: 0.75rem;
}
.migration-group p {
  margin-bottom: 0.5rem;
}
.migration-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.migration-steps li {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 2px dashed var(--ui-border);
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}
.migration-steps li.is-read {
  border-style: solid;
  border-color: var(--action);
  background: var(--action);
  color: white;
  box-shadow: var(--ore-bevel);
}
.migration-next {
  color: var(--accent-ink);
  font-weight: 600;
}
.migration-footer {
  width: 100%;
}
.migration-footer-hint {
  width: 100%;
  margin: 0 0 0.5rem;
  color: var(--ui-text-muted);
  font-size: var(--text-caption);
}
.migration-account {
  border-top: 2px solid var(--ui-border);
  padding-top: 1rem;
  display: grid;
  gap: 0.75rem;
  min-width: 0;
}
.migration-account h3 {
  margin: 0;
  overflow-wrap: anywhere;
}
.migration-meta {
  margin: 0;
  color: var(--ui-text-muted);
}
.migration-secret {
  overflow-wrap: anywhere;
  white-space: normal;
  padding: 0.75rem;
  background: var(--wash);
}
.migration-actions,
.migration-batches {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.migration-qr {
  display: grid;
  justify-items: center;
  gap: 1rem;
}
.migration-qr img {
  max-width: 100%;
  height: auto;
}
</style>
