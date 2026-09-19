const content = {
  'zh-TW': {
    title: 'Lite 使用說明',
    back: '返回取碼',
    sections: [
      [
        '為什麼需要 Lite？',
        'Lite 為只需快速取得 TOTP 驗證碼的情況而設：頁面更小、載入更快、依賴更少，在慢速網路、舊裝置或完整版本無法正常載入時仍可使用。它保留瀏覽器內計算、多密鑰識別和快捷取碼；QR 匯入、本機紀錄等完整功能則由完整版本提供。'
      ],
      [
        '如何取碼',
        '貼上已有的 Base32 密鑰或 otpauth://totp/ 設定連結，驗證碼會自動顯示。點「複製驗證碼」後，填入需要驗證的網站。倒計時結束時會自動更新。'
      ],
      [
        '快捷取碼連結',
        '使用 /lite#密鑰 可直接開啟取碼頁。這是瀏覽器頁面，不是回傳 JSON 或驗證碼的伺服器 API；curl 等 HTTP 客戶端只會取得頁面。請使用頁面的「複製連結」產生完整連結。'
      ],
      [
        '自訂參數',
        '密鑰後可加 ?algorithm=SHA256&digits=8&period=30，整段必須放在 # 後。algorithm 支援 SHA1、SHA256、SHA512；digits 為 6 或 8；period 為 15–120 秒的整數。預設是 SHA1、6 位、30 秒。參數需與原服務一致。'
      ],
      [
        '複製與貼上',
        '「貼上」需要瀏覽器允許讀取剪貼簿。拒絕或不支援時，可用 Ctrl+V、Command+V 或長按貼上。複製失敗時會顯示可選取的文字，請手動複製。'
      ],
      [
        '功能範圍與舊瀏覽器',
        'Lite 可辨識多條密鑰，在本頁選擇並取碼；箭頭可開啟獨立取碼頁。不提供 QR 匯入或本機紀錄。需要這些功能時請使用完整版本。Lite 以 IE11 為相容目標，尚未通過 IE11 實機驗證；舊系統的 HTTPS 連線能力也可能影響使用。'
      ],
      [
        '密鑰與隱私',
        '密鑰及驗證碼計算在瀏覽器內完成，Lite 不儲存歷史紀錄。# 後的內容不隨 HTTP 頁面請求傳送；完整連結仍含密鑰，可能留在瀏覽器歷史、剪貼簿或截圖中，請勿公開分享。'
      ],
      [
        '驗證碼不正確？',
        '先確認密鑰、演算法、位數和週期與原服務相同，再檢查裝置時間。快到期時等下一組。Lite 不支援 HOTP 或 Steam 專用驗證碼。'
      ]
    ]
  },
  'zh-CN': {
    title: 'Lite 使用说明',
    back: '返回取码',
    sections: [
      [
        '为什么需要 Lite？',
        'Lite 为只需快速获取 TOTP 验证码的场景准备：页面更小、加载更快、依赖更少，在慢速网络、旧设备或完整版本无法正常加载时仍可使用。它保留浏览器内计算、多密钥识别和快捷取码；二维码导入、本机记录等完整功能则由完整版本提供。'
      ],
      [
        '如何取码',
        '粘贴已有的 Base32 密钥或 otpauth://totp/ 配置链接，验证码会自动显示。点“复制验证码”后，填入需要验证的网站。倒计时结束时会自动更新。'
      ],
      [
        '快捷取码链接',
        '使用 /lite#密钥 可直接打开取码页。这是浏览器页面，不是返回 JSON 或验证码的服务器 API；curl 等 HTTP 客户端只会取得页面。请使用页面的“复制链接”生成完整链接。'
      ],
      [
        '自定义参数',
        '密钥后可加 ?algorithm=SHA256&digits=8&period=30，整段必须放在 # 后。algorithm 支持 SHA1、SHA256、SHA512；digits 为 6 或 8；period 为 15–120 秒的整数。默认是 SHA1、6 位、30 秒。参数需与原服务一致。'
      ],
      [
        '复制与粘贴',
        '“粘贴”需要浏览器允许读取剪贴板。拒绝或不支持时，可用 Ctrl+V、Command+V 或长按粘贴。复制失败时会显示可选取的文字，请手动复制。'
      ],
      [
        '功能范围与旧浏览器',
        'Lite 可识别多条密钥，在本页选择并取码；箭头可打开独立取码页。不提供 QR 导入或本机记录。需要这些功能时请使用完整版本。Lite 以 IE11 为兼容目标，尚未通过 IE11 实机验证；旧系统的 HTTPS 连接能力也可能影响使用。'
      ],
      [
        '密钥与隐私',
        '密钥及验证码计算在浏览器内完成，Lite 不保存历史记录。# 后的内容不随 HTTP 页面请求发送；完整链接仍含密钥，可能留在浏览器历史、剪贴板或截图中，请勿公开分享。'
      ],
      [
        '验证码不正确？',
        '先确认密钥、算法、位数和周期与原服务相同，再检查设备时间。快到期时等下一组。Lite 不支持 HOTP 或 Steam 专用验证码。'
      ]
    ]
  },
  en: {
    title: 'Lite guide',
    back: 'Back to codes',
    sections: [
      [
        'Why Lite?',
        'Lite is for situations where you only need a TOTP code quickly. Its smaller page and fewer dependencies load faster on slow networks and older devices, and can remain usable when the full version cannot load properly. It keeps in-browser calculation, multiple-secret detection and quick code links; QR import, saved history and other features remain in the full version.'
      ],
      [
        'Get a code',
        'Paste an existing Base32 secret or otpauth://totp/ configuration link. Your code appears automatically. Copy it into the service requesting verification. The code refreshes when the countdown ends.'
      ],
      [
        'Quick code links',
        'Open /lite#SECRET to display a code directly. This is a browser page, not a server API returning JSON or codes: HTTP clients such as curl receive only the page. Use Copy link to generate the complete URL.'
      ],
      [
        'Parameters',
        'Append ?algorithm=SHA256&digits=8&period=30 after the secret, keeping everything after #. algorithm accepts SHA1, SHA256 or SHA512; digits accepts 6 or 8; period is an integer from 15 to 120 seconds. Defaults: SHA1, 6 digits, 30 seconds. Match the original service’s settings.'
      ],
      [
        'Copy and paste',
        'Paste requires clipboard permission. If unavailable or denied, use Ctrl+V, Command+V or long press. If copying fails, selectable text appears for manual copying.'
      ],
      [
        'Features and older browsers',
        'Lite detects multiple secrets for selection on this page. The arrow opens a standalone code page. QR import and saved history are not available. Use the full version for those features. IE11 is a compatibility target: testing on actual IE11 has not been completed. Older systems may also be unable to establish an HTTPS connection.'
      ],
      [
        'Secrets and privacy',
        'Secrets and code calculations stay in the browser; Lite saves no history. Content after # is not sent in the HTTP page request. The full link still contains your secret and may remain in browser history, the clipboard or screenshots. Keep it private.'
      ],
      [
        'Incorrect code?',
        'Check the secret, algorithm, digits and period against the original service, then check your device clock. Wait for the next code if it is about to expire. Lite does not support HOTP or Steam-specific codes.'
      ]
    ]
  }
} as const
export type LiteLanguage = keyof typeof content
export function liteHelp(language: LiteLanguage) {
  const copy = content[language]
  const compatibility = {
    en: 'Supports Internet Explorer!',
    'zh-CN': '支持 Internet Explorer！',
    'zh-TW': '支援 Internet Explorer！'
  }[language]
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${copy.title} · 2fa.hot</title><link rel="icon" href="data:,"><script src="/lite-assets/theme.js?v=1"></script><link rel="stylesheet" href="/lite-assets/style.css?v=6"></head><body><main class="page guide"><a href="/lite?lang=${language}">${copy.back}</a><nav class="languages" aria-label="Language"><a href="?lang=zh-TW" lang="zh-TW">繁體中文</a> · <a href="?lang=zh-CN" lang="zh-CN">简体中文</a> · <a href="?lang=en" lang="en">English</a></nav><h1>${copy.title}</h1>${copy.sections.map(([title, body]) => `<section><h2>${title}</h2><p>${escape(body)}</p></section>`).join('')}<footer class="footer"><a href="https://github.com/LZSMIAO/2fa-hot" target="_blank" rel="noopener noreferrer">Source · AGPL-3.0</a>2fa.hot Lite<strong class="compatibility">${compatibility}</strong></footer></main></body></html>`
}
