<script setup lang="ts">
const { tx } = useMessages()
import { toAccessPath, toOtpUri, type OtpConfig } from '~/utils/otp'
import { downloadFile } from '~/utils/download'
const props = defineProps<{ mode: 'qr' | 'link'; config: OtpConfig }>()
const emit = defineEmits<{ close: [] }>()
const open = shallowRef(true),
  qr = shallowRef(''),
  issue = shallowRef('')
const label = shallowRef(props.config.label),
  issuer = shallowRef(props.config.issuer)
const { copied, message, copy } = useCopy()
const config = computed(() => ({ ...props.config, label: label.value, issuer: issuer.value }))
const value = computed(() =>
  props.mode === 'qr'
    ? toOtpUri(config.value)
    : `${window.location.origin}${toAccessPath(config.value)}`
)
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
                  : '链接含密钥，会留在浏览器历史中，请谨慎分享。'
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
            :ui="{ content: 'parameter-help-tooltip h-auto', arrow: 'parameter-help-arrow' }"
          >
            <button type="button" class="link-info" :aria-label="tx('为什么使用 #？')">
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
              </div>
            </template>
          </UPopover>
        </div>
        <textarea
          :value="value"
          readonly
          class="export-value mono"
          :aria-label="tx('包含密钥的配置或获取链接')"
        />
        <p v-if="issue || message" class="inline-error">{{ tx(issue || message) }}</p>
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
  display: flex;
  align-items: flex-start;
  gap: var(--control-gap, 0.5rem);
}
.export-notice p {
  flex: 1;
}
.link-info {
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: default;
}
.link-info .iconify {
  width: 16px;
  height: 16px;
}
.link-info:hover,
.link-info:focus-visible {
  color: var(--ui-text-highlighted);
}
.link-info:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
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
</style>
