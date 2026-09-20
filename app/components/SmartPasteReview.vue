<script setup lang="ts">
import { analyzePaste, pastedBatchText, type PasteAnalysis } from '~/utils/smart-paste'
import { type OtpConfig } from '~/utils/otp'
const props = defineProps<{
  source: string
  analysis: PasteAnalysis
  masked?: boolean
  matching?: boolean
  initialAssociations?: Record<number, string>
}>()
const emit = defineEmits<{
  select: [config: OtpConfig, source: string]
  batch: [text: string]
  cancel: []
  clear: []
  complete: [text: string, source: string, associations: Record<number, string>]
  inspect: [source: string]
  notice: [message: string]
}>()
const { tx } = useMessages()
const draft = shallowRef(props.source)
watch(
  () => props.source,
  (source) => {
    draft.value = source
  }
)
const associations = ref<Record<number, string>>({})
const accounts = computed(() => result.value.accounts || [])
const linker = useTemplateRef('linker')
const suggestions = computed(() =>
  Object.fromEntries(
    result.value.candidates.flatMap((candidate, index) =>
      candidate.suggestedAccount && !Object.hasOwn(associations.value, index)
        ? [[index, candidate.suggestedAccount]]
        : []
    )
  )
)
const concealed = shallowRef(!!props.masked)
const result = computed(() => analyzePaste(draft.value))
watch(
  result,
  (analysis) => {
    associations.value = Object.fromEntries(
      analysis.candidates.flatMap((candidate, index) =>
        candidate.config.label ? [[index, candidate.config.label]] : []
      )
    )
    if (draft.value === props.source) Object.assign(associations.value, props.initialAssociations)
  },
  { immediate: true }
)
const reviewNotice = computed(
  () =>
    result.value.issue ||
    (!result.value.candidates.length && draft.value.trim()
      ? '未识别到完整密钥，请修改粘贴原文后重试。'
      : accounts.value.length &&
          result.value.candidates.some((_, index) => !associations.value[index])
        ? '账号待确认'
        : '')
)
watch(
  [reviewNotice, () => result.value.candidates.length],
  ([notice, count]) => {
    emit(
      'notice',
      count ? tx('检测到 {count} 条候选密钥', { count }) + (notice ? ' · ' + tx(notice) : '') : ''
    )
  },
  { immediate: true }
)
const panel = useTemplateRef<HTMLElement>('panel')
const inputId = useId()
let animation: Animation | undefined
onMounted(() => {
  if (!panel.value || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  animation = panel.value.animate(
    [{ height: '52px' }, { height: panel.value.offsetHeight + 'px' }],
    {
      duration: 220,
      easing: getComputedStyle(panel.value).getPropertyValue('--ease-out').trim() || 'ease-out'
    }
  )
})
onBeforeUnmount(() => animation?.cancel())
const selected = ref<number[]>(
  props.analysis.kind === 'multiple' ? props.analysis.candidates.map((_, i) => i) : []
)
const candidateIds = computed(() => result.value.candidates.map((_, i) => String(i)))
const selectedIds = computed({
  get: () => selected.value.map(String),
  set: (ids: string[]) => {
    selected.value = ids.map(Number)
  }
})
const {
  surface,
  allSelected,
  start: startSelection,
  click: clickSelection,
  toggleAll,
  cancelSelection
} = useHistorySelection(candidateIds, selectedIds)
watch(draft, () => {
  selected.value = result.value.kind === 'review' ? [] : result.value.candidates.map((_, i) => i)
})
function clearDraft() {
  linker.value?.cancel()
  draft.value = ''
  selected.value = []
  associations.value = {}
  emit('clear')
}
function linked(index: number) {
  if (!selected.value.includes(index)) selected.value.push(index)
}
function reviewKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && linker.value?.cancel()) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  cancelSelection(event)
}
function useSelected() {
  const configs = [...selected.value]
    .sort((a, b) => a - b)
    .filter((i) => result.value.candidates[i])
    .map((i) => {
      const candidate = result.value.candidates[i]!
      return {
        ...candidate.config,
        label: Object.hasOwn(associations.value, i)
          ? associations.value[i] || ''
          : candidate.config.label
      }
    })
  if (configs.length === 1) emit('select', configs[0]!, draft.value)
  else if (props.matching && configs.length > 1)
    emit('complete', pastedBatchText(configs), draft.value, { ...associations.value })
  else if (configs.length > 1) emit('batch', pastedBatchText(configs))
}
</script>
<template>
  <section
    ref="panel"
    class="paste-review"
    :class="{ 'is-empty': !draft.trim() }"
    @keydown="reviewKeydown"
  >
    <div class="paste-source">
      <div class="paste-source-toolbar">
        <label :for="inputId">{{ tx(draft.trim() ? '粘贴原文' : '输入密钥') }}</label>
        <div class="paste-source-actions">
          <AppHint :text="tx(concealed ? '显示密钥' : '隐藏密钥')">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              :icon="concealed ? 'i-lucide-eye' : 'i-lucide-eye-off'"
              :aria-label="tx(concealed ? '显示密钥' : '隐藏密钥')"
              :aria-pressed="!concealed"
              @click="concealed = !concealed"
            />
          </AppHint>
          <AppHint :text="tx('清空')">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-x"
              class="paste-clear"
              :aria-label="tx('清空')"
              data-sound-custom
              @click="clearDraft"
            />
          </AppHint>
        </div>
      </div>
      <UTextarea
        :id="inputId"
        v-model="draft"
        class="w-full"
        :rows="3"
        wrap="soft"
        :maxlength="100000"
        :spellcheck="false"
        :style="{ WebkitTextSecurity: concealed ? 'disc' : undefined }"
        :ui="{ base: 'paste-source-input font-mono text-base' }"
      />
    </div>
    <div class="paste-options" aria-live="polite">
      <div v-if="result.candidates.length" class="paste-review-toolbar">
        <div class="paste-select-all">
          <SelectionCheck
            :checked="allSelected ? true : selected.length ? 'mixed' : false"
            :label="tx(allSelected ? '取消全选' : '全选')"
            @click="toggleAll"
          />
          <button type="button" class="select-all-label" @click="toggleAll">
            {{ tx(allSelected ? '取消全选' : '全选') }}
          </button>
          <span
            class="selection-count"
            :aria-label="tx('检测到 {count} 条候选密钥', { count: result.candidates.length })"
            >{{ selected.length }} / {{ result.candidates.length }}</span
          >
        </div>
        <UPopover
          mode="hover"
          :open-delay="0"
          :close-delay="100"
          enable-touch
          arrow
          :content="{ side: 'top', align: 'end', sideOffset: 2 }"
          :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
        >
          <button type="button" class="review-info" :aria-label="tx('使用说明')">
            <UIcon name="i-lucide-info" aria-hidden="true" />
          </button>
          <template #content>
            <div class="review-tips">
              <p>{{ tx('检测到 {count} 条候选密钥', { count: result.candidates.length }) }}</p>
              <p v-if="reviewNotice">{{ tx(reviewNotice) }}</p>
            </div>
          </template>
        </UPopover>
      </div>
      <p v-if="!result.candidates.length && reviewNotice" class="field-hint" role="alert">
        {{ tx(reviewNotice) }}
      </p>
      <AccountLinker
        v-if="result.candidates.length"
        ref="linker"
        v-model="associations"
        :accounts="accounts"
        :suggestions="suggestions"
        @linked="linked"
        v-slot="{ active, hoveredKey, targetClick, startTarget, portClick }"
      >
        <div
          v-if="result.candidates.length"
          ref="surface"
          class="paste-candidates"
          data-link-scroll
        >
          <div
            v-for="(candidate, i) in result.candidates"
            :key="i"
            class="paste-candidate"
            :data-selection-id="String(i)"
            :class="{ 'has-account-port': accounts.length }"
          >
            <SelectionCheck
              :checked="selected.includes(i)"
              @pointerdown="startSelection($event, String(i))"
              @click="clickSelection($event, String(i))"
              :label="candidate.config.secret"
            />
            <div class="candidate-content">
              <div
                class="candidate-key-line"
                :data-link-target="i"
                :class="{ 'connection-target': active, 'is-hovered': hoveredKey === i }"
                @click.capture="targetClick($event, i)"
              >
                <code>{{
                  concealed
                    ? candidate.config.secret.slice(0, 4) +
                      '••••' +
                      candidate.config.secret.slice(-4)
                    : candidate.config.secret
                }}</code>
                <AppHint
                  v-if="accounts.length"
                  :text="associations[i] ? `${tx('取消')} · ${tx('关联账号')}` : tx('账号待确认')"
                >
                  <button
                    v-if="accounts.length"
                    type="button"
                    class="candidate-port"
                    :class="{ 'is-linked': !!associations[i], 'is-uncertain': !associations[i] }"
                    :data-link-port="i"
                    :aria-label="`${associations[i] ? tx('取消') + ' · ' : ''}${tx('关联账号')} · ${tx('第 {count} 条', { count: i + 1 })}`"
                    @pointerdown="startTarget($event, i)"
                    @click="portClick($event, i)"
                  >
                    <UIcon name="i-lucide-link" />
                  </button>
                </AppHint>
              </div>
              <small
                >{{ candidate.config.algorithm }} ·
                {{ tx('{count} 位', { count: candidate.config.digits }) }} ·
                {{ candidate.config.period }}s</small
              >
            </div>
          </div>
        </div>
      </AccountLinker>
      <div class="paste-actions">
        <UButton
          v-if="result.candidates.length"
          color="neutral"
          variant="soft"
          size="sm"
          trailing-icon="i-lucide-arrow-right"
          :disabled="!selected.length"
          @click="useSelected"
          >{{ tx(selected.length > 1 ? '转到批量取码' : '使用所选密钥') }}</UButton
        >
        <UButton
          class="paste-cancel"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="emit('cancel')"
          >{{ tx('取消') }}</UButton
        >
      </div>
    </div>
  </section>
</template>
<style scoped>
.paste-review {
  width: 100%;
  border: 2px solid var(--control-line);
  background: var(--ore-input);
  box-shadow: var(--ore-inset);
  overflow: hidden;
}
.paste-review.is-empty .paste-options {
  padding-block: 0.375rem;
}
.paste-review.is-empty .paste-actions {
  border-top: 0;
  margin-block: 0;
  padding-top: 0;
}
.paste-review.is-empty .paste-source :deep(.paste-source-input) {
  height: 4rem;
  min-height: 4rem;
  max-height: 4rem;
}
.paste-review-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
}
.paste-select-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ui-text);
  min-height: 44px;
  font-size: var(--text-label);
}
.select-all-label {
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
}
.select-all-label:hover {
  color: var(--ui-text-highlighted);
}
.selection-count {
  color: var(--accent-ink);
  margin-inline-start: 0.25rem;
}
.paste-actions :deep(button) {
  min-height: 2.25rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}
.paste-actions :deep(.paste-cancel),
.paste-actions :deep(.paste-cancel:hover) {
  border: 0;
  box-shadow: none;
  background: transparent;
}
.paste-candidates {
  margin: 0.375rem 0;
  padding-inline: 0;
  scrollbar-gutter: stable;
}
.paste-candidate {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: var(--control-gap);
  padding: 0.5rem 0;
  align-items: start;
  border-bottom: 1px solid var(--ui-border);
}
.paste-candidate:last-child {
  border-bottom: 0;
}
.candidate-content {
  min-width: 0;
  display: grid;
  gap: 0.125rem;
  padding-block: 0.125rem;
}
.paste-candidate code {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9375rem;
  line-height: 1.5rem;
}
.paste-candidate small {
  display: block;
  font-size: 0.8125rem;
  line-height: 1.25rem;
}
@media (pointer: coarse) {
  .paste-candidate {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }
}
.paste-candidate small {
  color: var(--ui-text-muted);
}
.paste-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block: 0.5rem;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--ui-border);
}
.paste-source {
  position: relative;
  min-width: 0;
}
.paste-source-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.25rem 0 0 0.875rem;
}
.paste-source-toolbar label {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.25rem;
}
.paste-source :deep(.paste-source-input) {
  border: 0;
  box-shadow: none;
  outline: none;
  padding: 0.375rem 0.875rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5rem;
  scrollbar-gutter: stable;
  height: 6rem;
  min-height: 6rem;
  max-height: 6rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  resize: none;
  overflow: auto;
}
.paste-source-actions {
  padding-inline: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.paste-source-actions :deep(button),
.paste-source-actions :deep(button:hover),
.paste-source-actions :deep(button:active) {
  width: 2rem;
  min-width: 2rem;
  height: 2rem;
  min-height: 2rem;
  padding: 0;
  justify-content: center;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
  transform: none !important;
  color: var(--ui-text-muted);
}
.paste-source-actions :deep(button:hover) {
  color: var(--ui-text-highlighted);
}
.paste-source-actions :deep(button:focus-visible) {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}
@media (pointer: coarse) {
  .paste-source-actions :deep(button) {
    width: 2.75rem;
    min-width: 2.75rem;
    height: 2.75rem;
    min-height: 2.75rem;
  }
  .paste-source-actions :deep(.paste-clear) {
    opacity: 1;
    pointer-events: auto;
  }
}
.paste-candidates,
.paste-source :deep(textarea) {
  scrollbar-width: thin;
  scrollbar-color: var(--control-line) transparent;
  overscroll-behavior: contain;
}
.paste-source:focus-within::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--accent-ink);
  pointer-events: none;
  z-index: 1;
}
@supports selector(::-webkit-scrollbar) {
  .paste-candidates,
  .paste-source :deep(textarea) {
    scrollbar-width: auto;
  }
  .paste-candidates::-webkit-scrollbar,
  .paste-source :deep(textarea::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }
  .paste-candidates::-webkit-scrollbar-thumb,
  .paste-source :deep(textarea::-webkit-scrollbar-thumb) {
    background: var(--control-line);
    border-radius: 0;
  }
  .paste-candidates::-webkit-scrollbar-track,
  .paste-source :deep(textarea::-webkit-scrollbar-track),
  .paste-candidates::-webkit-scrollbar-corner,
  .paste-source :deep(textarea::-webkit-scrollbar-corner) {
    background: transparent;
  }
}
</style>
<style scoped>
.paste-options :deep(.account-linker) {
  margin-inline-end: -1rem;
  padding-inline-end: 1rem;
}
.paste-options {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--ui-border);
  background: var(--panel);
}
.paste-actions {
  margin-bottom: 0;
}
.paste-actions :deep(.paste-cancel) {
  margin-inline-start: auto;
}
</style>

<style scoped>
.candidate-port {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: crosshair;
}
.candidate-port .iconify {
  width: 16px;
  height: 16px;
}
.candidate-port.is-linked,
.linked-account {
  color: var(--accent-ink);
}
.candidate-port:disabled {
  opacity: 0.4;
  cursor: default;
}
.candidate-port:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
.connection-target {
  cursor: crosshair;
}
.connection-target:hover,
.connection-target.is-hovered {
  outline: 1px dashed var(--accent-ink);
  outline-offset: -1px;
}
</style>

<style scoped>
.review-info {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: default;
}
.review-info .iconify {
  width: 16px;
  height: 16px;
}
.review-info:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
.review-tips {
  max-width: min(18rem, calc(100vw - 3rem));
  padding: 0.125rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}
.review-tips p + p {
  margin-top: 0.375rem;
}
.selection-count {
  font-variant-numeric: tabular-nums;
  font-size: 0.8125rem;
}
</style>

<style scoped>
.paste-candidate.has-account-port {
  grid-template-columns: 32px minmax(0, 1fr);
  height: 72px;
  min-height: 72px;
  border-bottom: 0;
  align-items: center;
}
.paste-candidate.has-account-port code {
  font-size: 0.875rem;
  line-height: 1.375rem;
}
.paste-candidate.has-account-port small {
  font-size: 0.75rem;
  line-height: 1.125rem;
}
.candidate-key-line {
  width: fit-content;
  max-width: 100%;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}
.candidate-key-line code {
  flex: 0 1 auto;
}
.candidate-key-line .candidate-port {
  flex: 0 0 auto;
}
.candidate-port {
  touch-action: none;
  cursor: crosshair;
}
.candidate-port.is-uncertain {
  color: var(--ui-warning, #eab308);
}
.candidate-port.is-linked {
  cursor: pointer;
}
@media (max-width: 600px) {
  .paste-candidate.has-account-port {
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 0.125rem;
  }
  .candidate-port {
    width: 24px;
  }
  .paste-candidate.has-account-port :deep(.selection-check) {
    width: 24px;
  }
}
</style>
