// Source messages for the explanation under the tool. The tool itself stays
// the first thing on the page; this gives readers and search engines the
// context that the controls alone cannot. The FAQ also feeds FAQPage data.
export const homeIntro = {
  what: {
    title: '什么是 2FA 验证码？',
    paragraphs: [
      '2FA（双重验证）在密码之外，再要求一组会变化的验证码。大多数网站采用 TOTP 标准：开启验证器 App 时，服务会给你一串密钥，密钥结合当前时间，每 30 秒算出一组新的 6 位验证码。谷歌身份验证器（Google Authenticator）、Microsoft Authenticator 等验证器都是这样工作的。',
      '2fa.hot 做同样的计算，但不需要安装 App。粘贴密钥就能看到当前验证码，同一个密钥在任何标准验证器中算出的结果都相同。计算全程在你的浏览器中完成，密钥不会上传到服务器。'
    ]
  },
  steps: {
    title: '如何获取 2FA 验证码',
    items: [
      '复制服务提供的 2FA 密钥（Base32 字符串或 otpauth:// 链接），或准备好二维码截图。',
      '粘贴到上方输入框，或点击“导入二维码”选择图片、拖入文件，或用摄像头扫描。',
      '复制显示的 6 位验证码，在倒计时结束前提交。账号较多时，切换到“批量取码”，一次最多处理 100 条。'
    ]
  },
  formats: {
    title: '支持的格式与服务',
    paragraphs: [
      '支持 Base32 密钥、otpauth:// 配置链接、普通 2FA 二维码和 Google Authenticator 导出二维码。TOTP 可选 SHA-1、SHA-256、SHA-512，6 位或 8 位。',
      '适用于支持验证器 App 的服务，例如 Google、Microsoft、GitHub、Discord、X、Facebook、Instagram、Amazon 和币安。'
    ]
  },
  // A new visitor's welcome; the questions follow it.
  welcomeTitle: '欢迎来到 2fa.hot',
  welcomeLead: '开始使用前，你或许想了解……',
  guidesLink: '阅读 2FA 与 TOTP 指南'
} as const

export const homeFaq: readonly { question: string; answer: string; guide?: string }[] = [
  {
    question: '在线生成 2FA 验证码安全吗？',
    answer:
      '验证码计算和二维码解码都在浏览器本地完成，密钥不会发送到 2fa.hot 的服务器，历史记录默认关闭。但任何拿到密钥的人都能算出验证码，请只在可信的设备上使用，也不要公开分享包含密钥的链接。'
  },
  {
    question: '为什么验证码提示无效？',
    answer:
      '最常见的原因是设备时间不准、验证码已过期，或密钥复制不完整。也请确认服务使用的位数、周期和算法与这里的设置一致。',
    guide: 'totp-code-not-working'
  },
  {
    question: '2FA 密钥在哪里找？',
    answer:
      '在网站的安全设置中开启“验证器 App”时，页面会显示二维码，通常还有“无法扫描？”或“手动输入”选项，点开后出现的字母数字串就是密钥。多数服务在设置完成后不会再显示密钥，需要重新设置 2FA 才能获取。',
    guide: 'find-2fa-secret-key'
  },
  {
    question: '这是谷歌身份验证器网页版吗？',
    answer:
      '这不是 Google 的官方产品，但算法相同：同一个密钥在这里和在 Google Authenticator 中会显示相同的验证码。你可以导入 Google Authenticator 导出的二维码，在电脑上查看验证码。建议保留手机上的验证器作为备份。',
    guide: 'google-authenticator-web'
  },
  {
    question: '能同时获取多个账号的验证码吗？',
    answer:
      '可以。切换到“批量取码”后，每行粘贴一个密钥，或直接粘贴从 Excel 复制的表格、混有账号密码的文本，工具会自动识别密钥，一次最多处理 100 条，并可一键复制全部验证码。',
    guide: 'batch-2fa-codes'
  },
  {
    question: '需要注册或付费吗？',
    answer: '不需要。2fa.hot 免费使用，无需注册，源代码以 AGPL-3.0 协议在 GitHub 开源。'
  }
]
