<script setup lang="ts">
import { singleGuideTimeline } from '~/utils/guide-timeline'
import { advanceGuideTime } from '~/utils/guide-timing'
import { DEMO_SECRET } from '~/utils/otp'

const localePath = useLocalePath()
const { tx } = useMessages()

const props = defineProps<{ code: string }>()
const emit = defineEmits<{ close: []; switchMode: []; step: [value: number] }>()
const elapsed = shallowRef(0)
const started = shallowRef(false)
const paused = shallowRef(false)
const reducedMotion = shallowRef(false)
const copiedCode = shallowRef('')
const cursor = shallowRef({ x: 0, y: 0, visible: false })
const panel = useTemplateRef<HTMLElement>('panel')
const duration = singleGuideTimeline.duration
const complete = computed(() => elapsed.value >= duration)
const phase = computed(() =>
  started.value ? singleGuideTimeline.phases.filter((at) => elapsed.value >= at).length : 0
)
const finished = computed(() => complete.value || phase.value === 5)
const steps = [
  {
    at: singleGuideTimeline.steps[0],
    title: tx('复制密钥'),
    detail:
      '如果你已经有别人提供或以前保存的 2FA 密钥，直接复制即可，不用重新设置账号。密钥是一长串字母和数字，不是登录密码，也不是会过期的六位验证码。'
  },
  {
    at: singleGuideTimeline.steps[1],
    title: tx('在首页取码'),
    detail:
      '回到 2fa.hot，把刚才那串密钥粘贴到左侧“密钥”框。右侧会生成通常为 6 位的验证码。原网站要的是这个验证码，不是那串密钥。'
  },
  {
    at: singleGuideTimeline.steps[2],
    title: tx('填回原网站'),
    detail:
      '点击“复制验证码”，切回原网站，粘贴到它的验证码框，再点击确认。若倒计时已结束，请复制新生成的验证码，不要继续使用旧码。'
  },
  {
    at: singleGuideTimeline.steps[3],
    title: tx('验证成功'),
    detail:
      '原网站用相同的密钥和当前时间核对验证码，匹配后通过验证。以后需要验证码时，用同一份密钥重新取码；密钥请自己保管，不要发给别人。'
  }
]
const activeStep = computed(() =>
  phase.value >= 5
    ? 3
    : elapsed.value >= singleGuideTimeline.verificationAt
      ? 2
      : phase.value >= 2
        ? 1
        : 0
)
const narration = useGuideNarration(
  () =>
    started.value
      ? `${steps[activeStep.value]!.title}。${tx(steps[activeStep.value]!.detail)}`
      : tx('就是“验证器”。2fa.hot 和验证器 App 一样，用密钥生成一次性验证码。'),
  () => paused.value
)
function toggleNarration() {
  if (!narration.enabled.value) paused.value = false
  narration.toggle()
}
const movements = singleGuideTimeline.movements
const targetId = computed(
  () => movements.findLast((m) => elapsed.value >= m.at)?.target || 'tutorial-copy-secret'
)
const clicking = shallowRef(false)
let clickTimer: ReturnType<typeof setTimeout> | undefined
function clickFeedback() {
  clicking.value = true
  clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clicking.value = false
  }, 100)
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'click' }))
}
let lastTick = 0
let timer: ReturnType<typeof setInterval> | undefined
let preference: MediaQueryList | undefined
let lastTarget = ''

watch(
  phase,
  (value) => {
    if (value === 3 || value === 4) copiedCode.value ||= props.code
    emit('step', value)
  },
  { immediate: true }
)
watch(
  () => props.code,
  (value) => {
    if (phase.value >= 3 && !copiedCode.value) copiedCode.value = value
  }
)
function positionCursor() {
  if (!started.value || complete.value || reducedMotion.value) {
    cursor.value = { ...cursor.value, visible: false }
    return
  }
  const target = document.getElementById(targetId.value)
  if (!target) return
  if (lastTarget !== targetId.value) {
    lastTarget = targetId.value
    const rect = target.getBoundingClientRect()
    const compact =
      !window.matchMedia('(max-width: 700px), (max-height: 500px) and (pointer: coarse)').matches &&
      window.innerWidth <= 1000
    const occupied = compact && panel.value ? panel.value.getBoundingClientRect().height + 32 : 0
    const available = window.innerHeight - occupied
    if (
      (window.matchMedia('(max-width: 700px), (max-height: 500px) and (pointer: coarse)').matches ||
        !panel.value?.contains(target)) &&
      (rect.top < 24 || rect.bottom > available - 24)
    ) {
      window.scrollBy({
        top: rect.top + rect.height / 2 - available / 2,
        behavior:
          reducedMotion.value ||
          window.matchMedia('(max-width: 700px), (max-height: 500px) and (pointer: coarse)').matches
            ? 'instant'
            : 'smooth'
      })
    }
  }
  const rect = target.getBoundingClientRect()
  cursor.value = {
    x: rect.left + rect.width * 0.58,
    y: rect.top + rect.height * 0.58,
    visible: true
  }
}
function start() {
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'demo' }))
  clearTimeout(clickTimer)
  clicking.value = false
  started.value = true
  elapsed.value = 0
  copiedCode.value = ''
  paused.value = reducedMotion.value
  lastTarget = ''
  lastTick = performance.now()
  positionCursor()
  narration.restart()
}
function chooseStep(index: number) {
  started.value = true
  copiedCode.value ||= props.code
  elapsed.value = steps[index]!.at
  paused.value = true
  lastTarget = ''
  nextTick(positionCursor)
}
function togglePlayback() {
  paused.value = !paused.value
  lastTick = performance.now()
}
function updatePreference() {
  reducedMotion.value = preference?.matches || false
  if (reducedMotion.value) paused.value = true
}
function visibilityChanged() {
  if (document.hidden) paused.value = true
}
onMounted(() => {
  panel.value?.focus({ preventScroll: true })
  preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updatePreference()
  preference.addEventListener('change', updatePreference)
  document.addEventListener('visibilitychange', visibilityChanged)
  lastTick = performance.now()
  timer = setInterval(() => {
    const now = performance.now()
    const before = elapsed.value
    if (started.value && !paused.value && !complete.value)
      elapsed.value = Math.min(
        duration,
        advanceGuideTime(
          elapsed.value,
          Math.min(now - lastTick, 100) * (narration.enabled.value ? 0.45 : 0.9),
          singleGuideTimeline.narrationBoundaries,
          narration.speaking.value
        )
      )
    if (singleGuideTimeline.phases.some((at) => before < at && elapsed.value >= at)) clickFeedback()
    lastTick = now
    if (started.value && !complete.value) positionCursor()
  }, 50)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  clearTimeout(clickTimer)
  preference?.removeEventListener('change', updatePreference)
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <aside
    ref="panel"
    tabindex="-1"
    class="tutorial-window"
    role="dialog"
    :aria-label="tx('2FA 操作教学')"
    :class="{ started }"
  >
    <div class="tutorial-title">
      <span
        ><UIcon name="i-lucide-user-round" />{{ tx('示例社交账号')
        }}<GuideVoiceButton :enabled="narration.enabled.value" @toggle="toggleNarration" /></span
      ><UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        :aria-label="tx('关闭教学')"
        @click="emit('close')"
      />
    </div>
    <p v-if="narration.issue.value" class="inline-error px-4" role="status">
      {{ tx('当前浏览器无法播放语音，请继续查看文字教学。') }}
    </p>
    <div v-if="!started" class="tutorial-intro">
      <h2>{{ tx('Authenticator 是什么？') }}</h2>
      <p>{{ tx('就是“验证器”。2fa.hot 和验证器 App 一样，用密钥生成一次性验证码。') }}</p>
      <h3>{{ tx('为什么它能验证身份？') }}</h3>
      <p>
        {{
          tx(
            '验证器和原网站用同一份密钥与当前时间计算，通常每 30 秒换一组验证码。结果一致，就能完成双重验证。'
          )
        }}
      </p>
      <p class="tutorial-muted">
        {{
          tx('接下来，模拟鼠标会直接在首页演示。只使用公开示例数据，你原来的输入会在结束后恢复。')
        }}
      </p>
      <UButton
        class="primary-button w-full"
        icon="i-lucide-play"
        data-sound-custom
        @click="start"
        >{{ tx('开始演示') }}</UButton
      >
    </div>
    <template v-else>
      <div class="tutorial-scene" aria-hidden="true">
        <Transition name="guide-screen" mode="out-in">
          <div v-if="phase < 5" key="form" class="tutorial-form">
            <div class="social-avatar">
              <img src="/textures/trial-key.png" alt="" width="32" height="32" />
            </div>
            <h2>
              {{ tx(elapsed < singleGuideTimeline.verificationAt ? '密钥' : '验证你的登录') }}
            </h2>
            <template v-if="elapsed < singleGuideTimeline.verificationAt">
              <p>{{ tx('将这份密钥添加到验证器') }}</p>
              <div class="tutorial-secret mono">{{ tx(DEMO_SECRET) }}</div>
              <div
                id="tutorial-copy-secret"
                class="simulated-button"
                :class="{ copied: phase >= 1 }"
              >
                <UIcon :name="phase >= 1 ? 'i-mc-check' : 'i-lucide-copy'" />{{
                  tx(phase >= 1 ? '密钥已复制' : '复制密钥')
                }}
              </div>
            </template>
            <template v-else>
              <p>{{ tx('请输入验证器中的六位验证码') }}</p>
              <div id="tutorial-login-code" class="tutorial-code-input">
                <span v-for="index in 6" :key="index" :class="{ filled: phase >= 4 }">{{
                  tx(phase >= 4 ? copiedCode[index - 1] : '')
                }}</span>
              </div>
              <div id="tutorial-submit" class="simulated-button">
                {{ tx('验证并登录') }}<UIcon name="i-lucide-arrow-right" />
              </div>
            </template>
          </div>
          <div v-else key="success" class="tutorial-success">
            <span><UIcon name="i-mc-check" /></span>
            <h2>{{ tx('验证成功') }}</h2>
            <p>{{ tx('示例账号已登录') }}</p>
          </div>
        </Transition>
      </div>
      <div class="tutorial-caption" aria-live="polite">
        <span>{{ tx(activeStep + 1) }} / 4</span><strong>{{ tx(steps[activeStep]!.title) }}</strong>
        <p>{{ tx(steps[activeStep]!.detail) }}</p>
      </div>
      <p class="tutorial-link-tip">
        {{ tx('通过链接取码') }}：<code dir="ltr">https://2fa.hot/2fa#{{ tx('密钥') }}</code>
        <span>{{ tx('把链接末尾的“密钥”换成你自己的完整密钥，打开就能查看当前验证码。') }}</span>
        <NuxtLink :to="localePath('/help#links')" @click="emit('close')"
          >{{ tx('使用说明') }} ↗</NuxtLink
        >
      </p>
      <div class="tutorial-controls">
        <div>
          <AppHint v-if="!reducedMotion && !finished" :text="tx(paused ? '继续' : '暂停')"
            ><UButton
              color="neutral"
              variant="ghost"
              :icon="paused ? 'i-lucide-play' : 'i-lucide-pause'"
              :aria-label="tx(paused ? '继续' : '暂停')"
              @click="togglePlayback"
          /></AppHint>
          <AppHint :text="tx('重看')"
            ><UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-rotate-ccw"
              :aria-label="tx('重看')"
              @click="start"
          /></AppHint>
        </div>
        <div class="tutorial-actions">
          <UButton v-if="finished" variant="outline" color="neutral" @click="emit('switchMode')">{{
            tx('批量取码演示')
          }}</UButton>
          <UButton
            v-if="activeStep < 3"
            class="primary-button tutorial-next"
            @click="chooseStep(activeStep + 1)"
            >{{ tx('下一步') }}</UButton
          ><UButton v-else-if="finished" class="primary-button" @click="emit('close')">{{
            tx('我会用了')
          }}</UButton>
        </div>
      </div>
    </template>
  </aside>
  <Teleport to="body"
    ><div
      v-if="cursor.visible && !reducedMotion && phase < 5"
      class="tutorial-cursor"
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
.tutorial-window {
  align-self: start;
  position: relative;
  z-index: 30;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--panel);
  box-shadow: var(--ore-window-shadow);
  overflow: hidden;
}
.tutorial-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 3.5rem;
  padding: 0.5rem 0.75rem 0.5rem 1.25rem;
  border-bottom: 1px solid var(--ui-border);
  font-size: var(--text-label);
}
.tutorial-title > span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.tutorial-intro {
  padding: 1.5rem;
}
.tutorial-intro h2,
.tutorial-intro h3 {
  font-size: var(--text-body);
  font-weight: 600;
  margin: 0 0 0.75rem;
}
.tutorial-intro h3 {
  margin-top: 1.5rem;
}
.tutorial-intro p {
  font-size: var(--text-label);
  line-height: 1.85;
  margin: 0.5rem 0;
}
.tutorial-intro strong {
  font-weight: 500;
}
.tutorial-intro .tutorial-muted {
  color: var(--ui-text-muted);
  font-size: var(--text-caption);
  margin: 1.25rem 0;
}
.tutorial-scene {
  position: relative;
  min-height: 19rem;
  padding: 1.5rem;
  background: var(--wash);
}
.tutorial-form {
  text-align: center;
}
.social-avatar img {
  image-rendering: pixelated;
}
.social-avatar {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--ui-radius);
  background: var(--panel);
  margin: 0 auto 0.75rem;
  font-size: 1.125rem;
  color: var(--ui-text-muted);
}
.tutorial-form h2,
.tutorial-success h2 {
  margin: 0;
  font-size: var(--text-section);
  font-weight: 600;
}
.tutorial-form p,
.tutorial-success p {
  color: var(--ui-text-muted);
  font-size: var(--text-caption);
  margin: 0.5rem 0 1.25rem;
}
.tutorial-secret {
  padding: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--panel);
  font-size: var(--text-caption);
  overflow-wrap: anywhere;
  text-align: start;
}
.simulated-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  margin-top: 1rem;
  border-radius: var(--ui-radius);
  color: white;
  background: var(--action);
  font-size: var(--text-label);
  transition: background-color 180ms;
}
.simulated-button.copied {
  background: var(--copy-success);
}
.tutorial-code-input {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.375rem;
}
.tutorial-code-input > span {
  display: grid;
  place-items: center;
  height: 3rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--panel);
  font-family: var(--font-mono);
  font-size: 1.25rem;
}
.tutorial-code-input .filled {
  border-color: var(--accent-ink);
}
.tutorial-success {
  display: flex;
  min-height: 16rem;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.tutorial-success > span {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1.25rem;
  border-radius: var(--ui-radius);
  background: var(--copy-success);
  color: white;
  font-size: 1.5rem;
  animation: success-in 240ms var(--ease-out);
}
.tutorial-caption {
  padding: 1rem 1.25rem 0;
  min-height: 10rem;
}
.tutorial-caption > span {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--accent-ink);
  margin-inline-end: 0.5rem;
}
.tutorial-caption strong {
  font-size: var(--text-label);
  font-weight: 600;
}
.tutorial-caption p {
  color: var(--ui-text);
  font-size: var(--text-label);
  line-height: 1.8;
  margin-top: 0.5rem;
}
.tutorial-controls {
  flex-wrap: wrap;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  gap: 0.25rem;
}
.tutorial-controls .tutorial-next {
  min-height: 2.25rem;
  padding-block: 0.25rem;
}
.tutorial-controls > div {
  display: flex;
}
.tutorial-controls > .tutorial-actions {
  margin-inline-start: auto;
  align-items: stretch;
  gap: 0.5rem;
}
.tutorial-actions > :deep(button) {
  min-height: 3rem;
  padding-block: 0.5rem;
}
.tutorial-footnote {
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
  padding: 0 1.25rem 1rem;
  margin: 0;
}
.tutorial-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  pointer-events: none;
  transition: transform 400ms var(--ease-out);
}
.tutorial-cursor > span {
  display: block;
  filter: drop-shadow(2px 2px 0 #0008);
  transform-origin: 0 0;
  transition: transform 45ms ease-out;
}
.tutorial-cursor .clicking {
  transform: translate(1px, 1px) rotate(-12deg);
}
.guide-screen-enter-active,
.guide-screen-leave-active {
  transition: none;
}
@keyframes success-in {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@media (max-width: 1000px) {
  .tutorial-window {
    max-height: calc(100svh - 1.5rem);
    overflow-y: auto;
    border-radius: var(--ui-radius);
  }
  .tutorial-window:not(.started) {
    max-width: 28rem;
    margin: auto;
  }
  .tutorial-window.started {
    max-width: 32rem;
    margin: auto;
  }
  .tutorial-title {
    min-height: 2.5rem;
    padding-block: 0.125rem;
  }
  .tutorial-scene {
    min-height: 9rem;
    padding: 0.75rem 1rem;
  }
  .tutorial-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 0.75rem;
    align-items: center;
    text-align: start;
  }
  .social-avatar {
    display: none;
  }
  .tutorial-form h2 {
    font-size: var(--text-label);
  }
  .tutorial-form p {
    grid-column: 1;
    margin: 0.375rem 0;
  }
  .tutorial-secret,
  .tutorial-code-input {
    grid-column: 2;
    grid-row: 1 / 3;
  }
  .tutorial-secret {
    font-size: 0.75rem;
    padding: 0.5rem;
  }
  .simulated-button {
    grid-column: 1 / -1;
    margin-top: 0.5rem;
  }
  .tutorial-code-input {
    gap: 0.125rem;
  }
  .tutorial-code-input > span {
    height: 2.25rem;
    font-size: 1rem;
    border-radius: var(--ui-radius);
  }
  .tutorial-caption {
    min-height: 0;
    padding: 0.5rem 1rem 0;
  }
  .tutorial-caption p {
    margin-top: 0.25rem;
  }
  .tutorial-controls {
    flex-wrap: wrap;
    padding: 0.25rem 0.5rem;
  }
  .tutorial-footnote {
    display: none;
  }
  .tutorial-success {
    min-height: 7.5rem;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .tutorial-success > span {
    width: 2rem;
    height: 2rem;
    margin: 0;
    font-size: 1.125rem;
  }
  .tutorial-success p {
    width: 100%;
    margin: 0;
    text-align: center;
  }
}
</style>

<style scoped>
.tutorial-link-tip {
  margin: 0;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--ui-border);
  font-size: var(--text-label);
  line-height: 1.8;
}
.tutorial-link-tip code {
  display: block;
  overflow-wrap: anywhere;
  color: var(--ui-text-highlighted);
  user-select: all;
}
.tutorial-link-tip a {
  color: var(--ui-text-highlighted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>

<style scoped>
@media (max-width: 700px), (max-height: 500px) and (pointer: coarse) {
  .tutorial-window,
  .tutorial-window.started,
  .tutorial-window:not(.started) {
    max-width: none;
    max-height: none;
    overflow: visible;
  }
  .tutorial-controls {
    gap: 0.5rem;
  }
  .tutorial-controls > div {
    margin-inline-end: auto;
  }
  .tutorial-controls .primary-button {
    min-height: 2.75rem;
    padding-block: 0.375rem;
  }
  .tutorial-intro {
    padding: 1rem;
  }
  .tutorial-intro h3 {
    margin-top: 1rem;
  }
  .tutorial-intro .tutorial-muted {
    margin-block: 0.75rem;
  }
  .tutorial-link-tip {
    overflow-wrap: anywhere;
  }
}
</style>
