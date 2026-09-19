<script setup lang="ts">
import { advanceGuideTime } from '~/utils/guide-timing'
const { tx } = useMessages()
const emit = defineEmits<{
  step: [value: number]
  close: []
  switchMode: []
  demo: [value: { input: number; results: number; copied: string }]
}>()
const step = shallowRef(0)
const paused = shallowRef(false)
const complete = shallowRef(false)
const cursor = shallowRef({ x: 0, y: 0, visible: false })
const clicking = shallowRef(false)
let targetId = ''
let elapsed = 0
let eventIndex = 0
let timer: ReturnType<typeof setInterval> | undefined
let state = { input: 0, results: 0, copied: '' }
const titles = [
  '一次获取多个验证码',
  '先点击输入框',
  '回车换行，继续放入密钥',
  '逐行查看对应结果',
  '先复制一个验证码',
  '再复制全部验证码'
]
const messages = [
  '从空白输入框开始，演示放入四个密钥、查看结果，再分别复制单条和全部验证码。示例不会保存，你原来的输入会在结束后恢复。',
  '先点击输入框，再粘贴第一个账号的密钥。密钥是网站开启两步验证时提供的字母和数字，不是账号密码。',
  '每放入一个密钥就按回车换行。这里加快演示，再放入三个账号的密钥，一行一个，不需要加名称或逗号。',
  '每输入一条密钥，下方就自动增加一条结果。「第 1 条」对应第一行密钥，其余依次对应。每行的六位数字就是该账号当前的验证码。',
  '只登录一个账号时，点击对应行最右侧的复制图标。现在点击第一行，演示只复制这一条验证码。',
  '需要所有结果时，再点击「复制全部有效验证码」。它会一起复制每条记录的名称和验证码。演示不会改动你的剪贴板。'
]
const narration = useGuideNarration(
  () => `${tx(titles[step.value])}。${tx(messages[step.value])}`,
  () => paused.value
)
function toggleNarration() {
  if (!narration.enabled.value) paused.value = false
  narration.toggle()
}
function positionCursor() {
  const target = document.getElementById(targetId)
  if (!targetId || complete.value || !cursor.value.visible) return
  if (!target) return
  const rect = target.getBoundingClientRect()
  cursor.value = {
    x: rect.left + rect.width / 2,
    y: rect.top + Math.min(rect.height / 2, 45),
    visible: true
  }
}
function move(id: string, phase: number) {
  targetId = id
  step.value = phase
  emit('step', phase)
  const target = document.getElementById(id)
  if (
    window.matchMedia('(max-width: 700px), (max-height: 500px) and (pointer: coarse)').matches &&
    target
  ) {
    const rect = target.getBoundingClientRect()
    if (rect.top < 24 || rect.bottom > window.innerHeight - 24)
      target.scrollIntoView({ block: 'center', behavior: 'instant' })
  }
  cursor.value = { ...cursor.value, visible: true }
  positionCursor()
}
function click(patch: Partial<typeof state>) {
  clicking.value = true
  state = { ...state, ...patch }
  emit('demo', { ...state })
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'click' }))
}
const events: [number, () => void][] = [
  [100, () => move('batch-demo-input', 1)],
  [800, () => click({ input: 1, results: 1 })],
  [3300, () => move('batch-demo-input', 2)],
  [3800, () => click({ input: 2, results: 2 })],
  [4250, () => click({ input: 3, results: 3 })],
  [4700, () => click({ input: 4, results: 4 })],
  [
    5700,
    () => {
      step.value = 3
      emit('step', 3)
      targetId = ''
      cursor.value = { ...cursor.value, visible: false }
    }
  ],
  [10200, () => move('batch-demo-copy-1', 4)],
  [10900, () => click({ copied: 'single' })],
  [13900, () => move('batch-demo-copy', 5)],
  [14600, () => click({ copied: 'all' })]
]
function start() {
  clearInterval(timer)
  paused.value = false
  complete.value = false
  targetId = ''
  elapsed = 0
  eventIndex = 0
  clicking.value = false
  cursor.value = { ...cursor.value, visible: false }
  state = { input: 0, results: 0, copied: '' }
  emit('demo', { ...state })
  step.value = 1
  emit('step', 1)
  narration.restart()
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'demo' }))
  timer = setInterval(() => {
    if (paused.value || document.hidden) return
    elapsed = advanceGuideTime(
      elapsed,
      narration.enabled.value ? 27.5 : 50,
      [3300, 5700, 10200, 13900, 14800],
      narration.speaking.value
    )
    clicking.value = false
    while (events[eventIndex] && elapsed >= events[eventIndex]![0]) events[eventIndex++]![1]()
    if (elapsed > 14800) {
      complete.value = true
      targetId = ''
      clicking.value = false
      cursor.value = { ...cursor.value, visible: false }
      if (
        window.matchMedia('(max-width: 700px), (max-height: 500px) and (pointer: coarse)').matches
      )
        document
          .getElementById('usage-guide')
          ?.scrollIntoView({ block: 'start', behavior: 'instant' })
      clearInterval(timer)
    }
  }, 50)
}
onMounted(() => {
  window.addEventListener('resize', positionCursor)
  window.addEventListener('scroll', positionCursor, true)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('resize', positionCursor)
  window.removeEventListener('scroll', positionCursor, true)
})
</script>
<template>
  <aside class="batch-guide" role="dialog" :aria-label="tx('批量取码')">
    <header class="tutorial-title">
      <strong class="batch-guide-heading"
        >{{ tx('批量取码')
        }}<GuideVoiceButton :enabled="narration.enabled.value" @toggle="toggleNarration" /></strong
      ><UButton
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        :aria-label="tx('关闭教学')"
        @click="emit('close')"
      />
    </header>
    <p v-if="narration.issue.value" class="inline-error px-4" role="status">
      {{ tx('当前浏览器无法播放语音，请继续查看文字教学。') }}
    </p>
    <div class="batch-guide-body">
      <h2>
        {{ tx(titles[step]) }}
      </h2>
      <p>{{ tx(messages[step]) }}</p>
      <p class="batch-guide-progress">{{ step ? `${step} / 5` : '' }}</p>
      <UButton
        v-if="!step"
        class="primary-button"
        icon="i-lucide-play"
        data-sound-custom
        @click="start"
        >{{ tx('开始演示') }}</UButton
      >
      <div v-else class="batch-guide-controls">
        <div class="batch-playback-controls">
          <AppHint v-if="!complete" :text="tx(paused ? '继续' : '暂停')"
            ><UButton
              variant="ghost"
              color="neutral"
              :icon="paused ? 'i-lucide-play' : 'i-lucide-pause'"
              :aria-label="tx(paused ? '继续' : '暂停')"
              @click="paused = !paused"
          /></AppHint>
          <AppHint :text="tx('重看')"
            ><UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-rotate-ccw"
              :aria-label="tx('重看')"
              data-sound-custom
              @click="start"
          /></AppHint>
        </div>
        <div class="batch-guide-actions">
          <UButton v-if="complete" variant="outline" color="neutral" @click="emit('switchMode')">{{
            tx('单条取码演示')
          }}</UButton>
          <UButton class="primary-button" @click="emit('close')">{{
            tx(complete ? '我会用了' : '关闭教学')
          }}</UButton>
        </div>
      </div>
    </div>
  </aside>
  <Teleport to="body"
    ><div
      v-if="cursor.visible"
      class="batch-guide-cursor"
      :style="{ transform: `translate3d(${cursor.x}px, ${cursor.y}px, 0)` }"
      aria-hidden="true"
    >
      <span :class="{ clicking }"
        ><svg viewBox="0 0 16 16" width="48" height="48" shape-rendering="crispEdges">
          <path
            fill="#092c30"
            d="M0 0h4v1h1v1h1v1h1v1h1v1h1v1h1v1h2V6h2v3h-1v1h-1v1h1v1h1v1h1v1h1v2h-3v-1h-1v-1h-1v-1h-1v-1H9v1H6v-2h1V9H6V8H5V7H4V6H3V5H2V4H1V3H0Z"
          />
          <path fill="#35c9c0" d="M1 1h2v1h1v1h1v1h1v1h1v1h1v1h1v2H7V8H6V7H5V6H4V5H3V4H2V3H1Z" />
          <path
            fill="#a5fff0"
            d="M1 1h2v1H2v1H1ZM3 2h1v1H3ZM4 3h1v1H4ZM5 4h1v1H5ZM6 5h1v1H6ZM7 6h1v1H7Z"
          />
          <path fill="#168b8a" d="M3 3h1v1H3ZM4 4h1v1H4ZM5 5h1v1H5ZM6 6h1v1H6ZM7 7h2v2H7Z" />
          <path fill="#3baca2" d="M12 7h1v2h-2v2H9v1H7v-1h2V9h2V8h1Z" />
          <path fill="#785335" d="M10 11h1v1h1v1h1v1h1v1h-1v-1h-1v-1h-1v-1h-1Z" />
          <path fill="#bd9560" d="M11 11h1v1h-1ZM12 12h1v1h-1ZM13 13h1v1h-1Z" />
          <path fill="#35c9c0" d="M14 14h1v1h-1Z" /></svg
      ></span></div
  ></Teleport>
</template>
<style scoped>
.batch-guide {
  background: var(--panel);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  overflow: hidden;
}
.batch-guide-heading {
  display: flex;
  align-items: center;
  gap: 8px;
}
.batch-guide header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 3.5rem;
  padding: 0.5rem 0.75rem 0.5rem 1.25rem;
  border-bottom: 1px solid var(--ui-border);
  font-size: var(--text-label);
}
.batch-guide-body {
  padding: 1.25rem;
  min-height: 19rem;
  display: grid;
  grid-template-rows: auto 1fr 2rem auto;
}
.batch-guide-body h2 {
  font-size: var(--text-section);
  margin: 0 0 1rem;
}
.batch-guide-body p {
  line-height: 1.8;
  margin-bottom: 1rem;
}
.batch-guide-progress {
  color: var(--accent-ink);
}
.batch-playback-controls {
  display: flex;
}
.batch-guide-controls {
  flex-wrap: wrap;
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}
.batch-guide-actions {
  display: flex;
  margin-inline-start: auto;
  align-items: stretch;
  gap: 0.5rem;
}
.batch-guide-actions > :deep(button) {
  min-height: 3rem;
  padding-block: 0.5rem;
}
.batch-guide-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  pointer-events: none;
  transition: transform 400ms var(--ease-out);
}
.batch-guide-cursor > span {
  display: block;
  transform-origin: 0 0;
  transition: transform 45ms ease-out;
  filter: drop-shadow(2px 2px 0 #0008);
}
.batch-guide-cursor .clicking {
  transform: translate(1px, 1px) rotate(-12deg);
}
@media (prefers-reduced-motion: reduce) {
  .batch-guide-cursor,
  .batch-guide-cursor > span {
    transition: none;
  }
}
</style>

<style scoped>
@media (max-width: 700px), (max-height: 500px) and (pointer: coarse) {
  .batch-guide-body {
    min-height: 0;
    padding: 1rem;
    grid-template-rows: auto auto auto auto;
  }
  .batch-guide-body p {
    margin-bottom: 0.75rem;
  }
  .batch-guide-controls {
    gap: 0.5rem;
  }
}
</style>
