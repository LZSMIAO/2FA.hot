<script setup lang="ts">
const { tx } = useMessages()
import { sealedAccessPath, toAccessPath, toOtpUri, type OtpConfig } from '~/utils/otp'
import { downloadFile } from '~/utils/download'
const props = defineProps<{ mode: 'qr' | 'link'; config: OtpConfig }>()
const emit = defineEmits<{ close: [] }>()
const open = shallowRef(true),
  qr = shallowRef(''),
  issue = shallowRef('')
const label = shallowRef(props.config.label),
  issuer = shallowRef(props.config.issuer)
const { copied, message, copy } = useCopy()
const { copied: safeCopied, message: safeMessage, copy: copySafe } = useCopy()
const config = computed(() => ({ ...props.config, label: label.value, issuer: issuer.value }))
const value = computed(() =>
  props.mode === 'qr'
    ? toOtpUri(config.value)
    : `${window.location.origin}${toAccessPath(config.value)}`
)
// Sealed here in the browser when the dialog opens, ready to copy within the click.
const safeLink = computed(() =>
  props.mode === 'link' ? `${window.location.origin}${sealedAccessPath([props.config])}` : ''
)
/*
 * The link box masks its key as the key field does; settings after ? stay
 * readable. Masked text is not selectable, so a manual copy never yields
 * asterisks. If copying the safe link fails, the box shows it for a manual copy.
 */
const shown = shallowRef<'masked' | 'plain' | 'safe'>('masked')
const linkParameters = computed(() => {
  const path = toAccessPath(config.value)
  return path.includes('?') ? path.slice(path.indexOf('?')) : ''
})
const origin = computed(() => window.location.origin)
async function copySafeLink() {
  if (!(await copySafe(safeLink.value))) shown.value = 'safe'
}
let sequence = 0
watch(
  value,
  async (v) => {
    if (props.mode !== 'qr') return
    const id = ++sequence
    try {
      const { toDataURL } = await import('qrcode')
      const image = await toDataURL(v, { width: 288, margin: 4, errorCorrectionLevel: 'M' })
      if (id === sequence) qr.value = image
    } catch {
      issue.value = '无法生成二维码，请检查输入长度。'
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  sequence++
})
</script>
<template>
  <UModal
    v-model:open="open"
    @after:leave="emit('close')"
    :title="tx(mode === 'qr' ? '添加到你的验证器' : '独立验证码获取链接')"
    :description="
      tx(mode === 'qr' ? '使用验证器 App 扫描二维码。' : '打开链接即显示验证码，无需再次输入。')
    "
    ><template #body
      ><div class="modal-stack">
        <div v-if="mode === 'qr'" class="grid grid-cols-2 gap-3">
          <UFormField :label="tx('服务名（可选）')"
            ><UInput
              v-model="issuer"
              maxlength="120"
              :placeholder="tx('例如 GitHub')"
              class="w-full" /></UFormField
          ><UFormField :label="tx('标签（可选）')"
            ><UInput
              v-model="label"
              maxlength="120"
              :placeholder="tx('例如 工作账户')"
              class="w-full"
          /></UFormField>
        </div>
        <div v-if="qr && mode === 'qr'" class="qr-image">
          <img :src="qr" :alt="tx('包含当前密钥的 TOTP 配置二维码')" width="288" height="288" />
        </div>
        <div class="export-notice">
          <p>
            {{
              tx(
                mode === 'qr'
                  ? '二维码和配置文件包含密钥，请仅交给需要使用的人。'
                  : '安全链接不含明文密钥，在你的浏览器本地加密生成，不经过服务器。两种链接都能直接打开验证码，请谨慎分享。'
              )
            }}
          </p>
          <UPopover
            v-if="mode === 'link'"
            mode="hover"
            :open-delay="0"
            :close-delay="100"
            enable-touch
            arrow
            :content="{ side: 'top', align: 'end', sideOffset: 2 }"
            :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
          >
            <button
              type="button"
              class="info-mark info-mark-essential"
              :aria-label="tx('为什么使用 #？')"
            >
              <UIcon name="i-lucide-info" aria-hidden="true" />
            </button>
            <template #content>
              <div class="link-info-content">
                <strong>{{ tx('为什么使用 #？') }}</strong>
                <p>
                  {{
                    tx(
                      '片段链接将密钥放在 # 后面，由浏览器读取和计算，不随页面请求发送。完整链接仍包含密钥，请勿公开分享。'
                    )
                  }}
                </p>
                <strong>{{ tx('安全链接是怎么生成的？') }}</strong>
                <p>
                  {{
                    tx(
                      '安全链接由你的浏览器在本地生成：用一次性随机密钥加密 # 后面的内容，再把这把密钥一起放进链接；打开时也由浏览器在本地解开。加密和解密都不需要联网，# 后面的内容也不会发送给服务器。地址栏、浏览器历史和截图中不会出现明文密钥，但拿到完整链接的人仍能打开，请勿公开分享。'
                    )
                  }}
                </p>
              </div>
            </template>
          </UPopover>
        </div>
        <textarea
          v-if="mode === 'qr'"
          :value="value"
          readonly
          class="export-value mono"
          :aria-label="tx('包含密钥的配置或获取链接')"
        />
        <div v-else class="export-link">
          <div
            class="export-value mono"
            :class="{ 'is-masked': shown === 'masked' }"
            role="textbox"
            aria-readonly="true"
            :aria-label="tx('包含密钥的配置或获取链接')"
            dir="ltr"
          >
            <template v-if="shown === 'masked'"
              >{{ origin }}/2fa#<span class="secret-pixel-mask">****************</span
              >{{ linkParameters }}</template
            ><template v-else>{{ shown === 'safe' ? safeLink : value }}</template>
          </div>
          <button
            type="button"
            class="link-visibility"
            :aria-label="tx(shown === 'plain' ? '隐藏密钥' : '查看密钥')"
            :aria-pressed="shown === 'plain'"
            @click="shown = shown === 'plain' ? 'masked' : 'plain'"
          >
            <UIcon :name="shown === 'plain' ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
          </button>
        </div>
        <p v-if="issue || message || safeMessage" class="inline-error">
          {{ tx(issue || message || safeMessage) }}
        </p>
      </div></template
    ><template #footer
      ><div class="modal-actions w-full">
        <UButton
          v-if="mode === 'qr'"
          color="neutral"
          variant="outline"
          :disabled="!qr"
          icon="i-lucide-download"
          @click="downloadFile(qr, '2fa-configuration.png')"
          >{{ tx('下载 PNG') }}</UButton
        ><UButton
          v-if="mode === 'link'"
          color="neutral"
          variant="outline"
          :icon="safeCopied ? 'i-mc-check' : 'i-lucide-shield-check'"
          @click="copySafeLink"
          >{{ tx(safeCopied ? '已复制' : '安全链接') }}</UButton
        ><UButton
          class="primary-button"
          :icon="copied ? 'i-mc-check' : 'i-lucide-copy'"
          @click="copy(value)"
          >{{ tx(copied ? '已复制' : mode === 'qr' ? '复制配置 URI' : '复制获取链接') }}</UButton
        >
      </div></template
    ></UModal
  >
</template>
<style scoped>
.export-notice {
  /* Match the modal's paragraph size; the mark aligns to this line's text. */
  font-size: var(--text-label);
}
.export-notice p {
  /* Inline, so the info mark trails the notice's last word. */
  display: inline;
}
.export-notice .info-mark {
  cursor: default;
}
.link-info-content {
  display: grid;
  gap: 0.375rem;
}

.qr-image {
  background: white;
  width: 288px;
  max-width: 100%;
  margin: auto;
  border-radius: var(--ui-radius);
  overflow: hidden;
}
.export-value {
  width: 100%;
  min-height: 88px;
  resize: vertical;
  padding: 12px;
  background: var(--wash);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  font-size: var(--text-caption);
  word-break: break-all;
}
.export-link {
  position: relative;
}
.export-link .export-value {
  padding-right: 52px;
}
.export-value.is-masked {
  user-select: none;
}
.export-value .secret-pixel-mask {
  /* The key field's pixel asterisks, scaled to this box's caption text. */
  font-size: 1.5em;
  line-height: 0;
}
.link-visibility {
  position: absolute;
  top: 2px;
  right: 2px;
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.link-visibility .iconify {
  width: 20px;
  height: 20px;
}
.link-visibility:hover {
  color: var(--ui-text-highlighted);
}
.link-visibility:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}
</style>
