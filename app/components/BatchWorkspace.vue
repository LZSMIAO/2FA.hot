<script setup lang="ts">
const { tx, message: deferredMessage } = useMessages()
import { analyzePaste, pastedBatchText, parseSmartBatch } from '~/utils/smart-paste'
import { generateOtp, groupCode, remainingSeconds, type BatchEntry } from '~/utils/otp'
import { codeOutput } from '~/utils/code-output'
const props = defineProps<{
  initial?: string
  importVersion?: number
  guideStep?: number
  demo?: { input: number; results: number; copied: string }
}>()
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
const accountReview = computed(() => analyzePaste(parsedRaw.value))
const needsAccountReview = computed(
  () =>
    !guiding.value && accountReview.value.candidates.some((candidate) => candidate.suggestedAccount)
)
const valid = computed(() => entries.value.filter((x) => x.config))
const autoHistoryError = useAutoHistory(() =>
  guiding.value || needsAccountReview.value ? [] : valid.value.map((entry) => entry.config!)
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
  codeCache = nextCache
  codes.value = result
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
    const next = needsAccountReview.value ? [] : parseSmartBatch(parsedRaw.value)
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
    if (value) raw.value = [raw.value.trimEnd(), value].filter(Boolean).join('\n')
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
      valid.value.filter((r) => selected.value.includes(r.line)).map((r) => r.config!)
    )
    note.value = ok ? '所选记录已保存' : '请先开启并解锁本地历史。'
  } catch (e) {
    issue.value = (e as Error).message
  }
}
function clear() {
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
})
onBeforeUnmount(() => {
  sequence++
  clearInterval(timer)
  codeCache.clear()
  window.removeEventListener('pagehide', clear)
})
</script>
<template>
  <p v-if="autoHistoryError" class="inline-error" role="alert">{{ tx(autoHistoryError) }}</p>
  <div class="batch-workspace ore-workspace-frame">
    <div class="batch-input">
      <div class="section-heading">
        <h2 class="workspace-title">{{ tx('批量获取验证码') }}</h2>
      </div>
      <SmartPasteReview
        v-if="needsAccountReview"
        :source="raw"
        :analysis="accountReview"
        @batch="raw = $event"
        @select="raw = pastedBatchText([$event])"
        @cancel="
          raw = pastedBatchText(accountReview.candidates.map((candidate) => candidate.config))
        "
      />
      <UTextarea
        v-else
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
        :placeholder="
          tx('粘贴第一个密钥，按回车换行，再粘贴下一个。\n一行一个密钥，也支持验证器配置链接。')
        "
        :aria-label="tx('批量密钥')"
        aria-describedby="batch-input-hint"
        :ui="{ base: 'font-mono text-base leading-6 px-3 py-3 ring-[var(--control-line)]' }"
        :spellcheck="false"
        autocomplete="off"
      />
      <div class="batch-input-footer">
        <p id="batch-input-hint" class="batch-input-hint">
          {{ tx('最多 100 条 · 仅在当前页面保留') }}
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
      class="batch-reveal"
      :class="{ 'is-open': entries.length > 0 }"
      :inert="!entries.length"
      :aria-hidden="!entries.length"
    >
      <div class="batch-reveal-inner">
        <div
          id="batch-demo-results"
          class="batch-results"
          :class="{ 'demo-highlight': guideStep === 3 }"
        >
          <div class="batch-toolbar">
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
            ><UButton
              id="batch-demo-copy"
              class="primary-button"
              :class="{ 'demo-highlight': guideStep === 5 }"
              size="sm"
              :disabled="!valid.length"
              :icon="
                (copied && copiedLine === 'all') || demoCopied === 'all'
                  ? 'i-lucide-check'
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
            :class="{ 'demo-row': guiding }"
          >
            <input
              v-if="entry.config"
              v-model="selected"
              type="checkbox"
              :value="entry.line"
              :aria-label="tx('选择第 {count} 条', { count: entry.line })"
            /><span v-else class="error-dot">!</span>
            <div class="batch-name">
              <span v-if="entry.config?.label">{{ entry.config.label }}</span>
              <code v-if="entry.config" class="mono">{{ entry.config.secret }}</code>
              <span v-else>{{ tx('第 {count} 条', { count: entry.line }) }}</span>
              <small>{{
                tx(entry.error || (entry.duplicate ? '重复记录' : entry.config?.algorithm))
              }}</small>
            </div>
            <template v-if="entry.config"
              ><span class="batch-code mono">{{
                tx(codes[entry.line] ? groupCode(codes[entry.line]!) : '— — —')
              }}</span
              ><span class="small-label mono"
                >{{ tx(remainingSeconds(entry.config.period, now)) }}s</span
              ><UButton
                color="neutral"
                variant="ghost"
                :id="`batch-demo-copy-${entry.line}`"
                :icon="
                  (copied && copiedLine === entry.line) ||
                  (demoCopied === 'single' && entry.line === 1)
                    ? 'i-lucide-check'
                    : 'i-lucide-copy'
                "
                :class="{ 'demo-highlight': guideStep === 4 && entry.line === 1 }"
                :aria-label="tx('复制第 {count} 条验证码', { count: entry.line })"
                @click="copyRows(entry.line)"
            /></template>
          </div>
        </div>
      </div>
    </div>
    <p v-if="issue || message" class="inline-error px-7 pb-4" role="alert">
      {{ tx(issue || message) }}
    </p>
    <p v-if="note" class="inline-notice px-7 pb-4" role="status">{{ tx(note) }}</p>
  </div>
</template>
<style scoped>
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
  transition: grid-template-rows 240ms cubic-bezier(0.22, 1, 0.36, 1);
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
  transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
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
  outline-offset: 3px;
}
.batch-workspace {
  border-radius: var(--ui-radius);
  background: var(--panel);
  overflow: hidden;
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
.batch-toolbar {
  display: flex;
  justify-content: space-between;
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
  gap: 18px;
  min-height: 72px;
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
.batch-name small {
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
}
.batch-code {
  font-size: 1.5rem;
  white-space: nowrap;
}
.error-dot {
  color: var(--ui-error);
}
input[type='checkbox'] {
  accent-color: var(--action);
  width: 16px;
  height: 16px;
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
