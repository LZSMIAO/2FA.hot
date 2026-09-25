<script setup lang="ts">
const localePath = useLocalePath()
import {
  analyzePaste,
  extractedSurroundingText,
  pastedBatchText,
  pastedInputText,
  type PasteAnalysis
} from '~/utils/smart-paste'
import { unlocalizedPath } from '~~/shared/seo/routes'
import { toOtpUri } from '~/utils/otp'
import SmartPasteReview from './SmartPasteReview.vue'
const { tx } = useMessages()
const { copy: copySecretValue, copied: secretCopied, message: secretCopyError } = useCopy()
const copyingSecret = shallowRef(false)
async function copySecret() {
  if (!config.value || pathWarning.value || copyingSecret.value) return
  copyingSecret.value = true
  try {
    await copySecretValue(config.value.secret)
  } finally {
    copyingSecret.value = false
  }
}
import {
  parseOtp,
  algorithmFrom,
  accessPath,
  accessEntries,
  sealedAccessPath,
  identity,
  type OtpConfig
} from '~/utils/otp'
import { isSealedFragment, openFragment, sealFragment } from '~/utils/sealed-link'
const expandedConfig = useState<OtpConfig | null>('expanded-otp-config', () => null)
const expandedHistoryPreview = useState('expanded-history-preview', () => false)
let historyPreviewIdentity =
  expandedHistoryPreview.value && expandedConfig.value ? identity(expandedConfig.value) : ''
onBeforeRouteLeave((to) => {
  // Back on the tool, a batch shown here continues in the batch workspace.
  if (unlocalizedPath(to.path) === '/' && batchRows.length)
    batchTransfer.value = pastedBatchText(batchRows)
  if (!/^\/2fa(?:\/|$)/.test(unlocalizedPath(to.path))) {
    expandedBatch.value = null
    historyPreviewIdentity = ''
    expandedConfig.value = null
    expandedHistoryPreview.value = false
  }
})
const route = useRoute()
const input = shallowRef(''),
  issue = shallowRef(''),
  config = shallowRef<OtpConfig | null>(null)
const extracted = shallowRef('')
const originalInput = shallowRef('')
const pendingPaste = shallowRef<{ source: string; analysis: PasteAnalysis } | null>(null)
const batchTransfer = useState<string>('smart-batch-transfer', () => '')
watch(
  input,
  () => {
    extracted.value = ''
    originalInput.value = ''
    issue.value = ''
    pendingPaste.value = null
  },
  { flush: 'sync' }
)
const composing = shallowRef(false)
watch([input, composing], (_, __, onCleanup) => {
  if (composing.value) return
  const timer = setTimeout(() => {
    if (!pendingPaste.value) recognizeMixedInput()
  }, 300)
  onCleanup(() => clearTimeout(timer))
})
const fragment = shallowRef('')
const pathWarning = shallowRef(false)
/*
 * Several keys in the link show the batch view on this same page. Its rows
 * keep the link in step, so removing keys down to one turns it into the
 * single view. Names arrive through shared state; links never carry them.
 */
const expandedBatch = useState<OtpConfig[] | null>('expanded-batch-configs', () => null)
const batchSource = shallowRef('')
const batchVersion = shallowRef(0)
let batchRows: OtpConfig[] = []
let writtenHash = ''
function sameKeys(a: readonly OtpConfig[], b: readonly OtpConfig[]) {
  return (
    a.length === b.length && a.every((config, index) => identity(config) === identity(b[index]!))
  )
}
/** What the current link carries after /2fa, read out of a safe link when it is one. */
function plainHash() {
  try {
    return isSealedFragment(route.hash) ? '#' + openFragment(route.hash) : route.hash
  } catch {
    return ''
  }
}
function followBatch(configs: OtpConfig[]) {
  batchRows = configs
  // The link keeps the form it opened with: a plain link stays plain, a safe one stays safe.
  const sealed = isSealedFragment(route.hash)
  const plain = accessPath(configs).slice('/2fa'.length)
  if (configs.length > 1) {
    if (plainHash() === plain) return
    const hash = sealed ? '#' + sealFragment(plain.slice(1)) : plain
    writtenHash = hash
    void navigateTo(localePath('/2fa') + hash, { replace: true })
  } else if (configs.length === 1) {
    expandedConfig.value = configs[0]!
    expandedHistoryPreview.value = false
    void navigateTo(localePath(sealed ? sealedAccessPath(configs) : accessPath(configs)), {
      replace: true
    })
  } else void navigateTo(localePath('/2fa'), { replace: true })
}
function collapseBatch() {
  void navigateTo(localePath('/'))
}
const missing = computed(() => !route.params.secret && !fragment.value)
const sealedLink = computed(() => isSealedFragment(fragment.value))
function load() {
  // The batch view rewrote its own link; what it shows is already current.
  if (writtenHash && route.hash === writtenHash) {
    writtenHash = ''
    return
  }
  pathWarning.value = Boolean(route.params.secret)
  config.value = null
  issue.value = ''
  fragment.value = route.hash
  batchSource.value = ''
  if (!route.params.secret && !fragment.value) return
  if (!route.params.secret) {
    try {
      const configs = accessEntries(fragment.value)
      if (configs.length > 1) {
        batchSource.value = pastedBatchText(
          expandedBatch.value && sameKeys(expandedBatch.value, configs)
            ? expandedBatch.value
            : configs
        )
        batchVersion.value++
        return
      }
    } catch (e) {
      issue.value = (e as Error).message
      return
    }
  }
  try {
    const options = route.query
    for (const name of ['algorithm', 'digits', 'period'])
      if (Array.isArray(options[name])) throw new Error('链接参数重复，请检查链接。')
    if (route.params.secret && fragment.value) throw new Error('配置链接格式不正确。')
    config.value = fragment.value
      ? parseOtp(
          `https://2fa.hot/2fa${new URL(route.fullPath, 'https://2fa.hot').search}${fragment.value}`
        )
      : parseOtp(String(route.params.secret), {
          algorithm: algorithmFrom(String(options.algorithm ?? 'SHA1')),
          digits: Number(options.digits ?? 6) as 6 | 8,
          period: Number(options.period ?? 30)
        })
    if (expandedConfig.value && identity(expandedConfig.value) === identity(config.value)) {
      config.value = {
        ...config.value,
        label: expandedConfig.value.label,
        issuer: expandedConfig.value.issuer
      }
    }
  } catch (e) {
    issue.value = (e as Error).message
  }
}
function useFragmentLink() {
  if (!config.value) return
  return navigateTo(localePath(sealedAccessPath([config.value])), { replace: true })
}
function submit() {
  if (pendingPaste.value) return
  recognizeMixedInput()
  if (pendingPaste.value) return
  try {
    const parsed = parseOtp(input.value)
    expandedConfig.value = parsed
    expandedHistoryPreview.value = false
    navigateTo(localePath(sealedAccessPath([parsed])))
    input.value = ''
  } catch (e) {
    issue.value = (e as Error).message
  }
}
function acceptPaste(value: OtpConfig, source = '') {
  input.value = toOtpUri(value)

  pendingPaste.value = null
  originalInput.value = source
  extracted.value = extractedSurroundingText(source)
    ? '已从粘贴内容中提取密钥，已忽略周围文字。'
    : source && source !== input.value
      ? '已自动整理输入格式。'
      : ''
  issue.value = ''
}
function inspectPaste(source: string) {
  extracted.value = ''
  originalInput.value = ''
  issue.value = ''
  if (!source.trim()) {
    issue.value = '剪贴板中没有文本，请先复制密钥。'
    return
  }
  const analysis = analyzePaste(source)
  if (analysis.kind === 'single') acceptPaste(analysis.candidates[0]!.config, source)
  else if (analysis.candidates.length > 1) pendingPaste.value = { source, analysis }
  else {
    input.value = source
    pendingPaste.value = null
    issue.value = analysis.issue || '密钥格式不正确，请检查是否包含多余字符。'
  }
}
function recognizeMixedInput() {
  if (analyzePaste(input.value).candidates.length > 1) {
    inspectPaste(input.value)
    return
  }
  try {
    parseOtp(input.value)
    return
  } catch {}
  if (analyzePaste(input.value).candidates.length) inspectPaste(input.value)
}
function handlePaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text/plain')
  if (!text) return
  event.preventDefault()
  const field = event.target as HTMLInputElement
  inspectPaste(
    pastedInputText(
      input.value,
      text,
      field.selectionStart ?? 0,
      field.selectionEnd ?? input.value.length
    )
  )
}
function transferPaste(value: string) {
  batchTransfer.value = value
  pendingPaste.value = null
  void navigateTo(localePath('/'))
}
function clear() {
  config.value = null
  input.value = ''
  navigateTo(localePath('/'), { replace: true })
}
watch(() => route.fullPath, load)
// These routes are client-rendered; resolve before the transition captures the card.
if (import.meta.client) load()
const vault = useVault()
watch(
  vault.unlocked,
  (unlocked) => {
    if (
      unlocked ||
      !historyPreviewIdentity ||
      (config.value && identity(config.value) !== historyPreviewIdentity)
    )
      return
    historyPreviewIdentity = ''
    config.value = null
    input.value = ''
    fragment.value = ''
    expandedConfig.value = null
    expandedHistoryPreview.value = false
    // Remove the secret from the current URL as well as the rendered preview.
    void navigateTo(localePath('/2fa'), { replace: true })
  },
  { flush: 'sync', immediate: true }
)
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })
</script>
<template>
  <div class="direct-page">
    <UModal
      v-model:open="pathWarning"
      :dismissible="false"
      :close="false"
      :title="tx('MC Tip · 密钥隐私提醒')"
      :description="
        tx(
          '密钥在网址路径中。直接打开此链接时，路径已随页面请求发送至托管服务；本提示无法撤回或阻止已发出的请求。'
        )
      "
    >
      <template #body>
        <div class="path-warning-copy">
          <p>
            <code dir="ltr">/2fa#YOUR_SECRET</code>
          </p>
          <p>
            {{
              tx(
                '建议改用 # 链接：# 后的密钥不会随页面请求发送，但完整链接仍可能留在浏览器历史中，请勿公开分享。'
              )
            }}
          </p>
          <p>
            {{
              tx(
                '改用 # 链接只减少后续请求中的暴露，无法撤回已经发送的密钥，也不会替你更新原服务的密钥。'
              )
            }}
          </p>
          <p class="path-warning-advice">
            {{
              tx(
                '密钥可能留在托管服务或代理的访问记录中，这不代表已被他人获取。建议到原网站或 App 的双重验证设置中重新生成密钥，并确认原密钥已失效；不要在这里随意修改字符。'
              )
            }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="path-warning-actions">
          <UButton v-if="config" class="primary-button" @click="useFragmentLink">{{
            tx('改用 # 链接')
          }}</UButton>
          <UButton :to="localePath('/help#link-privacy')" color="neutral" variant="link">{{
            tx('为什么使用 #？')
          }}</UButton>
          <UButton color="neutral" variant="outline" @click="pathWarning = false">{{
            tx('继续')
          }}</UButton>
          <UButton color="neutral" variant="ghost" @click="clear">{{ tx('返回首页') }}</UButton>
        </div>
      </template>
    </UModal>
    <div v-if="missing" class="direct-intro">
      <h1>{{ tx('获取验证码') }}</h1>
    </div>
    <div v-if="missing" class="direct-input">
      <UFormField v-show="!pendingPaste" :label="tx('2FA 密钥')"
        ><UInput
          v-model="input"
          type="password"
          class="w-full"
          size="xl"
          autocomplete="off"
          data-1p-ignore
          data-op-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
          :placeholder="tx('输入密钥')"
          @paste="handlePaste"
          @compositionstart="composing = true"
          @compositionend="composing = false"
          @blur="recognizeMixedInput"
          @keydown.enter="submit"
      /></UFormField>
      <PasteNotice v-if="extracted && !pendingPaste" :message="extracted" :source="originalInput" />
      <SmartPasteReview
        v-if="pendingPaste"
        :key="pendingPaste.source"
        :source="pendingPaste.source"
        :analysis="pendingPaste.analysis"
        masked
        @select="acceptPaste"
        @batch="transferPaste"
        @cancel="pendingPaste = null"
        @inspect="inspectPaste"
      />
      <UButton
        v-if="!pendingPaste"
        class="primary-button w-full mt-4"
        :disabled="!!pendingPaste"
        @click="submit"
        >{{ tx('获取验证码') }}<UIcon name="i-lucide-arrow-right"
      /></UButton>
    </div>
    <div v-else-if="issue" class="direct-error">
      <UIcon name="i-lucide-circle-alert" class="text-3xl" />
      <h2>{{ tx('无法获取验证码') }}</h2>
      <p>{{ tx(issue) }}</p>
      <UButton :to="localePath('/2fa/')" color="neutral" variant="outline">{{
        tx('重新输入密钥')
      }}</UButton>
    </div>
    <div v-else-if="batchSource" class="direct-result direct-batch ore-workspace-frame">
      <BatchWorkspace
        :initial="batchSource"
        :import-version="batchVersion"
        replace
        standalone
        @rows="followBatch"
        @collapse="collapseBatch"
      />
    </div>
    <div v-else class="direct-result ore-workspace-frame">
      <OtpResult
        :config="pathWarning ? null : config"
        :history-preview="!!config && historyPreviewIdentity === identity(config)"
        :sealed-link="sealedLink"
        standalone
      />
      <div v-if="config" class="direct-meta">
        <div class="direct-secret-label">
          <UPopover
            mode="hover"
            :open-delay="0"
            :close-delay="100"
            enable-touch
            :content="{ side: 'top', align: 'start', sideOffset: 2 }"
            arrow
            :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
          >
            <button
              type="button"
              class="secret-parameters-trigger"
              :aria-label="tx(secretCopied ? '密钥已复制' : '复制密钥')"
              :disabled="pathWarning || copyingSecret"
              @click="copySecret"
            >
              <UIcon v-if="secretCopied" name="i-mc-check" class="text-primary" />
              <img v-else src="/textures/trial-key.png" alt="" width="24" height="24" />
            </button>
            <template #content>
              <p class="secret-copy-hint">
                {{ tx(secretCopyError || (secretCopied ? '密钥已复制' : '复制密钥')) }}
              </p>
              <div class="direct-parameters">
                <span>TOTP</span>
                <span>{{ config.algorithm }}</span>
                <span>{{
                  tx('{digits} 位 · 每 {period} 秒更新', {
                    digits: config.digits,
                    period: config.period
                  })
                }}</span>
              </div>
            </template>
          </UPopover>
          <span id="direct-secret-label" class="sr-only">{{ tx('密钥') }}</span>
        </div>
        <SecretReveal :key="config.secret" :secret="config.secret" label-id="direct-secret-label" />
      </div>
      <p v-if="secretCopied || secretCopyError" class="sr-only" role="status">
        {{ tx(secretCopyError || '密钥已复制') }}
      </p>
    </div>
    <p v-if="missing && issue" class="inline-error" role="alert">{{ tx(issue) }}</p>
    <div class="direct-bottom">
      <NuxtLink :to="localePath('/help')">{{ tx('验证码无法使用？') }}</NuxtLink>
    </div>
  </div>
</template>
<style scoped>
.path-warning-copy {
  display: grid;
  gap: 0.75rem;
}
.path-warning-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.path-warning-advice {
  color: var(--ui-text-highlighted);
}
.direct-page {
  max-width: 54rem;
  margin: clamp(2rem, 9svh, 7rem) auto 0;
  padding: 0 1.5rem;
}
.direct-intro {
  margin: 1.75rem 0 2rem;
}
.direct-intro h1 {
  font-size: var(--text-title);
  font-weight: 600;
  line-height: 1.3;
}
.direct-result {
  position: relative;
  margin-top: 0;
  padding: clamp(1.25rem, 3vw, 2rem);
  background: var(--wash);
  view-transition-name: otp-result;
}
.direct-result :deep(.otp-digits) {
  font-size: clamp(4.5rem, 9vw, 8rem);
  margin-block: clamp(1.5rem, 4vh, 2.5rem);
}
.direct-result :deep(.otp-digits.eight) {
  font-size: clamp(3.5rem, 7.5vw, 6.5rem);
}
/* As in the tool's result panel, the slots share the full width, so the row
   lines up with the heading, countdown, track and buttons. */
.direct-result :deep(.otp-slots) {
  width: 100%;
}
.direct-result :deep(.otp-slot) {
  flex: 1;
  min-width: 0;
  width: auto;
}
.direct-result :deep(.result-head) {
  align-items: center;
  border-bottom: 0;
  padding-block: 0.5rem;
  padding-inline-end: 0;
}
.direct-result :deep(.result-head > span) {
  font-size: clamp(1.125rem, 2vw, 1.375rem);
  line-height: 1.3;
}
.direct-result :deep(.countdown-meta) {
  margin: 0;
  gap: 0.75rem;
  font-size: 1rem;
  font-weight: 400;
}
.direct-result :deep(.countdown-value) {
  min-width: 8ch;
  justify-content: flex-end;
  font-variant-numeric: tabular-nums;
}
.direct-result :deep(.countdown-track) {
  max-width: none;
  width: 100%;
}
.direct-result :deep(.result-copy) {
  min-height: 3.25rem;
  margin-top: 1rem;
  font-size: 1.125rem;
  border-radius: 0;
}
.direct-meta {
  display: grid;
  grid-template-columns: 2.75rem minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
  margin-top: 1rem;
  border-top: 1px solid var(--ui-border);
  padding-top: 0.75rem;
}
.direct-result :deep(.secret-reveal) {
  margin-top: 0;
}
.direct-secret-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  color: var(--ui-text-highlighted);
  font-size: var(--text-label);
}
.secret-parameters-trigger img {
  width: 1.5rem;
  height: 1.5rem;
  image-rendering: pixelated;
}
.direct-secret-label .secret-parameters-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.secret-parameters-trigger:hover,
.secret-parameters-trigger:focus-visible {
  color: var(--ui-text-highlighted);
}
.secret-parameters-trigger:focus-visible {
  outline: 2px solid var(--accent-ink);
}
.direct-parameters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.625rem;
  max-width: 100%;
  font-size: inherit;
}
.secret-copy-hint {
  margin-bottom: 0.25rem;
  font-weight: 600;
}
.direct-parameters > span {
  white-space: nowrap;
}
.direct-parameters > span + span::before {
  content: '·';
  margin-inline-end: 0.625rem;
}
@media (max-width: 600px) {
  .direct-parameters {
    justify-content: flex-start;
  }
}
.direct-bottom {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: var(--text-label);
  color: var(--ui-text-muted);
  margin-top: 1rem;
}
.direct-bottom {
  view-transition-name: otp-help;
}
.direct-bottom > * {
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
}
.direct-error {
  padding: 2rem;
  background: var(--wash);
  border-radius: var(--ui-radius);
}
.direct-error h2 {
  font-size: var(--text-section);
  margin: 0.75rem 0;
}
.direct-error p {
  color: var(--ui-text-muted);
  margin-bottom: 1.25rem;
}
.direct-input {
  padding: 1.75rem;
  background: var(--panel);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}
@media (max-width: 600px) {
  .direct-page {
    margin-top: 1rem;
    padding-inline: 1.25rem;
  }
  .direct-result :deep(.result-head) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .direct-result :deep(.result-head-actions) {
    width: 100%;
    justify-content: flex-end;
  }
  .direct-result :deep(.countdown-meta) {
    font-size: 0.875rem;
  }
  .direct-intro {
    margin: 1.5rem 0;
  }
  .direct-result {
    padding: 1.5rem 1.25rem;
  }
  .direct-result :deep(.otp-digits) {
    font-size: clamp(2.75rem, 13vw, 4.5rem);
  }
  .direct-result :deep(.otp-digits.eight) {
    font-size: clamp(2rem, 10vw, 3.25rem);
  }
}
@media (min-width: 601px) and (max-height: 760px) {
  .direct-page {
    margin-top: 1.5rem;
  }
}
@media (max-width: 360px) {
  .direct-result {
    padding-inline: 1rem;
  }
  .direct-result :deep(.otp-digits) {
    font-size: 2.75rem;
  }
  .direct-result :deep(.otp-digits.eight) {
    font-size: 2rem;
  }
}
</style>
