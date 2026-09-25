<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
const emit = defineEmits<{ close: []; back: []; understood: [] }>()
const panel = useTemplateRef<HTMLElement>('panel')

/** Feature discovery, kept separate from the step-by-step tutorials. */
const tips = [
  {
    icon: 'i-lucide-clipboard-paste',
    title: '随手粘贴',
    detail:
      '页面任何位置按 Ctrl/⌘ + V 都能粘贴密钥，不必先点输入框。整段文字、截图和二维码图片也可以直接拖进页面。'
  },
  {
    icon: 'i-lucide-scan-line',
    title: '二维码与账号迁移',
    detail:
      '支持二维码图片、屏幕截图和摄像头扫描，也能读取 Google Authenticator 的迁移二维码；一张图里有多个账号时，可以只挑需要的几个。',
    link: '/help#start'
  },
  {
    icon: 'i-lucide-link',
    title: '把密钥存成书签',
    detail:
      '生成验证码后点“获取链接”，得到 /2fa#密钥 形式的地址。# 后面的内容不会随请求发给服务器，打开书签就能看到当前验证码。',
    link: '/help#link-privacy'
  },
  {
    icon: 'i-lucide-history',
    title: '本地历史可以加密',
    detail:
      '历史默认关闭。开启后记录只留在这台浏览器，可以设置口令加密，也能导出加密备份，换设备时再导入。',
    link: '/help#history'
  },
  {
    icon: 'i-lucide-keyboard',
    title: '键盘更快',
    detail: '电脑上按回车直接复制当前验证码；在密钥框按上下方向键，可以翻出本地历史里保存过的密钥。'
  },
  {
    icon: 'i-lucide-maximize-2',
    title: '批量独立页',
    detail: '批量结果右上角的展开图标，会把验证码放到独立页面，一屏显示全部，适合一边核对一边输入。'
  },
  {
    icon: 'i-lucide-feather',
    title: 'Lite 轻量版',
    detail: '设备老旧或网络受限时可以用 Lite 版，不加载前端框架，兼容到 IE11，同样只在本地取码。',
    link: '/lite'
  },
  {
    icon: 'i-lucide-languages',
    title: '语言、主题与朗读',
    detail: '界面和教学提供 30 种语言，教学可以朗读。深浅主题和按钮音效都在页首切换。'
  }
]
const index = shallowRef(0)
const tip = computed(() => tips[index.value]!)
const last = computed(() => index.value === tips.length - 1)
// The narration reads only what the card is showing.
const narration = useGuideNarration(
  () => `${tx(tip.value.title)}。${tx(tip.value.detail)}`,
  () => false
)
function show(value: number) {
  index.value = value
  narration.restart()
}
onMounted(() => panel.value?.focus({ preventScroll: true }))
</script>

<template>
  <aside ref="panel" tabindex="-1" class="site-tips" role="dialog" :aria-label="tx('网站小技巧')">
    <div class="tutorial-title">
      <span
        ><UIcon name="i-lucide-lightbulb" />{{ tx('网站小技巧')
        }}<GuideVoiceButton :enabled="narration.enabled.value" @toggle="narration.toggle()" /></span
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
    <div class="site-tips-body">
      <p v-if="!index" class="site-tips-intro">
        {{ tx('这些功能不影响取码，但知道了会顺手很多。') }}
      </p>
      <div class="site-tip" aria-live="polite">
        <span class="site-tip-icon" aria-hidden="true"><UIcon :name="tip.icon" /></span>
        <div>
          <strong>{{ tx(tip.title) }}</strong>
          <p>{{ tx(tip.detail) }}</p>
          <NuxtLink v-if="tip.link" :to="localePath(tip.link)" @click="emit('close')"
            >{{ tx('使用说明') }} ↗</NuxtLink
          >
        </div>
      </div>
      <p v-if="last" class="site-tips-privacy">
        <UIcon name="i-lucide-monitor" aria-hidden="true" />{{
          tx('密钥、历史和二维码识别都在你的浏览器里完成，服务器不会收到密钥。')
        }}
      </p>
      <div class="site-tips-steps">
        <button
          v-for="(entry, position) in tips"
          :key="entry.title"
          type="button"
          class="site-tips-step"
          :class="{ 'is-current': position === index }"
          :aria-label="tx(entry.title)"
          :aria-current="position === index ? 'true' : undefined"
          @click="show(position)"
        >
          {{ position + 1 }}
        </button>
      </div>
    </div>
    <div class="site-tips-controls">
      <UButton variant="outline" color="neutral" icon="i-lucide-arrow-left" @click="emit('back')">{{
        tx('返回教学')
      }}</UButton>
      <UButton v-if="!last" class="primary-button" @click="show(index + 1)">{{
        tx('下一步')
      }}</UButton>
      <UButton v-else class="primary-button" @click="emit('understood')">{{
        tx('我明白了')
      }}</UButton>
    </div>
  </aside>
</template>

<style scoped>
/* The tutorial card's surface is scoped to its own component; repeat it here. */
.site-tips {
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
}
.site-tips-body {
  padding: 1rem 1.25rem;
}
.site-tips-intro {
  margin: 0 0 1rem;
  font-size: var(--text-label);
  line-height: 1.8;
  color: var(--ui-text-muted);
}
.site-tip {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.75rem;
  min-height: 11rem;
  align-content: start;
}
.site-tip-icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--ui-radius);
  background: var(--wash);
  color: var(--accent-ink);
}
.site-tip strong {
  display: block;
  font-size: var(--text-label);
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.site-tip p {
  margin: 0;
  font-size: var(--text-label);
  line-height: 1.8;
  color: var(--ui-text);
}
.site-tip a {
  display: inline-block;
  margin-top: 0.375rem;
  font-size: var(--text-caption);
  color: var(--ui-text-highlighted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.site-tips-privacy {
  display: flex;
  align-items: start;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  font-size: var(--text-caption);
  line-height: 1.7;
  color: var(--ui-text-muted);
}
.site-tips-privacy > :deep(.iconify) {
  flex-shrink: 0;
  margin-top: 0.125rem;
}
.site-tips-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ui-border);
}
.site-tips-step {
  min-width: 1.875rem;
  min-height: 1.875rem;
  padding: 0 0.25rem;
  border: 1px solid var(--ui-border);
  background: var(--wash);
  color: var(--ui-text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}
.site-tips-step:hover {
  color: var(--accent-ink);
  border-color: var(--accent-ink);
}
.site-tips-step.is-current {
  background: var(--action);
  border-color: var(--action);
  color: #fff;
}
.site-tips-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--ui-border);
}
.site-tips-controls > :deep(button) {
  min-height: 3rem;
  padding-block: 0.5rem;
}
@media (max-width: 700px), (max-height: 500px) and (pointer: coarse) {
  .site-tips-body {
    padding: 1rem;
  }
  .site-tip {
    min-height: 0;
  }
  .site-tips-step {
    min-width: 2.25rem;
    min-height: 2.25rem;
  }
  .site-tips-controls > :deep(button) {
    min-height: 2.75rem;
  }
}
</style>
