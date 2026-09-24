<script setup lang="ts">
import type { OtpConfig } from '~/utils/otp'
import { pastedBatchText } from '~/utils/smart-paste'
import type { SessionRecord } from '~/composables/useVault'
const { tx, locale } = useMessages()
const vault = useVault()
const emit = defineEmits<{ select: []; batch: [text: string] }>()
const editing = shallowRef<string | null>(null)
const label = shallowRef('')
const error = shallowRef('')
const expanded = ref(new Set<string>())
// Batch children render at 0.875x a top-level row's height (3.5rem vs 4rem,
// see .session-child below) - keep this ratio in sync with the CSS.
const CHILD_ROW_RATIO = 0.875
const visibleCount = computed(() =>
  Math.min(
    6,
    vault.recent.value.reduce(
      (count, row) =>
        count + 1 + (expanded.value.has(row.id) ? (row.batch?.length || 0) * CHILD_ROW_RATIO : 0),
      0
    )
  )
)
async function toggleBatch(id: string, event: MouseEvent) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id)
    return
  }
  expanded.value.add(id)
  const parent = (event.currentTarget as HTMLElement).closest('.session-row')
  await nextTick()
  const child = parent?.nextElementSibling as HTMLElement | null
  const scroller = parent?.closest('.session-rows')
  if (!child || !scroller) return
  /*
   * The panel is still growing and clips the list while it does. Scrolling the
   * new rows into view now would scroll that clip too, dragging the row that
   * was just opened up and out - it then slides back down as the panel
   * finishes. Wait for the height to settle before deciding.
   */
  const body = parent?.closest<HTMLElement>('.session-body')
  let settled = false
  const settle = () => {
    if (settled) return
    settled = true
    if (child.getBoundingClientRect().bottom > scroller.getBoundingClientRect().bottom)
      child.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
  // Row controls finish transitions of their own; only the body's height counts.
  const heightSettled = (event: TransitionEvent) => {
    if (event.target !== body || event.propertyName !== 'height') return
    body?.removeEventListener('transitionend', heightSettled)
    settle()
  }
  body?.addEventListener('transitionend', heightSettled)
  // A panel already at its maximum height never transitions, so cap the wait.
  setTimeout(() => {
    body?.removeEventListener('transitionend', heightSettled)
    settle()
  }, 260)
}
function selectEntry(config: OtpConfig) {
  emit('select')
  vault.pending.value = { config: { ...config }, historyPreview: false }
}
function edit(row: SessionRecord) {
  editing.value = row.id
  label.value = row.label
  error.value = ''
  nextTick(() => document.querySelector<HTMLInputElement>('.session-name-input')?.focus())
}
async function save() {
  if (!editing.value || vault.busy.value) return
  const id = editing.value
  try {
    await vault.editRecent(id, label.value.trim())
    if (editing.value === id) {
      editing.value = null
      error.value = ''
    }
  } catch (cause) {
    if (editing.value === id) error.value = (cause as Error).message
  }
}
watch(
  () => vault.recent.value.map((row) => row.id),
  (ids) => {
    expanded.value = new Set([...expanded.value].filter((id) => ids.includes(id)))
    if (editing.value && !ids.includes(editing.value)) {
      editing.value = null
      error.value = ''
    }
  }
)
function select(row: SessionRecord) {
  if (row.batch) {
    emit('batch', pastedBatchText([...row.batch]))
    return
  }
  emit('select')
  // Session records exist independently of the persistent vault's lock state.
  vault.pending.value = { config: { ...row }, historyPreview: false }
}
function time(value: number) {
  return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(value)
}
</script>
<template>
  <section class="session-history" :aria-label="tx('本次会话')">
    <div class="session-heading">
      <h2>
        {{ tx('本次会话') }} <span class="session-count">{{ vault.recent.value.length }}</span>
      </h2>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-trash-2"
        class="session-clear"
        :disabled="!vault.recent.value.length"
        @click="vault.clearRecent"
      >
        {{ tx('清空') }}
      </UButton>
    </div>
    <Transition
      name="session-reveal"
      @before-leave="(element) => element.setAttribute('inert', '')"
    >
      <div v-if="vault.recent.value.length" class="session-content">
        <div class="session-content-clip">
          <div
            class="session-body"
            :style="{
              '--session-count': expanded.size
                ? visibleCount
                : Math.min(vault.recent.value.length, 3)
            }"
          >
            <div class="session-rows">
              <template v-for="row in vault.recent.value" :key="row.id">
                <div class="session-row" :class="{ 'session-batch': row.batch }">
                  <time>{{ time(row.usedAt) }}</time>
                  <form
                    v-if="editing === row.id"
                    class="session-name session-name-editor"
                    autocomplete="off"
                    @submit.prevent="save"
                  >
                    <input
                      v-model="label"
                      type="text"
                      name="session-record-label"
                      class="session-name-input"
                      :aria-label="tx('标签')"
                      autocomplete="off"
                      data-1p-ignore
                      maxlength="120"
                      @keydown.esc="editing = null"
                    />
                    <button
                      type="submit"
                      class="session-icon"
                      :aria-label="tx('保存')"
                      :disabled="vault.busy.value"
                    >
                      <UIcon name="i-mc-check" />
                    </button>
                    <button
                      type="button"
                      class="session-icon"
                      :aria-label="tx('取消')"
                      @click="editing = null"
                    >
                      <UIcon name="i-lucide-x" />
                    </button>
                  </form>
                  <div v-else class="session-name">
                    <button
                      class="session-label"
                      :class="{ 'record-placeholder': !row.batch && !row.label && !row.issuer }"
                      :aria-expanded="row.batch ? expanded.has(row.id) : undefined"
                      @click="row.batch ? toggleBatch(row.id, $event) : select(row)"
                    >
                      <UIcon
                        v-if="row.batch"
                        :name="
                          expanded.has(row.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'
                        "
                      />
                      {{ row.label || row.issuer || tx(row.batch ? '批量取码' : '未命名记录') }}
                    </button>
                    <button
                      class="session-icon session-edit"
                      :aria-label="tx('编辑记录')"
                      @click="edit(row)"
                    >
                      <UIcon name="i-lucide-pencil" />
                    </button>
                  </div>
                  <code v-if="row.batch">{{
                    tx('有效：{count}', { count: row.batch.length })
                  }}</code>
                  <code v-else>{{ row.secret.slice(0, 4) }}••••{{ row.secret.slice(-4) }}</code>
                  <button
                    class="session-open session-icon"
                    :aria-label="tx(row.batch ? '转到批量取码' : '取码')"
                    @click="select(row)"
                  >
                    <UIcon name="i-lucide-arrow-up-right" />
                  </button>
                </div>
                <template v-if="row.batch && expanded.has(row.id)">
                  <div
                    v-for="(entry, index) in row.batch"
                    :key="index"
                    class="session-row session-child"
                  >
                    <span class="session-record-icon" aria-hidden="true"
                      ><img src="/textures/trial-key.png" alt="" width="32" height="32"
                    /></span>
                    <div class="session-name">
                      <button
                        class="session-label session-child-label"
                        :class="{ 'record-placeholder': !entry.label && !entry.issuer }"
                        @click="selectEntry(entry)"
                      >
                        {{ entry.label || entry.issuer || tx('未命名记录') }}
                      </button>
                    </div>
                    <code>{{
                      tx('{algorithm} · {digits} 位 · {period} 秒', {
                        algorithm: entry.algorithm,
                        digits: entry.digits,
                        period: entry.period
                      })
                    }}</code>
                    <button
                      class="session-open session-icon"
                      :aria-label="tx('取码')"
                      @click="selectEntry(entry)"
                    >
                      <UIcon name="i-lucide-arrow-up-right" />
                    </button>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <p v-if="error" class="inline-error" role="alert">{{ tx(error) }}</p>
  </section>
</template>
<style scoped>
.session-label > .iconify {
  vertical-align: -0.125em;
  margin-inline-end: 0.375rem;
}

.session-history {
  grid-column: 1 / -1;
  --session-row-height: 4rem;
  flex-basis: 100%;
  min-width: 0;
  padding-top: 0.5rem;
  border-top: 1px solid var(--ui-border);
}
.session-heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: space-between;
  flex-wrap: wrap;
}
.session-heading h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: var(--text-section);
  font-weight: 600;
  color: var(--ui-text-highlighted);
}
.session-count {
  min-width: 1.5rem;
  padding: 0.0625rem 0.375rem;
  background: var(--wash);
  line-height: 1.4;
  text-align: center;
  font-size: var(--text-label);
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}
.session-heading .session-clear {
  min-height: 2.75rem;
  padding-inline: 0.75rem;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ui-text-muted);
  transform: none;
  font-size: var(--text-label);
}
.session-heading .session-clear:hover:not(:disabled) {
  background: transparent;
  color: var(--ui-text-highlighted);
}
.session-heading .session-clear:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
.session-content {
  display: grid;
  grid-template-rows: 1fr;
}
.session-content-clip {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.session-reveal-enter-active,
.session-reveal-leave-active {
  transition:
    grid-template-rows 200ms var(--ease-out),
    opacity 200ms var(--ease-out);
}
.session-reveal-enter-from,
.session-reveal-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
.session-reveal-leave-active {
  pointer-events: none;
}
.session-body {
  height: calc(var(--session-count) * var(--session-row-height));
  margin-top: 0.5rem;
  overflow: hidden;
  transition: height 200ms var(--ease-out);
}
/*
 * The list takes its final height at once while the body above animates and
 * clips it. Sized at 100% of the body, it was shorter than rows that had
 * already been added, and flashed a scrollbar until the body caught up.
 */
.session-rows {
  height: calc(var(--session-count) * var(--session-row-height));
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--control-line) transparent;
}
@supports selector(::-webkit-scrollbar) {
  .session-rows {
    scrollbar-width: auto;
  }
  .session-rows::-webkit-scrollbar {
    width: 6px;
  }
  .session-rows::-webkit-scrollbar-thumb {
    background: var(--control-line);
    border-radius: 0;
  }
}
.session-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 1.75rem;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 0.125rem 1rem;
  width: 100%;
  height: var(--session-row-height);
  padding: 0.625rem 0;
  background: transparent;
  border-radius: 0;
  border-bottom: 1px solid var(--ui-border);
  text-align: start;
  font-size: var(--text-body);
}
.session-row.session-child {
  /* Shorter than a top-level row, which also carries a timestamp and an edit
     action, but still tall enough for the name over its parameters. Keep
     CHILD_ROW_RATIO above matched to this height / --session-row-height. */
  height: 3.5rem;
  grid-template-columns: 2.25rem minmax(0, 1fr) auto 1.75rem;
  margin-inline-start: 1.5rem;
  width: calc(100% - 1.5rem);
  font-size: var(--text-label);
}
.session-child-label {
  text-decoration: underline dotted;
  text-underline-offset: 4px;
}
.session-row.session-child > code {
  font-family: inherit;
}
.session-record-icon {
  display: grid;
  place-items: center;
  opacity: 0.85;
}
.session-record-icon img {
  image-rendering: pixelated;
}
.session-row.session-child .session-icon {
  width: 1.375rem;
  height: 1.375rem;
}
.session-row.session-child .session-icon .iconify {
  width: 14px;
  height: 14px;
}
.session-batch > code {
  padding-inline-start: 1.5rem;
  font-family: inherit;
}
.session-batch .session-label[aria-expanded='true'] {
  color: var(--accent-ink);
}
.session-row:hover {
  background: transparent;
}
.session-label:hover {
  color: var(--accent-ink);
}
.session-row time {
  grid-column: 2;
  grid-row: 1 / 3;
  font-size: var(--text-label);
  color: var(--ui-text-muted);
}
.session-row code {
  grid-column: 1;
  grid-row: 2;
  font-family: var(--font-mono);
  font-size: var(--text-label);
  color: var(--ui-text-muted);
  white-space: nowrap;
}
.session-row time {
  font-variant-numeric: tabular-nums;
}
.session-row > .session-open {
  grid-column: 3;
  grid-row: 1 / 3;
  color: var(--ui-text-muted);
}
.session-row.session-child {
  column-gap: 0.5rem;
}
.session-row.session-child > .session-record-icon {
  grid-column: 1;
  grid-row: 1 / 3;
}
.session-row.session-child > .session-name {
  grid-column: 2;
  grid-row: 1;
}
.session-row.session-child > code {
  grid-column: 2;
  grid-row: 2;
}
.session-row.session-child > .session-open {
  grid-column: 4;
  grid-row: 1 / 3;
}
.session-row:last-child {
  border-bottom: 0;
}
@media (prefers-reduced-motion: reduce) {
  .session-body,
  .session-reveal-enter-active,
  .session-reveal-leave-active {
    transition: none;
  }
}
.session-label {
  grid-column: 1;
  grid-row: 1;
  color: var(--ui-text-highlighted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-name {
  grid-column: 1;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}
.session-label {
  min-width: 0;
  text-align: start;
}
.session-icon {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  flex-shrink: 0;
  color: var(--ui-text-muted);
}
.session-icon:hover {
  color: var(--accent-ink);
}
.session-icon:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.session-edit :deep(.iconify) {
  width: 16px;
  height: 16px;
}
.session-edit {
  opacity: 0;
}
.session-row:hover .session-edit,
.session-name:focus-within .session-edit {
  opacity: 1;
}
.session-name-editor {
  justify-self: start;
  width: max-content;
  max-width: 100%;
}
.session-name-input {
  flex: 0 1 12ch;
  min-width: 0;
  width: 12ch;
  height: 1.75rem;
  font-family: var(--font-mono);
  font-size: var(--text-label);
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border-accented);
  padding: 0 0.375rem;
}
.session-name-input:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
@media (hover: none), (pointer: coarse) {
  .session-edit {
    opacity: 1;
  }
}
@media (max-width: 700px) {
  .session-heading h2 {
    font-size: var(--text-body);
  }
  .session-history {
    --session-row-height: 4rem;
    padding-inline: 0;
  }
  .session-row {
    grid-template-columns: minmax(0, 1fr) auto 1.75rem;
    gap: 0.25rem 0.5rem;
  }
  .session-row code {
    grid-row: 2;
    grid-column: 1;
  }
  .session-row > .session-open {
    grid-column: 3;
    grid-row: 1 / 3;
  }
}
</style>
