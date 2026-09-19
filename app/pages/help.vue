<script setup lang="ts">
const localePath = useLocalePath()
definePageMeta({ viewTransition: false })
const { tx } = useMessages()
const route = useRoute()
const sections = [
  { id: 'start', label: '开始取码', icon: 'i-lucide-scan-line' },
  { id: 'steam', label: 'Steam Guard', icon: 'i-lucide-gamepad-2' },
  { id: 'troubleshooting', label: '问题排查', icon: 'i-lucide-wrench' },
  { id: 'links', label: '取码链接', icon: 'i-lucide-link' },
  { id: 'link-privacy', label: '为什么使用 #？', icon: 'i-lucide-shield-check' },
  { id: 'history', label: '历史与备份', icon: 'i-lucide-archive' }
]
</script>
<template>
  <article class="content-page help-page">
    <NuxtLink :to="localePath('/')" class="back-link"
      ><UIcon name="i-lucide-arrow-left" />{{ tx('返回工具') }}</NuxtLink
    >
    <h1>{{ tx('使用说明') }}</h1>
    <p class="article-lead">
      {{ tx('从导入密钥到获取验证码，了解 TOTP 与 Steam Guard 的用法。') }}
    </p>
    <nav class="article-nav help-nav" :aria-label="tx('本页目录')">
      <NuxtLink
        v-for="section in sections"
        :key="section.id"
        :to="{ path: route.path, hash: `#${section.id}` }"
        :aria-current="route.hash === `#${section.id}` ? 'location' : undefined"
      >
        <UIcon :name="section.icon" aria-hidden="true" />
        <span>{{ tx(section.label) }}</span>
      </NuxtLink>
    </nav>
    <h2 id="start">{{ tx('如何获取验证码') }}</h2>
    <ol>
      <li>
        {{
          tx(
            '如果你已经有别人提供或以前保存的 2FA 密钥，直接复制即可，不用重新设置账号。密钥是一长串字母和数字，不是登录密码，也不是会过期的六位验证码。'
          )
        }}
      </li>
      <li>{{ tx('将密钥粘贴到首页，也可以导入二维码图片或扫描二维码。') }}</li>
      <li>{{ tx('复制当前验证码，回到原服务完成验证。') }}</li>
    </ol>
    <p>
      {{
        tx(
          '密钥通常由字母 A–Z 和数字 2–7 组成。六位验证码是计算结果，不能反推出密钥。网站不会替你找回已丢失的密钥。'
        )
      }}
    </p>
    <h2 id="steam">{{ tx('Steam Guard 如何取码？') }}</h2>
    <p>
      {{
        tx(
          '在首页将“验证方式”设为 Steam Guard，粘贴账号的 shared_secret（Base64 共享密钥）。也可以直接粘贴 maFile 的 JSON 内容，网站会自动识别其中的 shared_secret。'
        )
      }}
    </p>
    <p>
      {{
        tx(
          'Steam 验证码为 5 位字母和数字，每 30 秒更新；算法、位数和周期自动固定，无需调整。请勿输入登录密码、恢复码或 identity_secret。'
        )
      }}
    </p>
    <h3>{{ tx('如何确认生成正确？') }}</h3>
    <ol>
      <li>
        {{
          tx(
            '先用测试密钥检查：选择 Steam Guard，粘贴下面的公开测试数据，应显示 5 位验证码并随倒计时更新。此密钥不能用于真实账号登录。'
          )
        }}<br /><code dir="ltr">cnOgv/KdpLoP6Nbh0GMkXkPXALQ=</code>
      </li>
      <li>
        {{
          tx(
            '验证自己的账号时，使用该账号已有的 shared_secret，在同一个 30 秒周期内与原验证器对比；连续两轮相同后，再到 Steam 官方登录页尝试当前验证码。'
          )
        }}
      </li>
    </ol>
    <p>
      {{
        tx(
          '没有 shared_secret 或 maFile 时，只能做演示测试。不要为测试移除原验证器，也不要向任何人发送真实密钥或完整 maFile。'
        )
      }}
    </p>
    <h2 id="troubleshooting">{{ tx('验证码为什么无法使用？') }}</h2>
    <ul>
      <li>{{ tx('确认设备开启了自动设置日期和时间。') }}</li>
      <li>{{ tx('使用本周期的验证码，接近更新时可以等下一组。') }}</li>
      <li>{{ tx('检查密钥是否完整，以及原服务是否重新设置过双重验证。') }}</li>
      <li>
        {{
          tx(
            'TOTP 的算法、位数和周期需与原服务一致，默认 SHA-1、6 位、30 秒；Steam 账号请选择 Steam Guard。'
          )
        }}
      </li>
    </ul>
    <h2 id="links">{{ tx('通过链接取码') }}</h2>
    <p>{{ tx('以下链接功能适用于 TOTP；Steam Guard 当前不提供取码链接或配置二维码。') }}</p>
    <p>
      {{ tx('生成有效验证码后，点击“获取链接”。链接形式为')
      }}<code dir="ltr">https://2fa.hot/2fa#{{ tx('密钥') }}</code
      >{{ tx('，打开后立即显示验证码。非默认算法、位数和周期会自动包含在链接参数中。') }}
    </p>
    <p>
      {{
        tx(
          '片段链接将密钥放在 # 后面，不会随页面请求发送；路径链接仍会发送密钥。完整链接包含密钥，也可能保留在浏览器历史中。请仅交给需要使用的人，不要公开分享。'
        )
      }}
    </p>
    <p>{{ tx('把链接末尾的“密钥”换成你自己的完整密钥，打开就能查看当前验证码。') }}</p>
    <h2 id="link-privacy">{{ tx('为什么使用 #？') }}</h2>
    <p><code dir="ltr">/2fa#YOUR_SECRET</code></p>
    <p>
      {{
        tx(
          '浏览器只把 # 前面的地址发送给服务器。/2fa/密钥 的密钥属于路径，会随请求发送；/2fa#密钥 的密钥属于片段，由页面在浏览器内读取，不包含在页面请求中。HTTPS 会加密传输，但不会向接收请求的托管服务隐藏路径。'
        )
      }}
      {{
        tx(
          '在其他在线工具网站，如果密钥放在网址路径或查询参数中，也会随请求发送给网站或托管服务；是否记录和保存，取决于对方的实现与配置。'
        )
      }}
    </p>
    <p>
      {{
        tx(
          '建议改用 # 链接：# 后的密钥不会随页面请求发送，但完整链接仍可能留在浏览器历史中，请勿公开分享。'
        )
      }}
    </p>
    <h2>{{ tx('批量取码') }}</h2>
    <p>
      {{
        tx(
          '每行输入一个密钥或 otpauth 配置 URI。也可使用“标签 + 制表符 + 密钥”。每次最多 100 条，格式有误的行会单独标记，不影响其他结果。“复制全部”只包含有效验证码，不包含密钥。'
        )
      }}
    </p>
    <h2>{{ tx('二维码与配置链接') }}</h2>
    <p>
      {{
        tx(
          '在 Google Authenticator 中打开“转移账号 → 导出账号”，选好账号后生成二维码。在这里扫码或选择截图；有多张二维码时，请全部导入。'
        )
      }}
    </p>
    <h2 id="history">{{ tx('本地历史与备份') }}</h2>
    <p>
      {{
        tx(
          '默认不保存。你可以主动开启本地历史并设置解锁口令，有效输入会在开启并解锁后自动加密保存，单条和批量均支持；教学演示过程不保存。闲置 30 分钟后自动锁定，解锁后继续自动保存。'
        )
      }}
    </p>
    <p>
      {{
        tx(
          '口令无法找回，浏览器数据清理后记录也会丢失。可导出加密备份，并在开启、解锁本地历史后导入合并。不同设备之间不自动同步。'
        )
      }}
    </p>
    <h2>{{ tx('复制或扫码没有反应？') }}</h2>
    <p>
      {{
        tx(
          '复制和摄像头需要浏览器权限以及 HTTPS（本地开发可用 localhost）。权限被拒绝时，可以手动选中验证码复制，或用图片导入代替摄像头。网站不会自动读取你的剪贴板。'
        )
      }}
    </p>
  </article>
</template>

<style scoped>
.help-page h1 {
  margin-block: 1.25rem 0.625rem;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  letter-spacing: -0.025em;
}
.help-page .article-lead {
  max-width: 48rem;
  margin-block: 0 1.75rem;
  line-height: 1.7;
}
.help-page .help-nav {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.375rem 1rem;
  padding: 0.75rem 0;
  border: 0;
  border-block: 1px solid var(--ui-border);
  background: transparent;
  box-shadow: none;
}
.help-page .help-nav a {
  gap: 0.625rem;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  border: 0;
  border-inline-start: 2px solid transparent;
  box-shadow: none;
  color: var(--ui-text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  line-height: 1.5;
}
.help-nav a .iconify {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
}
.help-page .help-nav a:hover,
.help-page .help-nav a:focus-visible {
  background: var(--wash);
  color: var(--ui-text-highlighted);
  box-shadow: none;
}
.help-page .help-nav a[aria-current='location'] {
  background: var(--wash);
  border-inline-start-color: var(--accent-ink);
  color: var(--accent-ink);
}
.help-page .help-nav a:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.help-page .help-nav + h2 {
  margin-top: 2rem;
}
@media (max-width: 600px) {
  .help-page .help-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 0.5rem;
  }
  .help-page .help-nav a {
    padding-inline: 0.5rem;
    overflow-wrap: anywhere;
  }
}
</style>
