<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
const emit = defineEmits<{ close: []; back: [] }>()
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
    detail:
      '电脑上按回车直接复制当前验证码；在密钥框按上下方向键，可以翻出本地历史里保存过的密钥。'
  },
  {
    icon: 'i-lucide-maximize-2',
    title: '批量独立页',
    detail:
      '批量结果右上角的展开图标，会把验证码放到独立页面，一屏显示全部，适合一边核对一边输入。'
  },
  {
    icon: 'i-lucide-gamepad-2',
    title: 'Steam Guard',
    detail: '把 Steam 的 shared_secret 或 maFile 内容直接粘贴进来，会按 5 位、30 秒的规则取码。',
    link: '/help#steam'
  },
  {
    icon: 'i-lucide-feather',
    title: 'Lite 轻量版',
    detail:
      '设备老旧或网络受限时可以用 Lite 版，不加载前端框架，兼容到 IE11，同样只在本地取码。',
    link: '/lite'
  },
  {
    icon: 'i-lucide-languages',
    title: '语言、主题与朗读',
    detail: '界面和教学提供 30 种语言，教学可以朗读。深浅主题和按钮音效都在页首切换。'
  }
]
const narration = useGuideNarration(
  () =>
    `${tx('网站小技巧')}。${tips.map((tip) => `${tx(tip.title)}。${tx(tip.detail)}`).join(' ')}`,
  () => false
)
onMounted(() => panel.value?.focus({ preventScroll: true }))
</script>

<template>
  <aside
    ref="panel"
    tabindex="-1"
    class="site-tips tutorial-window"
    role="dialog"
    :aria-label="tx('网站小技巧')"
  >
    <div class="tutorial-title">
      <span
        ><UIcon name="i-lucide-lightbulb" />{{ tx('网站小技巧')
        }}<GuideVoiceButton
          :enabled="narration.enabled.value"
          @toggle="narration.toggle()" /></span
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
      <p class="site-tips-intro">{{ tx('这些功能不影响取码，但知道了会顺手很多。') }}</p>
      <ul class="site-tips-list">
        <li v-for="tip in tips" :key="tip.title">
          <span class="site-tip-icon" aria-hidden="true"><UIcon :name="tip.icon" /></span>
          <div>
            <strong>{{ tx(tip.title) }}</strong>
            <p>{{ tx(tip.detail) }}</p>
            <NuxtLink v-if="tip.link" :to="localePath(tip.link)" @click="emit('close')"
              >{{ tx('使用说明') }} ↗</NuxtLink
            >
          </div>
        </li>
      </ul>
      <p class="site-tips-privacy">
        <UIcon name="i-lucide-monitor" aria-hidden="true" />{{
          tx('密钥、历史和二维码识别都在你的浏览器里完成，服务器不会收到密钥。')
        }}
      </p>
    </div>
    <div class="site-tips-controls">
      <UButton variant="outline" color="neutral" icon="i-lucide-arrow-left" @click="emit('back')">{{
        tx('返回教学')
      }}</UButton>
      <UButton class="primary-button" @click="emit('close')">{{ tx('我会用了') }}</UButton>
    </div>
  </aside>
</template>

<style scoped>
.site-tips {
  display: flex;
  flex-direction: column;
  max-height: min(42rem, calc(100svh - 3rem));
}
.tutorial-title > span {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.site-tips-body {
  overflow-y: auto;
  padding: 1rem 1.25rem 0;
}
.site-tips-intro {
  margin: 0 0 1rem;
  font-size: var(--text-label);
  line-height: 1.8;
  color: var(--ui-text-muted);
}
.site-tips-list {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.site-tips-list > li {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--ui-border);
}
.site-tips-list > li:last-child {
  border-bottom: 0;
  padding-bottom: 0;
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
.site-tips-list strong {
  display: block;
  font-size: var(--text-label);
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.site-tips-list p {
  margin: 0;
  font-size: var(--text-label);
  line-height: 1.8;
  color: var(--ui-text);
}
.site-tips-list a {
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
  margin: 1rem 0;
  padding-top: 1rem;
  border-top: 1px solid var(--ui-border);
  font-size: var(--text-caption);
  line-height: 1.7;
  color: var(--ui-text-muted);
}
.site-tips-privacy > :deep(.iconify) {
  flex-shrink: 0;
  margin-top: 0.125rem;
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
  .site-tips {
    max-height: none;
  }
  .site-tips-body {
    overflow-y: visible;
    padding: 1rem 1rem 0;
  }
  .site-tips-controls > :deep(button) {
    min-height: 2.75rem;
  }
}
</style>
