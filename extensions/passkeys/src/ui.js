import { deviceSecret, deviceSupported, enrollDevice } from './device.js'

const $ = (id) => document.getElementById(id)
const companion = new URLSearchParams(location.search).get('companion')
let state,
  records = [],
  importedText = '',
  importPassword = '',
  selected = new Set(),
  renaming = null,
  busy = false
async function send(action, values = {}) {
  const result = await chrome.runtime.sendMessage({ action, companion, ...values })
  if (!result.ok) {
    const error = new Error(result.error)
    error.code = result.code
    throw error
  }
  return result
}
function feedback(id, text = '') {
  $(id).textContent = text
  $(id).hidden = !text
}
async function run(action) {
  if (busy) return
  busy = true
  feedback('error')
  feedback('notice')
  const buttons = [...document.querySelectorAll('button')]
  buttons.forEach((b) => (b.disabled = true))
  try {
    await action()
  } catch (e) {
    // The session ran out while the page was open: back to the gate, nothing lost but the view.
    if (e.code === 'Locked') showGate()
    feedback('error', e.message || '无法完成操作。')
  } finally {
    busy = false
    buttons.forEach((b) => (b.disabled = false))
  }
}
function identity(r) {
  return `${r.rpId}:${r.credentialId}`
}
function visibleRecords() {
  const query = $('search').value.toLowerCase()
  return records.filter((r) =>
    `${r.rpId} ${r.userName} ${r.userDisplayName} ${r.label ?? ''}`.toLowerCase().includes(query)
  )
}
function selection() {
  $('selected-count').textContent = `已选 ${selected.size} 条`
  const visible = visibleRecords()
  $('select-all').checked = !!visible.length && visible.every((r) => selected.has(identity(r)))
  $('select-all').indeterminate =
    visible.some((r) => selected.has(identity(r))) && !$('select-all').checked
}
function renameField(r) {
  const form = document.createElement('form')
  form.className = 'rename'
  const input = document.createElement('input')
  input.value = r.label ?? ''
  input.maxLength = 256
  input.placeholder = r.rpId
  input.setAttribute('aria-label', `${r.rpId} 的名称`)
  const save = document.createElement('button')
  save.className = 'secondary'
  save.textContent = '保存'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'text-button'
  cancel.textContent = '取消'
  cancel.addEventListener('click', () => {
    renaming = null
    render()
  })
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    run(async () => {
      records = (await send('rename', { id: identity(r), label: input.value })).records
      renaming = null
      render()
      feedback('notice', input.value.trim() ? '已更新名称。' : '已恢复为网站域名。')
    })
  })
  form.append(input, save, cancel)
  setTimeout(() => input.focus())
  return form
}
function render() {
  $('records').replaceChildren()
  const visible = visibleRecords()
  $('count').textContent = `${records.length} 条通行密钥`
  $('empty').hidden = records.length > 0
  for (const r of visible) {
    const row = document.createElement('div')
    row.className = 'record'
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = selected.has(identity(r))
    box.setAttribute('aria-label', `选择 ${r.label || r.rpId} ${r.userName}`)
    box.addEventListener('change', () => {
      box.checked ? selected.add(identity(r)) : selected.delete(identity(r))
      selection()
    })
    const info = document.createElement('div')
    info.className = 'record-info'
    const site = document.createElement('strong')
    site.textContent = r.label || r.rpId
    const user = document.createElement('span')
    user.textContent = [r.label ? r.rpId : '', r.userName || r.userDisplayName || '未命名账号']
      .filter(Boolean)
      .join(' · ')
    info.append(site, user)
    const time = document.createElement('time')
    time.textContent = r.lastUsedAt
      ? `最近使用 ${new Date(r.lastUsedAt).toLocaleDateString()}`
      : '尚未使用'
    const rename = document.createElement('button')
    rename.type = 'button'
    rename.className = 'text-button'
    rename.textContent = '重命名'
    rename.setAttribute('aria-label', `重命名 ${r.label || r.rpId}`)
    rename.addEventListener('click', () => {
      renaming = identity(r)
      render()
    })
    row.append(box, info, time)
    if (!companion) row.append(rename)
    $('records').append(row)
    if (renaming === identity(r)) $('records').append(renameField(r))
  }
  if (!visible.length && records.length) {
    const p = document.createElement('p')
    p.textContent = '没有匹配的网站或账号。'
    $('records').append(p)
  }
  selection()
}
async function refresh() {
  records = (await send('list')).records
  selected = new Set([...selected].filter((id) => records.some((r) => identity(r) === id)))
  render()
}
function forgetView() {
  importedText = ''
  importPassword = ''
  records = []
  selected.clear()
}
async function finishCompanion() {
  if (!companion) return
  await send('companion-finish')
  forgetView()
  window.close()
}
function showCompanion() {
  const { operation, label } = state.companion
  $('manager').hidden = ['list', 'rename'].includes(operation)
  $('share-list').hidden = operation !== 'list'
  if (operation === 'list') {
    $('share-summary').textContent =
      `共 ${records.length} 条通行密钥。确认后在请求页面显示网站、账号、名称和使用时间。`
    $('share-confirm').focus()
    return
  }
  if (operation === 'rename') {
    const target = records.find((r) => identity(r) === state.companion.ids[0])
    if (!target) throw new Error('找不到这把通行密钥。')
    $('rename-request').hidden = false
    $('rename-summary').textContent = label?.trim()
      ? `${target.label || target.rpId} · ${target.userName} → “${label.trim()}”`
      : `${target.label || target.rpId} · ${target.userName} → 恢复为网站域名`
    $('rename-confirm').focus()
    return
  }
  selected = new Set(state.companion.ids)
  if (operation !== 'import') records = records.filter((r) => selected.has(identity(r)))
  render()
  document.querySelector('.toolbar').hidden = true
  document.querySelector('.list-heading').hidden = true
  document.querySelector('.selection-bar').hidden = operation !== 'remove'
  $('settings-section').hidden = true
  $('records').hidden = operation === 'import'
  $('empty').hidden = true
  for (const name of ['import', 'export']) {
    $(name + '-section').hidden = operation !== name
    $(name + '-section').open = operation === name
  }
  // The selected IDs come from the bound request, not editable webpage messages.
  for (const box of document.querySelectorAll('#records input')) box.disabled = true
  if (operation === 'remove') $('remove').focus()
}
function showGate() {
  $('manager').hidden = true
  $('gate').hidden = false
  const device = state.exists && state.device && deviceSupported()
  $('device-unlock').hidden = !device
  ;(device ? $('device-unlock') : $('password')).focus()
}
function showSettings() {
  $('lock-after').value = String(state.settings.lockAfter)
  $('prompt-mode').value = state.settings.prompt
  $('paused').checked = state.paused
  const enabled = !!state.device
  $('device-state').textContent = !deviceSupported()
    ? '当前浏览器无法调用系统验证器。'
    : enabled
      ? '已启用：可用这台设备的 Touch ID、Windows Hello 或系统 PIN 解锁。更换主口令后仍然有效。'
      : '启用后，可用这台设备的 Touch ID、Windows Hello 或系统 PIN 代替主口令解锁。需要设备验证器支持 PRF。'
  $('device-toggle').textContent = enabled ? '停用设备解锁' : '启用 Touch ID / Windows Hello 解锁'
  $('device-toggle').disabled = !deviceSupported()
  $('device-password-field').hidden = enabled
}
async function opened() {
  $('gate').hidden = true
  $('password').value = ''
  $('confirmation').value = ''
  $('manager').hidden = false
  records = (await send('list')).records
  render()
  showSettings()
  if (companion) showCompanion()
  else $('search').focus()
}
$('share-confirm').addEventListener('click', () => run(finishCompanion))
$('rename-confirm').addEventListener('click', () =>
  run(async () => {
    await send('rename')
    await finishCompanion()
  })
)
$('companion-cancel').addEventListener('click', () => window.close())
async function start() {
  state = await send('status')
  if (!state.exists) {
    $('gate-title').textContent = '创建本地密钥库'
    $('unlock').textContent = '创建密钥库'
    $('confirmation-field').hidden = false
    $('setup-hint').hidden = false
    $('password').minLength = 12
    $('password').autocomplete = 'new-password'
    $('confirmation').required = true
  }
  if (companion) {
    const names = {
      list: '在网站中查看通行密钥',
      import: '导入通行密钥',
      export: '导出所选通行密钥',
      remove: '删除所选通行密钥',
      rename: '重命名通行密钥'
    }
    $('title').textContent = names[state.companion.operation]
    $('subtitle').textContent = '核对请求来源，在此窗口解锁并确认，完成后自动返回原页面。'
    $('companion-info').hidden = false
    $('companion-origin').textContent = state.companion.origin
    $('companion-cancel').hidden = false
  }
  if (state.unlocked) await opened()
  else showGate()
}
$('unlock-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    const entered = $('password').value
    if (!state.exists) {
      if (entered !== $('confirmation').value) throw new Error('两次主口令不一致。')
      await send('setup', { password: entered })
      state = await send('status')
    } else await send('unlock', { password: entered })
    await opened()
  })
})
$('device-unlock').addEventListener('click', () =>
  run(async () => {
    const secret = await deviceSecret(state.device).catch((e) => {
      throw new Error(e?.name === 'NotAllowedError' ? '设备验证已取消，可改用主口令。' : e.message)
    })
    await send('device-unlock', { credentialId: state.device.credentialId, secret })
    await opened()
  })
)
$('lock').addEventListener('click', () =>
  run(async () => {
    await send('lock')
    forgetView()
    location.reload()
  })
)
$('search').addEventListener('input', render)
$('select-all').addEventListener('change', () => {
  for (const r of visibleRecords())
    $('select-all').checked ? selected.add(identity(r)) : selected.delete(identity(r))
  render()
})
$('remove').addEventListener('click', () => {
  if (!selected.size) feedback('error', '请先选择通行密钥。')
  else $('delete-dialog').showModal()
})
$('delete-cancel').addEventListener('click', () => $('delete-dialog').close())
$('delete-confirm').addEventListener('click', () =>
  run(async () => {
    await send('remove', { ids: [...selected] })
    selected.clear()
    $('delete-dialog').close()
    await refresh()
    feedback('notice', '已删除本地副本。网站上的凭据需另行撤销。')
    await finishCompanion()
  })
)
$('export-format').addEventListener('change', () => {
  const plain = $('export-format').value === 'bitwarden'
  $('export-encrypted').hidden = plain
  $('export-plaintext').hidden = !plain
  $('format-note').hidden = !plain
  $('confirm-plaintext').checked = false
})
$('export-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    if (
      $('export-format').value !== 'bitwarden' &&
      $('export-password').value !== $('export-confirmation').value
    )
      throw new Error('两次备份口令不一致。')
    const result = await send('export', {
      password: $('export-master').value,
      ids: [...selected],
      format: $('export-format').value,
      backupPassword: $('export-password').value,
      confirmPlaintext: $('confirm-plaintext').checked
    })
    const url = URL.createObjectURL(new Blob([result.text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    for (const id of ['export-password', 'export-confirmation', 'export-master']) $(id).value = ''
    $('confirm-plaintext').checked = false
    feedback('notice', '已生成导出文件。请在目标设备或管理器中导入并验证登录。')
    await finishCompanion()
  })
})
function clearImport() {
  importedText = ''
  importPassword = ''
  $('import-preview').hidden = true
  $('import-list').replaceChildren()
}
$('import-file').addEventListener('change', clearImport)
$('import-password').addEventListener('input', clearImport)
$('import-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    clearImport()
    const file = $('import-file').files[0]
    if (!file || file.size > 8000000) throw new Error('请选择小于 8MB 的备份文件。')
    const text = await file.text(),
      p = $('import-password').value
    const result = await send('inspect', { text, backupPassword: p })
    importedText = text
    importPassword = p
    $('import-summary').textContent =
      `${result.source}：新增 ${result.added} 条，重复 ${result.duplicates} 条，不支持 ${result.skipped} 条。`
    for (const r of result.records) {
      const li = document.createElement('li')
      li.textContent = `${r.label || r.rpId} · ${r.userName}`
      $('import-list').append(li)
    }
    $('import-preview').hidden = false
  })
})
$('import-confirm').addEventListener('click', () =>
  run(async () => {
    const result = await send('import', { text: importedText, backupPassword: importPassword })
    clearImport()
    $('import-password').value = ''
    $('import-file').value = ''
    await refresh()
    feedback('notice', `已导入 ${result.added} 条，保留重复记录 ${result.duplicates} 条。`)
    await finishCompanion()
  })
)
$('change-password-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    if ($('next-password').value !== $('next-confirmation').value)
      throw new Error('两次主口令不一致。')
    await send('password', {
      password: $('current-password').value,
      nextPassword: $('next-password').value
    })
    for (const id of ['current-password', 'next-password', 'next-confirmation']) $(id).value = ''
    feedback('notice', '主口令已更新。设备解锁仍然有效；已有备份仍使用导出时的备份口令。')
  })
})
$('device-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    if (state.device) {
      await send('device-disable')
      feedback('notice', '已停用设备解锁。之后请用主口令解锁。')
    } else {
      const password = $('device-password').value
      if (!password) throw new Error('请输入主口令确认此操作。')
      // Check the password before asking the authenticator, so a typo costs no fingerprint.
      await send('unlock', { password })
      const device = await enrollDevice().catch((e) => {
        throw new Error(e?.name === 'NotAllowedError' ? '设备验证已取消。' : e.message)
      })
      await send('device-enable', { password, ...device })
      $('device-password').value = ''
      feedback('notice', '已启用设备解锁。下次可直接用 Touch ID / Windows Hello 解锁。')
    }
    state = await send('status')
    showSettings()
  })
})
$('lock-after').addEventListener('change', () =>
  run(async () => {
    state.settings = (await send('settings', { lockAfter: Number($('lock-after').value) })).settings
    feedback('notice', '已更新自动锁定时间。')
  })
)
$('prompt-mode').addEventListener('change', () =>
  run(async () => {
    state.settings = (await send('settings', { prompt: $('prompt-mode').value })).settings
    feedback('notice', '已更新确认框位置。')
  })
)
$('paused').addEventListener('change', () =>
  run(async () => {
    await send('pause', { paused: $('paused').checked })
    feedback('notice', $('paused').checked ? '已暂停处理网站请求。' : '已恢复处理网站请求。')
  })
)
// Coming back to an open manager after the session timed out shows the gate, not stale data.
window.addEventListener('focus', () =>
  run(async () => {
    if (!state?.exists || $('manager').hidden) return
    const now = await send('status')
    if (!now.unlocked) {
      state = now
      forgetView()
      render()
      showGate()
    }
  })
)
window.addEventListener('pagehide', forgetView)
run(start)
