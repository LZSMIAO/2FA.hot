<script setup lang="ts">
import { singleGuideTimeline } from '~/utils/guide-timeline'
import { advanceGuideTime } from '~/utils/guide-timing'
import { DEMO_SECRET } from '~/utils/otp'
/** Shown in groups of four, as authenticator apps do, so lines break between groups. */
const secretGroups = DEMO_SECRET.match(/.{1,4}/g)!

const { tx } = useMessages()

const props = defineProps<{ code: string; compact?: boolean }>()
const emit = defineEmits<{
  close: []
  understood: []
  switchMode: []
  tips: []
  step: [value: number]
  stage: [value: number]
}>()
const elapsed = shallowRef(0)
const started = shallowRef(false)
const paused = shallowRef(false)
const reducedMotion = shallowRef(false)
const cursor = shallowRef({ x: 0, y: 0, visible: false })
const shortcut = shallowRef({ x: 0, y: 0, visible: false })
const modifierKey = shallowRef('Ctrl')
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
    title: tx('粘贴到 2fa.hot'),
    detail:
      '不用先点输入框，在页面任何位置按 Ctrl/⌘ + V 就能粘贴；整段文字里混着说明也没关系，网站会自己挑出密钥。'
  },
  {
    at: singleGuideTimeline.steps[2],
    title: tx('也可以导入二维码'),
    detail: '原网站一般也会给二维码。可以直接点“导入二维码”，用截图或摄像头识别，不用手抄密钥。'
  },
  {
    at: singleGuideTimeline.steps[3],
    title: tx('查看验证码'),
    detail:
      '密钥填好后，右侧立刻出现验证码。多数网站是 6 位，少数用 8 位，导入配置链接时会自动跟着设置。'
  },
  {
    at: singleGuideTimeline.steps[4],
    title: tx('看剩余时间'),
    detail: '验证码下面这条是剩余时间，像经验条一样一格格减少。走完就换一组新的，旧的立刻作废。'
  },
  {
    at: singleGuideTimeline.steps[5],
    title: tx('复制验证码'),
    detail: '原网站现在要验证码了。点“复制验证码”，把当前这一组复制下来。',
    tip: '电脑上按回车可以直接复制验证码。倒计时只剩几秒时，等下一组再复制更保险。'
  },
  {
    at: singleGuideTimeline.steps[6],
    title: tx('粘贴验证码'),
    detail:
      '切回原网站，粘贴到它的验证码框。如果这时倒计时刚好走完，验证码会换成新的一组，要复制最新的再填。'
  },
  {
    at: singleGuideTimeline.steps[7],
    title: tx('确认登录'),
    detail: '点原网站的确认按钮提交。整个过程密钥都没有离开你的浏览器。'
  },
  {
    at: singleGuideTimeline.steps[8],
    title: tx('验证成功'),
    detail:
      '原网站用相同的密钥和当前时间核对验证码，匹配后通过验证。以后需要验证码时，用同一份密钥重新取码；密钥请自己保管，不要发给别人。',
    tip: '同一份密钥可以一直用。开启本地历史后，它会加密保存在这台设备，下次点记录就能取码。'
  }
] as { at: number; title: string; detail: string; tip?: string }[]
// Caption, narration and cursor all read the same step boundaries.
const activeStep = computed(() =>
  started.value
    ? Math.max(0, singleGuideTimeline.steps.filter((at) => elapsed.value >= at).length - 1)
    : 0
)
/** The demo shows whatever code the page shows now, so a rollover changes both. */
const copiedCode = computed(() => (phase.value >= 3 ? props.code : ''))
const tipOpen = shallowRef<boolean | undefined>()
watch(activeStep, () => (tipOpen.value = undefined))
const tipVisible = computed({
  get: () =>
    steps[activeStep.value]!.tip
      ? (tipOpen.value ?? elapsed.value - steps[activeStep.value]!.at > 1200)
      : false,
  set: (open: boolean) => {
    tipOpen.value = open
  }
})
let shortcutSound: ReturnType<typeof setTimeout> | undefined
const cue = (detail: string) => window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail }))
/** Matches the drop keyframes: the blocks land, then the keys go down. */
function playShortcutSounds(kind: string) {
  clearTimeout(shortcutSound)
  shortcutSound = setTimeout(() => {
    cue('stone-on')
    shortcutSound = setTimeout(() => cue(kind === 'qr' ? 'select' : 'click'), 660)
  }, 620)
}
const pasteStep = computed(() => started.value && activeStep.value === 1 && phase.value < 3)
const qrStep = computed(() => started.value && activeStep.value === 2)
/** Which block drops onto the field for the step being narrated. */
const dropKind = computed(() => (pasteStep.value ? 'keys' : qrStep.value ? 'qr' : ''))
watch(dropKind, (kind) => {
  clearTimeout(shortcutSound)
  if (kind && !reducedMotion.value) playShortcutSounds(kind)
})
const narration = useGuideNarration(
  () => {
    if (!started.value)
      return tx('就是“验证器”。2fa.hot 和验证器 App 一样，用密钥生成一次性验证码。')
    const step = steps[activeStep.value]!
    const body = tx(step.detail)
    // Some translations open the body with the title; do not read it twice.
    return `${body.startsWith(step.title) ? '' : step.title + '。'}${body} ${tx(step.tip ?? '')}`
  },
  () => paused.value
)
function toggleNarration() {
  if (!narration.enabled.value) paused.value = false
  narration.toggle(started.value)
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

watch(phase, (value) => emit('step', value), { immediate: true })
// The workspace needs the step itself, not the phase, to open up the QR control.
watch(activeStep, (value) => emit('stage', value), { immediate: true })
function positionCursor() {
  if (!started.value || complete.value || reducedMotion.value) {
    cursor.value = { ...cursor.value, visible: false }
    shortcut.value = { ...shortcut.value, visible: false }
    return
  }
  // On the QR step the import window opens over its button: aim at its drop zone.
  const qrDrop = document.getElementById('tutorial-qr-drop')
  const target =
    targetId.value === 'tutorial-qr' && qrDrop ? qrDrop : document.getElementById(targetId.value)
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
  const anchor = dropKind.value === 'qr' ? 'tutorial-qr' : 'secret'
  const field = dropKind.value ? document.getElementById(anchor) : undefined
  if (!field) {
    shortcut.value = { ...shortcut.value, visible: false }
    return
  }
  // The QR blocks land in the open window's drop zone instead of on the button
  // it now covers: at its top-left corner, which the guide panel never overlaps.
  const box = (dropKind.value === 'qr' && qrDrop ? qrDrop : field).getBoundingClientRect()
  shortcut.value =
    dropKind.value === 'qr' && qrDrop
      ? { x: box.left + 12, y: box.top + 12, visible: true }
      : { x: Math.max(16, box.right - 108), y: box.top - 48, visible: true }
}
function start() {
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'demo' }))
  clearTimeout(clickTimer)
  clicking.value = false
  started.value = true
  elapsed.value = 0
  paused.value = reducedMotion.value
  lastTarget = ''
  lastTick = performance.now()
  positionCursor()
  narration.restart()
}
function chooseStep(index: number) {
  started.value = true
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
  if (/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)) modifierKey.value = '⌘'
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
  clearTimeout(shortcutSound)
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
        ><UIcon name="i-lucide-monitor-play" /><span class="tutorial-title-text">{{
          tx('登录演示')
        }}</span
        ><GuideVoiceButton :enabled="narration.enabled.value" @toggle="toggleNarration" /></span
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
      <details class="tutorial-question">
        <summary>
          <h3>{{ tx('为什么它能验证身份？') }}</h3>
        </summary>
        <p>
          {{
            tx(
              '验证器和原网站用同一份密钥与当前时间计算，通常每 30 秒换一组验证码。结果一致，就能完成双重验证。'
            )
          }}
        </p>
      </details>
      <details class="tutorial-question">
        <summary>
          <h3>{{ tx('演示里会看到什么？') }}</h3>
        </summary>
        <p>
          {{
            tx(
              '卡片里会出现一个虚构的“示例网站”，代表任何要求双重验证的服务：邮箱、游戏、交易所都一样。它先给出密钥，再要求你填验证码。'
            )
          }}
        </p>
        <p>
          {{
            tx(
              '记住三件事就够了：密钥长期有效，要保密；验证码每 30 秒换一次，用完即弃；原网站只要验证码。'
            )
          }}
        </p>
      </details>
      <p class="tutorial-muted">
        {{
          tx('接下来，模拟鼠标会直接在首页演示。只使用公开示例数据，你原来的输入会在结束后恢复。')
        }}
      </p>
      <div class="tutorial-start">
        <UButton class="primary-button" icon="i-lucide-play" data-sound-custom @click="start">{{
          tx('开始演示')
        }}</UButton>
        <AppHint :text="tx('网站小技巧')"
          ><UButton
            class="tutorial-tips-entry"
            variant="outline"
            color="neutral"
            icon="i-lucide-lightbulb"
            :aria-label="tx('网站小技巧')"
            @click="emit('tips')"
        /></AppHint>
      </div>
    </div>
    <template v-else>
      <div class="tutorial-stage" aria-hidden="true">
        <div class="tutorial-chrome">
          <span class="tutorial-chrome-dots"><i /><i /><i /></span>
          <span class="tutorial-chrome-url" dir="ltr">example-social.com</span>
          <span class="tutorial-chrome-badge">{{ tx('模拟画面') }}</span>
        </div>
        <p class="tutorial-stage-note">
          {{
            tx(
              elapsed < singleGuideTimeline.verificationAt
                ? '这是原网站的两步验证设置页'
                : '这是原网站的登录验证页'
            )
          }}
        </p>
        <div class="tutorial-scene">
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
                <div class="tutorial-secret mono">
                  <span v-for="(group, index) in secretGroups" :key="index">{{ group }}</span>
                </div>
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
      </div>
      <div class="tutorial-caption" aria-live="polite">
        <div class="tutorial-step-head">
          <span>{{ tx(activeStep + 1) }} / {{ steps.length }}</span>
          <strong>{{ tx(steps[activeStep]!.title) }}</strong>
          <UPopover
            v-if="steps[activeStep]!.tip"
            v-model:open="tipVisible"
            mode="hover"
            :open-delay="0"
            :close-delay="100"
            enable-touch
            arrow
            :content="{ side: 'top', align: 'center', sideOffset: 2, collisionPadding: 12 }"
            :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
            :portal="false"
          >
            <button
              type="button"
              class="tutorial-tip-toggle info-mark"
              :class="{ 'is-open': tipVisible }"
              :aria-label="tx('小提示')"
            >
              <UIcon name="i-lucide-info" />
            </button>
            <template #content>
              <p class="tutorial-step-tip">{{ tx(steps[activeStep]!.tip) }}</p>
            </template>
          </UPopover>
        </div>
        <p>{{ tx(steps[activeStep]!.detail) }}</p>
      </div>
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
          <UButton
            v-if="activeStep < steps.length - 1"
            class="primary-button tutorial-next"
            @click="chooseStep(activeStep + 1)"
            >{{ tx('下一步') }}</UButton
          ><UButton v-else-if="finished" class="primary-button" @click="emit('understood')">{{
            tx('我明白了')
          }}</UButton>
        </div>
      </div>
      <div v-if="finished" class="tutorial-more">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-lightbulb"
          @click="emit('tips')"
          >{{ tx('网站小技巧') }}</UButton
        >
        <UButton variant="outline" color="neutral" @click="emit('switchMode')">{{
          tx('批量取码演示')
        }}</UButton>
      </div>
    </template>
  </aside>
  <Teleport to="body"
    ><div
      v-if="shortcut.visible && !reducedMotion"
      class="tutorial-shortcut ore-theme"
      :style="{ transform: `translate3d(${shortcut.x}px, ${shortcut.y}px, 0)` }"
      aria-hidden="true"
    >
      <span class="tutorial-shortcut-keys"
        ><template v-if="dropKind === 'qr'"
          ><kbd class="is-glyph"><UIcon name="i-lucide-qr-code" /></kbd><i>→</i
          ><kbd class="is-glyph"><UIcon name="i-lucide-text-cursor-input" /></kbd></template
        ><template v-else
          ><kbd>{{ modifierKey }}</kbd
          ><i>+</i><kbd>V</kbd></template
        ></span
      >
    </div></Teleport
  >
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
.tutorial-title > span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
/* One line, however the title is translated. */
.tutorial-title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.tutorial-question {
  border-bottom: 1px solid var(--ui-border);
}
.tutorial-question:first-of-type {
  margin-top: 1rem;
  border-top: 1px solid var(--ui-border);
}
.tutorial-question[open] {
  padding-bottom: 0.75rem;
}
.tutorial-question summary {
  min-height: 2.75rem;
  padding: 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  list-style: none;
}
.tutorial-question summary::-webkit-details-marker {
  display: none;
}
.tutorial-question summary h3 {
  margin: 0;
}
.tutorial-question summary::after {
  content: '';
  flex: none;
  width: 0.5rem;
  height: 0.5rem;
  margin-inline-start: auto;
  border-inline-end: 2px solid currentColor;
  border-block-end: 2px solid currentColor;
  transform: rotate(45deg) translate(-2px, -2px);
  color: var(--ui-text-muted);
  transition: transform 150ms var(--ease-out);
}
.tutorial-question[open] summary::after {
  transform: rotate(-135deg) translate(-2px, -2px);
}
@media (prefers-reduced-motion: reduce) {
  .tutorial-question summary::after {
    transition: none;
  }
}
.tutorial-intro .tutorial-muted {
  color: var(--ui-text-muted);
  font-size: var(--text-caption);
  margin: 1.25rem 0;
}
/* Starting and the tips share one line; the tips entry is a lightbulb with its name as a hint. */
.tutorial-start {
  display: flex;
  gap: 0.5rem;
}
.tutorial-start > .primary-button {
  flex: 1;
  min-width: 0;
  justify-content: center;
}
.tutorial-tips-entry {
  flex-shrink: 0;
  align-self: stretch;
  width: 3rem;
  justify-content: center;
}
/* A framed pane makes it obvious the demo is a stand-in for the original website. */
.tutorial-stage {
  padding: 1rem;
  background: var(--wash);
}
.tutorial-chrome {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--ui-border);
  border-bottom: 0;
  border-radius: var(--ui-radius) var(--ui-radius) 0 0;
  background: var(--panel);
}
.tutorial-chrome-dots {
  display: flex;
  flex-shrink: 0;
  gap: 0.25rem;
}
.tutorial-chrome-dots i {
  width: 0.5rem;
  height: 0.5rem;
  background: var(--ui-border);
}
.tutorial-chrome-url {
  flex: 1;
  min-width: 0;
  padding: 0.125rem 0.5rem;
  border-radius: var(--ui-radius);
  background: var(--wash);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tutorial-chrome-badge {
  flex-shrink: 0;
  padding: 0.125rem 0.375rem;
  border: 1px solid var(--accent-ink);
  color: var(--accent-ink);
  font-size: var(--text-caption);
  white-space: nowrap;
}
.tutorial-stage-note {
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-inline: 1px solid var(--ui-border);
  background: var(--panel);
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
  text-align: center;
}
.tutorial-scene {
  position: relative;
  min-height: 16rem;
  padding: 0.75rem 1.25rem 1.25rem;
  border: 1px solid var(--ui-border);
  border-top: 0;
  border-radius: 0 0 var(--ui-radius) var(--ui-radius);
  background: var(--panel);
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
  background: var(--wash);
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
  background: var(--wash);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-align: center;
  /* Wraps between groups, into even lines rather than leaving a few behind. */
  text-wrap: balance;
}
/* Gaps only: nothing sits between the groups, so a copied key has no spaces. */
.tutorial-secret > span {
  display: inline-block;
  margin-inline: 0.3em;
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
  background: var(--wash);
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
/* Inline flow, so the info mark trails the title's last word as it wraps. */
.tutorial-step-head {
  min-width: 0;
  font-size: var(--text-label);
}
.tutorial-step-head > strong {
  overflow-wrap: anywhere;
}
.tutorial-step-head > span {
  margin-inline-end: 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--accent-ink);
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
.tutorial-tip-toggle:hover,
.tutorial-tip-toggle.is-open {
  color: var(--accent-ink);
}
/* An info mark: hovering or tapping shows the tip; there is nothing to click through to. */
.tutorial-tip-toggle {
  cursor: default;
}
/* Rendered in place, so it keeps the tooltip's type, not the caption's. */
.tutorial-caption .tutorial-step-tip {
  margin: 0;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
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
  padding-block: 0.25rem;
}
.tutorial-more {
  display: flex;
  gap: 0.5rem;
  padding: 0 0.75rem 0.75rem;
}
.tutorial-more > :deep(button) {
  flex: 1;
  justify-content: center;
  min-height: 2.5rem;
  padding-inline: 0.5rem;
  font-size: var(--text-caption);
  white-space: nowrap;
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
  min-height: 2.75rem;
  padding-block: 0.5rem;
  white-space: nowrap;
}
.tutorial-footnote {
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
  padding: 0 1.25rem 1rem;
  margin: 0;
}
/* Pixel keycaps drop in from above like a placed block, then press. */
.tutorial-shortcut {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  pointer-events: none;
  transition: transform 400ms var(--ease-out);
}
.tutorial-shortcut-keys {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  animation: tutorial-key-drop 2100ms var(--ease-out) infinite;
}
.tutorial-shortcut i {
  font-style: normal;
  font-size: var(--text-caption);
  color: var(--scene-text-muted);
  text-shadow: 2px 2px 0 #0009;
}
.tutorial-shortcut kbd {
  display: grid;
  place-items: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: 0.25rem 0.5rem;
  border: 2px solid var(--ore-outline);
  border-radius: 0;
  background: var(--ore-control);
  box-shadow:
    var(--ore-button-shadow),
    0 4px 0 #0006;
  color: var(--ui-text-highlighted);
  font-family: var(--font-mono);
  font-size: var(--text-label);
  line-height: 1;
  animation: tutorial-key-press 2100ms var(--ease-out) infinite;
}
.tutorial-shortcut kbd:last-of-type {
  animation-delay: 70ms;
}
.tutorial-shortcut kbd.is-glyph {
  font-size: 1.125rem;
}
@keyframes tutorial-key-drop {
  0% {
    transform: translateY(-240%);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  26% {
    transform: translateY(0);
  }
  31% {
    transform: translateY(-14%);
  }
  36% {
    transform: translateY(0);
  }
  39% {
    transform: translateY(-5%);
  }
  42%,
  92% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 0;
  }
}
@keyframes tutorial-key-press {
  0%,
  58%,
  76%,
  100% {
    transform: translateY(0);
    background: var(--ore-control);
    color: var(--ui-text-highlighted);
  }
  63%,
  71% {
    transform: translateY(3px);
    background: var(--action);
    color: #fff;
    box-shadow: var(--ore-bevel);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tutorial-shortcut,
  .tutorial-shortcut-keys,
  .tutorial-shortcut kbd {
    transition: none;
    animation: none;
  }
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
  .tutorial-stage {
    padding: 0.5rem;
  }
  .tutorial-stage-note {
    padding: 0.375rem 0.5rem;
  }
  .tutorial-scene {
    min-height: 9rem;
    padding: 0.75rem 1rem;
  }
  /* The heading and its line share a row; the key or code boxes take the width. */
  .tutorial-form {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 0.5rem;
    align-items: baseline;
    text-align: start;
  }
  .social-avatar {
    display: none;
  }
  .tutorial-form h2 {
    font-size: var(--text-label);
  }
  .tutorial-form p {
    grid-column: 2;
    margin: 0;
  }
  .tutorial-secret,
  .tutorial-code-input {
    grid-column: 1 / -1;
    margin-top: 0.5rem;
  }
  .tutorial-secret {
    font-size: 0.8125rem;
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
}
</style>
