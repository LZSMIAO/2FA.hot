/* ES5 only: this page intentionally does not load the modern app runtime. */
;(function () {
  'use strict'
  var messages = {
    en: {
      title: '2FA verification code',
      secretLabel: 'Secret or otpauth:// link',
      hint: 'Base32 secrets or TOTP links',
      choose: 'Select a secret',
      review: 'Check each secret. Account ownership is not inferred from nearby text.',
      limit: 'Use no more than 100 rows at a time.',
      reveal: 'Show secret',
      algorithm: 'Algorithm',
      digits: 'Digits',
      period: 'Period (seconds)',
      generate: 'Paste',
      pasteHelp:
        'Clipboard access is unavailable. Paste into the secret field with Ctrl+V or long press.',
      clear: 'Clear',
      current: 'Current code',
      copy: 'Copy code',
      link: 'Copy link',
      manual: 'Select and copy manually',
      privacy:
        'Secrets stay in this browser. No history is saved. Shared links still contain your secret; keep them private.',
      full: 'Full version',
      help: 'Usage guide',
      compatibility: 'Supports Internet Explorer!',
      left: 'Next code in {n}s',
      copied: 'Copied.',
      secret: 'Enter one complete Base32 secret.',
      multiple: 'Use one secret at a time. Multiple lines are not supported in Lite.',
      invalid: 'The link is not valid.',
      unsupported:
        'Use a Base32 secret, a TOTP URI or a 2fa.hot fragment link. This format is not supported.',
      duplicate: 'The link contains duplicate parameters.',
      parameters: 'Use SHA-1/256/512, 6 or 8 digits, and a period from 15 to 120 seconds.',
      unavailable: 'The code engine could not load. Reload this page to try again.',
      query: 'Use a # fragment for secrets, not URL path or query parameters.'
    },
    'zh-TW': {
      title: '2FA 驗證碼',
      secretLabel: '密鑰或 otpauth:// 連結',
      hint: 'Base32 密鑰或 TOTP 連結，可貼上多條',
      choose: '選擇密鑰',
      review: '請核對各條密鑰；附近文字不會自動視為所屬帳號。',
      limit: '每次最多 100 行，請分批貼上。',
      reveal: '顯示密鑰',
      algorithm: '演算法',
      digits: '位數',
      period: '週期（秒）',
      generate: '貼上',
      pasteHelp: '無法讀取剪貼簿，請在密鑰欄按 Ctrl+V 或長按貼上。',
      clear: '清空',
      current: '目前驗證碼',
      copy: '複製驗證碼',
      link: '複製連結',
      manual: '請選取後手動複製',
      privacy: '密鑰在此瀏覽器內處理，不儲存歷史紀錄。分享連結仍含密鑰，請妥善保管。',
      full: '完整版本',
      help: '使用說明',
      compatibility: '支援 Internet Explorer！',
      left: '{n} 秒後更新',
      copied: '已複製。',
      secret: '請輸入一條完整的 Base32 密鑰。',
      multiple: 'Lite 一次處理一條密鑰，不支援多行輸入。',
      invalid: '連結格式不正確。',
      unsupported: '請使用 Base32 密鑰、TOTP 設定連結或 2fa.hot 片段連結；此格式不受支援。',
      duplicate: '連結包含重複參數。',
      parameters: '請使用 SHA-1/256/512、6 或 8 位，以及 15 至 120 秒的週期。',
      unavailable: '取碼元件未能載入，請重新整理後再試。',
      query: '請用 # 片段放置密鑰，不要放在網址路徑或查詢參數中。'
    },
    'zh-CN': {
      title: '2FA 验证码',
      secretLabel: '密钥或 otpauth:// 链接',
      hint: 'Base32 密钥或 TOTP 链接，可粘贴多条',
      choose: '选择密钥',
      review: '请核对各条密钥；附近文字不会自动视为所属账号。',
      limit: '每次最多 100 行，请分批粘贴。',
      reveal: '显示密钥',
      algorithm: '算法',
      digits: '位数',
      period: '周期（秒）',
      generate: '粘贴',
      pasteHelp: '无法读取剪贴板，请在密钥栏按 Ctrl+V 或长按粘贴。',
      clear: '清空',
      current: '当前验证码',
      copy: '复制验证码',
      link: '复制链接',
      manual: '请选中文字后手动复制',
      privacy: '密钥在此浏览器内处理，不储存历史记录。分享链接仍含密钥，请妥善保管。',
      full: '完整版本',
      help: '使用说明',
      compatibility: '支持 Internet Explorer！',
      left: '{n} 秒后更新',
      copied: '已复制。',
      secret: '请输入一条完整的 Base32 密钥。',
      multiple: 'Lite 一次处理一条密钥，不支持多行输入。',
      invalid: '链接格式不正确。',
      unsupported: '请使用 Base32 密钥、TOTP 配置链接或 2fa.hot 片段链接；不支持此格式。',
      duplicate: '链接包含重复参数。',
      parameters: '请使用 SHA-1/256/512、6 或 8 位，以及 15 至 120 秒的周期。',
      unavailable: '取码组件未能加载，请刷新后重试。',
      query: '请用 # 片段放置密钥，不要放在网址路径或查询参数中。'
    }
  }
  var config = null,
    candidates = [],
    lastStep = -1,
    currentCode = '',
    locale = 'en',
    errorKey = '',
    statusKey = '',
    secretInput = document.getElementById('secret')
  function el(id) {
    return document.getElementById(id)
  }
  function text(id, value) {
    el(id).textContent = value
  }
  function language(value) {
    return /^zh/i.test(value) ? (/TW|HK|MO|Hant/i.test(value) ? 'zh-TW' : 'zh-CN') : 'en'
  }
  function translate() {
    var nodes = document.querySelectorAll('[data-text]'),
      i
    document.documentElement.lang = locale
    secretInput.setAttribute('placeholder', messages[locale].hint)
    for (i = 0; i < nodes.length; i++)
      nodes[i].textContent = messages[locale][nodes[i].getAttribute('data-text')]
    el('language').value = locale
    text('help', messages[locale].help)
    el('help').href = '/lite/help?lang=' + locale
    text('full', messages[locale].full)
    el('full').href = locale === 'en' ? '/' : '/' + locale
    el('code').setAttribute('aria-label', messages[locale].current)
    text('error', errorKey ? messages[locale][errorKey] || messages[locale].invalid : '')
    text('status', statusKey ? messages[locale][statusKey] : '')
    tick()
  }
  function reset() {
    config = null
    lastStep = -1
    currentCode = ''
    el('code').textContent = '------'
    text('countdown', '')
    el('standalone').hidden = true
    el('copy').disabled = true
    el('link').disabled = true
    errorKey = ''
    statusKey = ''
    text('error', '')
    text('status', '')
    el('manual').style.display = 'none'
    el('copy-value').value = ''
  }
  function error(key) {
    errorKey = messages[locale][key] ? key : 'invalid'
    text('error', messages[locale][errorKey])
  }
  function tick() {
    if (!config) return
    var now = new Date().getTime(),
      step = Math.floor(now / 1000 / config.period)
    try {
      if (step !== lastStep) {
        currentCode = window.LiteOTP.code(config, now)
        el('code').textContent = currentCode
        lastStep = step
      }
      text(
        'countdown',
        messages[locale].left.replace(
          '{n}',
          config.period - (Math.floor(now / 1000) % config.period)
        )
      )
    } catch (e) {
      reset()
      error('unavailable')
    }
  }
  function selectCandidate() {
    reset()
    var item = candidates[Number(el('candidate').value || 0)]
    if (!item) return
    config = item.config
    el('algorithm').value = config.algorithm
    el('digits').value = String(config.digits)
    el('period').value = String(config.period)
    tick()
    el('copy').disabled = !config
    el('link').disabled = !config
    el('standalone').hidden = !config
    if (config)
      el('standalone').href = '/lite/code?lang=' + locale + window.LiteOTP.fragment(config)
  }
  function generate() {
    reset()
    el('choices').hidden = true
    el('standalone').hidden = true
    candidates = []
    try {
      var result = window.LitePaste.analyze(secretInput.value),
        i,
        option
      candidates = result.candidates
      if (!candidates.length) throw new Error('secret')
      el('candidate').textContent = ''
      for (i = 0; i < candidates.length; i++) {
        option = document.createElement('option')
        option.value = String(i)
        option.textContent =
          String(i + 1) +
          '. ' +
          (candidates[i].label ||
            candidates[i].config.secret.slice(0, 4) + '…' + candidates[i].config.secret.slice(-4))
        el('candidate').appendChild(option)
      }
      el('choices').hidden = candidates.length < 2 && !result.review
      text('review', result.review ? messages[locale].review : '')
      selectCandidate()
    } catch (e) {
      error(e.message)
    }
  }
  function copy(value) {
    var ok = false,
      field = el('copy-value')
    // execCommand also works without modern Clipboard API/Promise support.
    el('manual').style.display = 'block'
    field.value = value
    field.focus()
    field.select()
    try {
      field.setSelectionRange(0, field.value.length)
      ok = document.execCommand('copy')
    } catch (e) {}
    if (ok) {
      el('manual').style.display = 'none'
      field.value = ''
      statusKey = 'copied'
    } else {
      statusKey = 'manual'
    }
    text('status', messages[locale][statusKey])
  }
  function readHash() {
    reset()
    if (location.hash) {
      secretInput.value = location.hash
      generate()
    } else secretInput.value = ''
  }
  var match = /(?:^|[?&])lang=(en|zh-CN|zh-TW)(?:&|$)/.exec(location.search)
  locale = match ? match[1] : language(navigator.language || navigator.userLanguage || 'en')
  translate()
  if (!window.jsSHA || !window.LiteOTP || !window.LitePaste) {
    error('unavailable')
    return
  }
  el('generate').disabled = false
  el('clear').disabled = false
  function autoGenerate() {
    reset()
    if (/\S/.test(secretInput.value)) generate()
    else {
      candidates = []
      el('choices').hidden = true
    }
  }
  function pasteHelp() {
    statusKey = 'pasteHelp'
    text('status', messages[locale][statusKey])
    secretInput.focus()
  }
  function acceptPaste(raw) {
    secretInput.value = raw
    autoGenerate()
  }
  el('generate').onclick = function () {
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        navigator.clipboard.readText().then(acceptPaste, pasteHelp)
      } catch (e) {
        pasteHelp()
      }
    } else if (window.clipboardData) {
      try {
        acceptPaste(window.clipboardData.getData('Text') || '')
      } catch (e) {
        pasteHelp()
      }
    } else pasteHelp()
  }
  secretInput.oninput = autoGenerate
  el('reveal').onchange = function () {
    secretInput.style.display = this.checked ? 'block' : 'none'
    el('masked-secret').hidden = this.checked
    el('masked-secret').value = secretInput.value
  }
  el('candidate').onchange = selectCandidate
  el('masked-secret').oninput = function () {
    secretInput.value = this.value
    autoGenerate()
  }
  el('masked-secret').onpaste = function (event) {
    var clip = event.clipboardData || window.clipboardData
    if (clip) {
      event.preventDefault()
      acceptPaste(clip.getData(event.clipboardData ? 'text/plain' : 'Text'))
      this.value = secretInput.value
    }
  }
  function changeOptions() {
    if (!config) return
    try {
      config = window.LiteOTP.parse(config.secret, {
        algorithm: el('algorithm').value,
        digits: el('digits').value,
        period: el('period').value
      })
      candidates[Number(el('candidate').value || 0)].config = config
      selectCandidate()
    } catch (e) {
      reset()
      error(e.message)
    }
  }
  el('algorithm').onchange = changeOptions
  el('digits').onchange = changeOptions
  el('period').oninput = changeOptions
  el('clear').onclick = function () {
    reset()
    secretInput.value = ''
    el('reveal').checked = true
    secretInput.style.display = 'block'
    el('masked-secret').hidden = true
    el('masked-secret').value = ''
    el('choices').hidden = true
    el('standalone').hidden = true
    if (location.hash) {
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search)
      else location.hash = ''
    }
    secretInput.focus()
  }
  el('copy').onclick = function () {
    tick()
    if (config) copy(currentCode)
  }
  el('link').onclick = function () {
    if (config)
      copy(
        location.protocol + '//' + location.host + '/lite/code' + window.LiteOTP.fragment(config)
      )
  }
  el('language').onchange = function () {
    locale = this.value
    translate()
  }
  window.onhashchange = readHash
  window.onpageshow = function () {
    tick()
  }
  window.addEventListener('focus', tick)
  document.addEventListener('visibilitychange', tick)
  if (location.search && !/^\?lang=(en|zh-CN|zh-TW)$/.test(location.search)) {
    error('query')
  } else readHash()
  window.setInterval(tick, 1000)
})()
