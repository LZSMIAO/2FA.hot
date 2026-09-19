/* ES5 only: this page intentionally does not load the modern app runtime. */
;(function () {
  'use strict'
  var messages = (window.LiteMessages = window.LiteMessages || {})
  messages[document.documentElement.lang] = JSON.parse(
    document.getElementById('lite-messages').textContent
  )
  var config = null,
    candidates = [],
    lastStep = -1,
    currentCode = '',
    locale = 'en',
    errorKey = '',
    statusKey = '',
    reviewRequired = false,
    secretInput = document.getElementById('secret')
  function el(id) {
    return document.getElementById(id)
  }
  function text(id, value) {
    el(id).textContent = value
  }
  function translate() {
    var nodes = document.querySelectorAll('[data-text]'),
      i
    document.documentElement.lang = locale
    document.documentElement.dir = /^(ar|fa|he|ur)$/.test(locale) ? 'rtl' : 'ltr'
    document.title = messages[locale].title + ' · 2fa.hot Lite'
    document.querySelector('.brand').href = '/lite?lang=' + locale
    el('language').setAttribute('aria-label', messages[locale].language)
    el('masked-secret').setAttribute('aria-label', messages[locale].secretLabel)
    el('standalone').setAttribute('aria-label', messages[locale].openCode)
    document
      .querySelector('[data-navigation]')
      .setAttribute('aria-label', messages[locale].navigation)
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
    text('review', reviewRequired ? messages[locale].review : '')
    if (config)
      el('standalone').href = '/lite/code?lang=' + locale + window.LiteOTP.fragment(config)
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
      reviewRequired = result.review
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
  locale = document.documentElement.lang
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
        location.protocol +
          '//' +
          location.host +
          '/lite/code?lang=' +
          locale +
          window.LiteOTP.fragment(config)
      )
  }
  el('language').onchange = function () {
    var next = this.value
    function applyLanguage() {
      locale = next
      translate()
      if (history.replaceState)
        history.replaceState(null, '', location.pathname + '?lang=' + locale + location.hash)
    }
    if (messages[next]) {
      applyLanguage()
      return
    }
    var picker = this
    picker.disabled = true
    var script = document.createElement('script')
    script.src = '/lite-assets/locales/' + encodeURIComponent(next) + '.js?v=1'
    script.onload = function () {
      picker.disabled = false
      if (messages[next]) {
        applyLanguage()
      } else script.onerror()
      if (script.parentNode) script.parentNode.removeChild(script)
    }
    script.onerror = function () {
      picker.disabled = false
      picker.value = locale
      text('status', messages[locale].languageError)
      if (script.parentNode) script.parentNode.removeChild(script)
    }
    document.head.appendChild(script)
  }
  window.onhashchange = readHash
  window.onpageshow = function () {
    tick()
  }
  window.addEventListener('focus', tick)
  document.addEventListener('visibilitychange', tick)
  if (location.search && location.search !== '?lang=' + locale) {
    error('query')
  } else readHash()
  window.setInterval(tick, 1000)
})()
