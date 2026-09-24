<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import type { OtpDisplaySnapshot } from '~/composables/useOtp'
import { countdownState } from '~/utils/countdown-state'

const reducedMotion = useReducedMotion()
const localePath = useLocalePath()
const { tx } = useMessages()
useHead({
  link: [
    {
      rel: 'preload',
      href: '/fonts/vt323-regular.ttf',
      as: 'font',
      type: 'font/ttf',
      crossorigin: 'anonymous'
    }
  ]
})
import { sealedAccessPath, toAccessPath, type OtpConfig } from '~/utils/otp'
const props = defineProps<{
  config: OtpConfig | null
  error?: string
  compactLayout?: boolean
  standalone?: boolean
  /** The standalone page was opened from a safe link, /2fa#~… */
  sealedLink?: boolean
  historyPreview?: boolean
  guideStep?: number
}>()
const vault = useVault()
const sizeTransitionActive = useState('otp-size-transition-active', () => false)
const expandedConfig = useState<OtpConfig | null>('expanded-otp-config', () => null)
const expandedHistoryPreview = useState('expanded-history-preview', () => false)
const emit = defineEmits<{ code: [value: string] }>()
const codeElement = useTemplateRef<HTMLElement>('codeElement')
const config = computed(() => props.config)
const digitCount = computed(() => props.config?.digits ?? 6)
const displayHandoff = useState<OtpDisplaySnapshot | null>('otp-display-handoff', () => null)
const {
  code,
  error: calculationError,
  remaining,
  progress,
  current,
  generatedAt
} = useOtp(config, displayHandoff.value)
onMounted(() => {
  displayHandoff.value = null
})
const showResultLinks = computed(
  () => !!config.value && !props.error && !calculationError.value && config.value.kind !== 'steam'
)
const { copied, message, copy } = useCopy()
const { copied: linkCopied, message: linkMessage, copy: copyLink } = useCopy()
async function handleLink() {
  if (!props.config || props.guideStep !== undefined) return
  // A safe link's page asks which link to copy; a plain link's page copies it as before.
  if (!props.standalone || props.sealedLink) {
    exportMode.value = 'link'
    return
  }
  await copyLink(`${window.location.origin}${localePath(toAccessPath(props.config))}`)
}
const copyConfirmed = computed(
  () => copied.value || (props.guideStep !== undefined && props.guideStep >= 3)
)
watch(code, (value) => emit('code', value), { immediate: true })
const successKey = computed(() =>
  props.config &&
  !props.historyPreview &&
  code.value &&
  !props.error &&
  !calculationError.value &&
  props.guideStep === undefined
    ? JSON.stringify(props.config)
    : ''
)
let soundedSuccess = ''
watch(
  successKey,
  (key) => {
    if (!key) {
      soundedSuccess = ''
      return
    }
    if (key === soundedSuccess) return
    soundedSuccess = key
    window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'success' }))
  },
  { flush: 'post' }
)
const shortcutHint = shallowRef(false)
const desktopShortcut = shallowRef(false)
let shortcutMedia: MediaQueryList | undefined
function updateShortcutDevice() {
  desktopShortcut.value = !!shortcutMedia?.matches
}
const shortcutHintSeen = useState('copy-shortcut-hint-seen-v4', () => false)
let shortcutTimer: ReturnType<typeof setTimeout> | undefined
function finishShortcutHint() {
  clearTimeout(shortcutTimer)
  shortcutHint.value = false
  shortcutHintSeen.value = true
  try {
    localStorage.setItem('2fa-copy-shortcut-hint-seen-v4', '1')
  } catch {}
}
onMounted(() => {
  shortcutMedia = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)')
  updateShortcutDevice()
  shortcutMedia.addEventListener('change', updateShortcutDevice)
  try {
    shortcutHintSeen.value ||= localStorage.getItem('2fa-copy-shortcut-hint-seen-v4') === '1'
  } catch {}
  watch(desktopShortcut, (desktop) => {
    if (!desktop) shortcutHint.value = false
  })
})
onBeforeUnmount(() => {
  shortcutMedia?.removeEventListener('change', updateShortcutDevice)
  if (shortcutHint.value) finishShortcutHint()
  clearTimeout(shortcutTimer)
})

const autoHistoryError = useAutoHistory(
  () =>
    props.config &&
    code.value &&
    !props.error &&
    !calculationError.value &&
    props.guideStep === undefined
      ? [props.config]
      : [],
  () => !props.historyPreview
)
const working = shallowRef(false),
  note = shallowRef(''),
  exportMode = shallowRef<'qr' | 'link' | null>(null)
watch(config, () => {
  note.value = ''
  message.value = ''
  copied.value = false
  exportMode.value = null
  linkCopied.value = false
  linkMessage.value = ''
})
let navigationRevision = 0
watch(
  vault.unlocked,
  (unlocked) => {
    if (unlocked || !props.historyPreview) return
    navigationRevision++
    exportMode.value = null
    displayHandoff.value = null
    expandedConfig.value = null
    expandedHistoryPreview.value = false
  },
  { flush: 'sync' }
)
async function copyCurrent(fromButton = false) {
  if (
    !props.config ||
    !code.value ||
    props.error ||
    calculationError.value ||
    working.value ||
    props.guideStep !== undefined
  )
    return
  working.value = true
  note.value = ''
  try {
    const value = await current()
    if (await copy(value)) {
      if (fromButton && desktopShortcut.value && !shortcutHintSeen.value) {
        shortcutHintSeen.value = true
        shortcutHint.value = true
        try {
          localStorage.setItem('2fa-copy-shortcut-hint-seen-v4', '1')
        } catch {}
        clearTimeout(shortcutTimer)
        shortcutTimer = setTimeout(finishShortcutHint, 8000)
      }
    }
  } catch (e) {
    note.value = (e as Error).message
  } finally {
    working.value = false
  }
}
function handleCopyShortcut(event: KeyboardEvent) {
  if (!codeElement.value?.getClientRects().length) return
  if (
    event.key !== 'Enter' ||
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  )
    return
  if (
    !props.config ||
    !code.value ||
    props.error ||
    calculationError.value ||
    props.guideStep !== undefined
  )
    return
  // Keep native activation, form editing, and modal keyboard controls intact.
  if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) return
  const target = event.target
  if (
    target instanceof HTMLElement &&
    target.id !== 'secret' &&
    target.closest(
      'input, textarea, select, button, a, [contenteditable="true"], [role="combobox"], [role="listbox"]'
    )
  )
    return
  event.preventDefault()
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'click' }))
  void copyCurrent()
}
const shortcutRoute = useRoute()
let focusFrame = 0
async function focusStandaloneCode() {
  if (!props.standalone) return
  cancelAnimationFrame(focusFrame)
  await nextTick()
  // The language popup's FocusScope restores its trigger after its leave
  // animation. Wait for that popup to unmount before focusing the result.
  const finish = () => {
    if (document.querySelector('.language-menu')) {
      focusFrame = requestAnimationFrame(finish)
      return
    }
    focusFrame = requestAnimationFrame(() => {
      codeElement.value?.focus({ preventScroll: true })
    })
  }
  finish()
}
watch(() => shortcutRoute.path, focusStandaloneCode, { flush: 'post' })
onMounted(() => {
  window.addEventListener('keydown', handleCopyShortcut)
  void focusStandaloneCode()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(focusFrame)
  window.removeEventListener('keydown', handleCopyShortcut)
})
defineExpose({ copyCurrent })
function prepareSizeChange() {
  if (!props.config || props.guideStep !== undefined) return
  void preloadRouteComponents(localePath(props.standalone ? '/' : '/2fa')).catch(() => {})
}
async function expand() {
  if (!props.config || !config.value || props.guideStep !== undefined || sizeTransitionActive.value)
    return
  const revision = navigationRevision
  sizeTransitionActive.value = true
  // A view transition snapshots the page, so a panorama still turning behind
  // the card leaves the captured and live frames disagreeing for a frame.
  document.documentElement.classList.add('size-transition')
  try {
    const sound = props.standalone ? 'parameters' : 'expand'
    const playSizeSound = () =>
      window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: sound }))
    displayHandoff.value = code.value
      ? { config: { ...props.config }, code: code.value, at: generatedAt.value }
      : null
    if (props.standalone) {
      vault.pending.value = { config: { ...props.config }, historyPreview: !!props.historyPreview }
    } else {
      expandedConfig.value = { ...props.config }
      expandedHistoryPreview.value = !!props.historyPreview
    }
    // Expanding opens a safe link, so the address bar and history never show the key.
    const target = localePath(props.standalone ? '/' : sealedAccessPath([props.config]))
    await preloadRouteComponents(target).catch(() => {})
    if (revision !== navigationRevision) return
    const navigate = async () => {
      if (revision !== navigationRevision) return
      await navigateTo(target)
      await nextTick()
      window.scrollTo({ left: 0, top: 0, behavior: 'instant' })
      // View transitions may suspend rendering during this callback. Never await
      // requestAnimationFrame here: the browser captures layout after we return.
    }
    // Only the explicit size control animates; ordinary navigation stays immediate.
    if (document.startViewTransition && !reducedMotion.value) {
      const transition = document.startViewTransition(navigate)
      // The route may load asynchronously: align audio with the first animation frame.
      await transition.ready.then(playSizeSound).catch(() => {})
      await transition.finished.catch(() => {})
    } else {
      await navigate()
      playSizeSound()
    }
  } finally {
    document.documentElement.classList.remove('size-transition')
    sizeTransitionActive.value = false
  }
}
</script>
<template>
  <div class="result-head" :class="{ 'is-compact': compactLayout }">
    <span v-if="config">{{ tx(standalone ? '当前有效验证码' : '当前验证码') }}</span>
    <div class="result-head-actions">
      <OtpCountdownMeta
        v-if="compactLayout || standalone"
        :compact="compactLayout"
        :active="!!config && !!code && !error && !calculationError"
        :remaining="remaining"
        :period="config?.period ?? 30"
      />
      <AppHint :text="tx(standalone ? '返回工具首页' : '查看独立取码页')"
        ><UButton
          color="neutral"
          variant="ghost"
          :icon="standalone ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
          class="expand-button"
          data-sound-custom
          :aria-label="tx(standalone ? '缩小验证码' : '放大验证码')"
          :disabled="
            !config ||
            config.kind === 'steam' ||
            !!error ||
            !!calculationError ||
            guideStep !== undefined
          "
          @pointerenter="prepareSizeChange"
          @focus="prepareSizeChange"
          @click="expand"
      /></AppHint>
    </div>
  </div>
  <div
    :id="standalone ? undefined : 'tutorial-code'"
    class="result-code"
    :class="{ 'is-compact': compactLayout }"
  >
    <OtpCountdownMeta
      v-if="!compactLayout && !standalone"
      :active="!!config && !!code && !error && !calculationError"
      :remaining="remaining"
      :period="config?.period ?? 30"
    />
    <div
      ref="codeElement"
      :tabindex="standalone ? -1 : undefined"
      :id="standalone ? undefined : 'tutorial-digits'"
      class="otp-digits"
      :class="{ empty: !code, eight: digitCount === 8 }"
      data-testid="otp-code"
      :aria-label="code ? tx('当前验证码 {code}', { code }) : tx('输入密钥后显示验证码')"
    >
      <span class="otp-slots" aria-hidden="true">
        <span
          v-for="position in digitCount"
          :key="position"
          class="otp-slot"
          :class="{ 'otp-slot-group': position === digitCount / 2 + 1 }"
        >
          <Transition name="otp-ready" :css="!sizeTransitionActive">
            <span v-if="code" :key="code" class="otp-slot-value">{{ code[position - 1] }}</span>
          </Transition>
          <span class="otp-slot-placeholder" :class="{ 'is-visible': !code }">*</span>
        </span>
      </span>
    </div>
    <div
      :id="standalone ? undefined : 'tutorial-countdown'"
      class="result-progress"
      :data-countdown-state="
        countdownState(
          !!config && !!code && !error && !calculationError,
          remaining,
          config?.period ?? 30
        )
      "
    >
      <div class="countdown-track" aria-hidden="true">
        <div
          class="countdown-fill"
          :style="{ clipPath: `inset(0 ${100 - (config ? progress : 0)}% 0 0)` }"
        />
      </div>
    </div>
  </div>
  <div class="result-output" :class="{ 'has-exports': showResultLinks }">
    <motion.div
      class="result-copy-position"
      :layout="compactLayout && !reducedMotion && !sizeTransitionActive ? 'position' : false"
      :layout-dependency="showResultLinks"
      :transition="{ layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } }"
    >
      <UButton
        class="primary-button result-copy"
        :id="standalone ? undefined : 'tutorial-copy-code'"
        :aria-disabled="guideStep !== undefined || undefined"
        :class="{ 'is-copied': copyConfirmed }"
        :disabled="!config || !!error || !!calculationError"
        :loading="working"
        aria-keyshortcuts="Enter"
        @click="copyCurrent(true)"
        ><span class="copy-icon" aria-hidden="true"
          ><Transition name="copy-feedback"
            ><UIcon
              :key="copyConfirmed ? 'copied' : 'copy'"
              :name="copyConfirmed ? 'i-mc-check' : 'i-lucide-copy'" /></Transition></span
        >{{ tx(copyConfirmed ? '已复制' : '复制验证码') }}<UKbd value="↵" class="copy-shortcut-key"
      /></UButton>
    </motion.div>
    <ActionHint
      :open="shortcutHint && !!code && guideStep === undefined"
      :message="tx('按回车可快速复制验证码')"
      icon="i-lucide-corner-down-left"
      @close="finishShortcutHint"
    />
    <p v-if="error || calculationError" class="inline-error" role="alert">
      {{ tx(error || calculationError) }}
    </p>
    <p class="sr-only" role="status">{{ tx(copyConfirmed ? '验证码已复制' : '') }}</p>
    <p v-if="autoHistoryError" class="inline-error" role="alert">{{ tx(autoHistoryError) }}</p>
    <p v-if="message || note" class="inline-notice" role="status">{{ tx(message || note) }}</p>
    <div
      class="export-reveal"
      :class="{ 'is-open': showResultLinks, 'is-resizing': sizeTransitionActive }"
      :inert="!showResultLinks"
      :aria-hidden="!showResultLinks"
    >
      <div class="export-reveal-inner">
        <div class="result-links">
          <UButton
            class="result-link"
            color="neutral"
            variant="outline"
            :disabled="!config || guideStep !== undefined"
            @click="exportMode = 'qr'"
          >
            <UIcon name="i-lucide-qr-code" />{{ tx('二维码') }}</UButton
          ><UButton
            class="result-link"
            color="neutral"
            variant="outline"
            :disabled="!config || guideStep !== undefined"
            @click="handleLink"
          >
            <UIcon :name="standalone && linkCopied ? 'i-mc-check' : 'i-lucide-link'" />{{
              tx(standalone ? (linkCopied ? '已复制' : '复制链接') : '获取链接')
            }}
          </UButton>
        </div>
      </div>
    </div>
    <p v-if="standalone && linkMessage" class="inline-error" role="alert">{{ tx(linkMessage) }}</p>
    <LazyExportDialog
      v-if="exportMode && config"
      :mode="exportMode"
      :config="config"
      @close="exportMode = null"
    />
  </div>
</template>

<style scoped>
/*
 * Rendered for everyone: a keycap that hydration adds would appear after the
 * first paint. Only the devices that can press the key show it.
 */
.copy-shortcut-key {
  display: none;
}
@media (min-width: 701px) and (hover: hover) and (pointer: fine) {
  .copy-shortcut-key {
    display: inline-flex;
  }
}
.result-head {
  /* The expand button is absolute and 44px wide, sitting 2px off the edge, so
     2rem of reserve let the countdown run under it. */
  padding-inline-end: 3.5rem;
}
.result-head .expand-button {
  position: absolute;
  inset-block-start: 0.125rem;
  inset-inline-end: 0.125rem;
  border: 0;
  box-shadow: none;
  background: transparent;
  transform: none;
  transition: color 120ms ease;
}
.result-head .expand-button:hover:not(:disabled) {
  background: transparent;
  box-shadow: none;
  color: var(--ui-text-highlighted);
  transform: none;
}
.result-head .expand-button:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}

.result-head.is-compact {
  flex-wrap: wrap;
}
.result-head.is-compact .result-head-actions {
  margin-inline-start: auto;
}
.result-code.is-compact .otp-digits {
  margin: 0;
  padding-block: 0;
}
.result-code.is-compact .countdown-track {
  margin-top: 0;
}
/* Only stacked layouts need spacing; desktop aligns the track to the input grid. */
@media (max-width: 700px), (max-height: 500px) and (pointer: coarse) {
  .result-code.is-compact .result-progress {
    padding-top: 0.875rem;
  }
}
.result-code {
  min-width: 0;
}
.result-output {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.export-reveal {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 240ms var(--ease-out);
}
.export-reveal.is-open {
  grid-template-rows: 1fr;
}
.export-reveal.is-open .result-link:focus-visible {
  outline-offset: -3px;
}
.export-reveal-inner {
  min-height: 0;
  overflow: hidden;
}
.export-reveal .result-links {
  transform: translateY(-8px);
  transition: transform 240ms var(--ease-out);
}
.export-reveal.is-open .result-links {
  transform: translateY(0);
}
.export-reveal.is-resizing,
.export-reveal.is-resizing .result-links {
  transition: none;
}
@media (prefers-reduced-motion: reduce) {
  .export-reveal,
  .export-reveal .result-links {
    transition: none;
  }
}
.otp-digits {
  display: grid;
  place-items: center;
  letter-spacing: 0;
  font-family: 'VT323', monospace;
  font-weight: 400;
}
.otp-digits.empty {
  opacity: 1;
  letter-spacing: 0;
}
.otp-slots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.09em;
  height: 1.3em;
}
.otp-slot {
  display: grid;
  grid-template: minmax(0, 1fr) / minmax(0, 1fr);
  place-items: center;
  width: 0.74em;
  overflow: hidden;
  height: 1.12em;
  border: 1px solid var(--ui-border);
  background: var(--ore-input);
  box-shadow: var(--ore-inset);
}
.otp-slot-group {
  margin-inline-start: 0.14em;
}
.otp-slot-value,
.otp-slot-placeholder {
  grid-area: 1 / 1;
}
.otp-slot-value {
  /* Center the enlarged line box in the fixed slot; do not offset the rolling animation. */
  font-size: 1.08em;
  line-height: 1;
}
.otp-slot-placeholder {
  font-size: 0.7em;
  line-height: 1;
  /* No nudge: VT323 already draws its asterisk on the middle of the line box,
     and the old translateY(0.12em) - made for a font that sets it high - left
     it 6.5px below the slot's centre at desktop size. */
  color: var(--ui-text-muted);
  opacity: 0;
  transition: opacity 180ms ease;
}
.otp-slot-placeholder.is-visible {
  opacity: 1;
}
/* Only the numerals move; slot geometry and the current copy value stay stable. */
.otp-ready-enter-active {
  transition:
    transform 280ms var(--ease-out),
    opacity 220ms ease;
}
.otp-ready-leave-active {
  transition:
    transform 180ms cubic-bezier(0.4, 0, 1, 1),
    opacity 180ms ease;
}
.otp-ready-enter-from {
  opacity: 0;
  transform: translateY(120%);
}
.otp-ready-leave-to {
  opacity: 0;
  transform: translateY(-120%);
}
@media (prefers-reduced-motion: reduce) {
  .otp-slot-placeholder,
  .otp-ready-enter-active,
  .otp-ready-leave-active {
    transition: none;
  }
}
</style>

<style scoped>
.shortcut-hint {
  color: var(--accent-ink);
  font-weight: 500;
}
</style>
