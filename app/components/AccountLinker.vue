<script setup lang="ts">
const props = defineProps<{
  accounts: string[]
  modelValue: Record<number, string>
  suggestions?: Record<number, string>
}>()
const emit = defineEmits<{
  'update:modelValue': [value: Record<number, string>]
  linked: [index: number]
}>()
const { tx } = useMessages()
const root = useTemplateRef<HTMLElement>('root')
const active = shallowRef('')
const target = shallowRef<number | null>(null)
const pointer = shallowRef<{ x: number; y: number } | null>(null)
const paths = shallowRef<{ d: string; uncertain: boolean }[]>([])
const preview = shallowRef('')
const hoveredAccount = shallowRef<string | null>(null)
const hoveredKey = shallowRef<number | null>(null)
const canvasHeight = shallowRef(0)
let observer: ResizeObserver | undefined
let drag: { id: number; x: number; y: number; element: HTMLElement } | undefined
let frame = 0
const linking = computed(() => !!active.value || target.value !== null)
function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  if (Math.abs(a.y - b.y) < 1) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const mid = (a.x + b.x) / 2
  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`
}
function measure() {
  if (!root.value) return
  const bounds = root.value.getBoundingClientRect()
  canvasHeight.value = Math.max(
    0,
    ...Array.from(root.value.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement)
      .map((el) => el.offsetTop + el.offsetHeight)
  )
  const point = (selector: string, source = false) => {
    const el = root.value!.querySelector<HTMLElement>(selector)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      x: (source ? rect.left : rect.right) - bounds.left,
      y: rect.top + rect.height / 2 - bounds.top + root.value!.scrollTop
    }
  }
  paths.value = Object.entries({ ...props.suggestions, ...props.modelValue }).flatMap(
    ([index, account]) => {
      const a = point(`[data-link-source="${props.accounts.indexOf(account)}"]`, true)
      const b = point(`[data-link-port="${index}"]`)
      return a && b ? [{ d: curve(a, b), uncertain: !props.modelValue[Number(index)] }] : []
    }
  )
  const a = active.value
    ? point(`[data-link-source="${props.accounts.indexOf(active.value)}"]`, true)
    : target.value !== null
      ? point(`[data-link-port="${target.value}"]`)
      : null
  const snapped =
    hoveredAccount.value !== null
      ? point(`[data-link-source="${props.accounts.indexOf(hoveredAccount.value)}"]`, true)
      : hoveredKey.value !== null
        ? point(`[data-link-port="${hoveredKey.value}"]`)
        : null
  preview.value = a
    ? curve(
        a,
        snapped ||
          (pointer.value
            ? {
                x: pointer.value.x - bounds.left,
                y: pointer.value.y - bounds.top + root.value!.scrollTop
              }
            : { x: a.x + (active.value ? -30 : 30), y: a.y })
      )
    : ''
}
function schedule() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measure)
}
function finishDrag() {
  if (drag?.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id)
  drag = undefined
  window.removeEventListener('pointerup', end)
  window.removeEventListener('pointercancel', cancel)
}
function cancel() {
  const wasActive = linking.value
  active.value = ''
  hoveredAccount.value = null
  hoveredKey.value = null
  target.value = null
  pointer.value = null
  finishDrag()
  schedule()
  return wasActive
}
function connect(index: number, account = active.value) {
  if (!account) return
  emit('update:modelValue', { ...props.modelValue, [index]: account })
  emit('linked', index)
  cancel()
}
function unlink(index: number) {
  const value = { ...props.modelValue }
  value[index] = ''
  emit('update:modelValue', value)
  cancel()
}
function targetClick(event: MouseEvent, index: number) {
  if (!active.value) return
  event.preventDefault()
  event.stopPropagation()
  connect(index)
}
function begin(event: PointerEvent, account: string, index: number | null) {
  if (event.button !== 0 || !event.isPrimary) return
  event.preventDefault()
  if (account && target.value !== null) return connect(target.value, account)
  if (index !== null && active.value) return connect(index)
  cancel()
  active.value = account
  target.value = index
  pointer.value = { x: event.clientX, y: event.clientY }
  const element = event.currentTarget as HTMLElement
  element.focus({ preventScroll: true })
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, element }
  element.setPointerCapture(event.pointerId)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', cancel)
  schedule()
}
function sourceClick(event: MouseEvent, account: string) {
  if (event.detail) return
  if (target.value !== null) return connect(target.value, account)
  cancel()
  active.value = account
  schedule()
}
function portClick(event: MouseEvent, index: number) {
  if (event.detail) return
  if (active.value) return connect(index)
  if (props.modelValue[index]) return unlink(index)
  if (props.suggestions?.[index]) return connect(index, props.suggestions[index])
  cancel()
  target.value = index
  schedule()
}
function move(event: PointerEvent) {
  if (!linking.value) return
  pointer.value = { x: event.clientX, y: event.clientY }
  const row = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>('[data-account-source]')
  hoveredAccount.value =
    target.value !== null && row && root.value?.contains(row)
      ? (props.accounts[Number(row.dataset.accountSource)] ?? null)
      : null
  const keyRow = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>('[data-link-target]')
  hoveredKey.value =
    active.value && keyRow && root.value?.contains(keyRow)
      ? Number(keyRow.dataset.linkTarget)
      : null
  schedule()
}
function end(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5
  if (!moved && target.value !== null && props.modelValue[target.value]) return unlink(target.value)
  if (!moved && target.value !== null && props.suggestions?.[target.value])
    return connect(target.value, props.suggestions[target.value])
  const hit = document.elementFromPoint(event.clientX, event.clientY)
  const row = hit?.closest<HTMLElement>('[data-link-target]')
  const source = hit?.closest<HTMLElement>('[data-account-source]')
  if (active.value && row && root.value?.contains(row)) connect(Number(row.dataset.linkTarget))
  else if (target.value !== null && source && root.value?.contains(source))
    connect(target.value, props.accounts[Number(source.dataset.accountSource)])
  else {
    finishDrag()
    if (moved) cancel()
  }
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !event.isComposing && linking.value) {
    event.preventDefault()
    event.stopPropagation()
    cancel()
  }
}
watch(
  () => [props.accounts, props.modelValue, props.suggestions],
  () => nextTick(schedule),
  { deep: true }
)
watch(() => props.accounts, cancel)
onMounted(() => {
  observer = new ResizeObserver(schedule)
  if (root.value) observer.observe(root.value)
  window.addEventListener('pointermove', move)
  window.addEventListener('resize', schedule)
  window.addEventListener('blur', cancel)
  schedule()
})
onBeforeUnmount(() => {
  finishDrag()
  observer?.disconnect()
  cancelAnimationFrame(frame)
  window.removeEventListener('pointermove', move)
  window.removeEventListener('resize', schedule)
  window.removeEventListener('blur', cancel)
})
defineExpose({ cancel })
</script>
<template>
  <div
    ref="root"
    class="account-linker"
    :class="{ 'has-accounts': accounts.length }"
    @scroll.capture="schedule"
    @keydown.capture="keydown"
  >
    <div class="link-keys">
      <div v-if="accounts.length" class="link-column-title">{{ tx('密钥') }}</div>
      <slot
        :active="!!active"
        :hovered-key="hoveredKey"
        :target-click="targetClick"
        :start-target="(event: PointerEvent, index: number) => begin(event, '', index)"
        :port-click="portClick"
      />
    </div>
    <div v-if="accounts.length" class="link-accounts">
      <div class="link-column-title">{{ tx('关联账号') }}</div>
      <div v-for="(account, index) in accounts" :key="account" class="link-account">
        <div
          class="account-target"
          :data-account-source="index"
          :class="{ 'is-target': target !== null, 'is-hovered': hoveredAccount === account }"
          @click="target !== null && connect(target, account)"
        >
          <button
            type="button"
            class="link-port"
            :class="{
              'is-linked': Object.values(modelValue).includes(account),
              'is-active': active === account
            }"
            :data-link-source="index"
            :aria-label="`${tx('关联账号')} · ${account}`"
            :aria-pressed="active === account"
            @pointerdown="begin($event, account, null)"
            @click="sourceClick($event, account)"
          >
            <UIcon name="i-lucide-link" />
          </button>
          <span>{{ account }}</span>
        </div>
      </div>
    </div>
    <svg class="connection-lines" :style="{ height: canvasHeight + 'px' }" aria-hidden="true">
      <path
        v-for="(path, index) in paths"
        :key="index"
        :d="path.d"
        :class="{ uncertain: path.uncertain }"
      />
      <path v-if="preview" :d="preview" class="pending-line" />
    </svg>
  </div>
</template>
<style scoped>
.account-linker {
  position: relative;
  max-height: 24rem;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--control-line) transparent;
}
@supports selector(::-webkit-scrollbar) {
  .account-linker {
    scrollbar-width: auto;
  }
  .account-linker::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .account-linker::-webkit-scrollbar-thumb {
    background: var(--control-line);
    border-radius: 0;
  }
  .account-linker::-webkit-scrollbar-track,
  .account-linker::-webkit-scrollbar-corner {
    background: transparent;
  }
}
.account-linker.has-accounts {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: clamp(1.5rem, 3vw, 2.5rem);
}
.link-accounts,
.link-keys {
  min-width: 0;
}
.link-column-title {
  height: 32px;
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: var(--ui-text-dimmed);
}
.has-accounts :deep(.paste-candidates) {
  margin: 0;
}
.link-accounts {
  padding-top: 0;
  width: max-content;
  max-width: 100%;
  justify-self: end;
}
.link-account {
  display: flex;
  align-items: flex-start;
  padding-top: 10px;
  gap: 0.5rem;
  height: 72px;
  border-bottom: 0;
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
.link-accounts .link-column-title {
  justify-content: flex-end;
}
.account-target {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  width: fit-content;
}
.account-target.is-target {
  cursor: crosshair;
}
.account-target.is-target:hover,
.account-target.is-target.is-hovered {
  outline: 1px dashed var(--accent-ink);
  outline-offset: -1px;
}
.link-account:last-child {
  border-bottom: 0;
}
.account-target > span {
  line-height: 32px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-port {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: crosshair;
  touch-action: none;
  flex-shrink: 0;
}
.link-port .iconify {
  width: 16px;
  height: 16px;
}
.link-port.is-linked,
.link-port.is-active {
  color: var(--accent-ink);
}
.link-port:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}
.connection-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
}
.connection-lines path {
  fill: none;
  stroke: var(--accent-ink);
  stroke-width: 1.5;
  stroke-linecap: round;
  opacity: 0.8;
  vector-effect: non-scaling-stroke;
}
.connection-lines .uncertain {
  stroke: var(--ui-warning, #eab308);
  stroke-dasharray: 3 5;
  opacity: 0.65;
}
.pending-line {
  stroke-dasharray: 4 3;
}
@media (max-width: 600px) {
  .account-linker.has-accounts {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 1.5rem;
  }
  .link-account {
    font-size: 0.75rem;
  }
}
</style>
