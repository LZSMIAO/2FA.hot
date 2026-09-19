const $ = (id) => document.getElementById(id)
const token = new URLSearchParams(location.search).get('request')
const companion = new URLSearchParams(location.search).get('companion')
let state,
  password = '',
  records = [],
  importedText = '',
  importPassword = '',
  selected = new Set(),
  busy = false
async function send(action, values = {}) {
  const result = await chrome.runtime.sendMessage({ action, token, companion, password, ...values })
  if (!result.ok) throw new Error(result.error)
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
    `${r.rpId} ${r.userName} ${r.userDisplayName}`.toLowerCase().includes(query)
  )
}
function selection() {
  $('selected-count').textContent = `已选 ${selected.size} 条`
  const visible = visibleRecords()
  $('select-all').checked = !!visible.length && visible.every((r) => selected.has(identity(r)))
  $('select-all').indeterminate =
    visible.some((r) => selected.has(identity(r))) && !$('select-all').checked
}
function render() {
  $('records').replaceChildren()
  const visible = visibleRecords()
  $('count').textContent = `${records.length} 条通行密钥`
  $('empty').hidden = records.length > 0
  for (const r of visible) {
    const row = document.createElement('label')
    row.className = 'record'
    const box = document.createElement('input')
    box.type = 'checkbox'
    box.checked = selected.has(identity(r))
    box.setAttribute('aria-label', `选择 ${r.rpId} ${r.userName}`)
    box.addEventListener('change', () => {
      box.checked ? selected.add(identity(r)) : selected.delete(identity(r))
      selection()
    })
    const info = document.createElement('div')
    info.className = 'record-info'
    const site = document.createElement('strong')
    site.textContent = r.rpId
    const user = document.createElement('span')
    user.textContent = r.userName || r.userDisplayName || '未命名账号'
    info.append(site, user)
    const time = document.createElement('time')
    time.textContent = r.lastUsedAt
      ? `最近使用 ${new Date(r.lastUsedAt).toLocaleDateString()}`
      : '尚未使用'
    row.append(box, info, time)
    $('records').append(row)
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
function lock() {
  password = ''
  importedText = ''
  importPassword = ''
  records = []
  selected.clear()
  location.reload()
}
async function finishCompanion() {
  if (!companion) return
  await send('companion-finish')
  password = ''
  records = []
  selected.clear()
  window.close()
}
function showCompanion() {
  const operation = state.companion.operation
  $('manager').hidden = operation === 'list'
  $('share-list').hidden = operation !== 'list'
  if (operation === 'list') {
    $('share-summary').textContent =
      `共 ${records.length} 条通行密钥。确认后在请求页面显示网站、账号和使用时间。`
    $('share-confirm').focus()
    return
  }
  selected = new Set(state.companion.ids)
  if (operation !== 'import') records = records.filter((r) => selected.has(identity(r)))
  render()
  document.querySelector('.toolbar').hidden = true
  document.querySelector('.list-heading').hidden = true
  document.querySelector('.selection-bar').hidden = operation !== 'remove'
  document.querySelector('#manager > details:last-child').hidden = true
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
$('share-confirm').addEventListener('click', () => run(finishCompanion))
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
  $('paused').checked = state.paused
  if (companion) {
    const names = {
      list: '在网站中查看通行密钥',
      import: '导入通行密钥',
      export: '导出所选通行密钥',
      remove: '删除所选通行密钥'
    }
    $('title').textContent = names[state.companion.operation]
    $('subtitle').textContent = '核对请求来源，在此窗口解锁并确认，完成后自动返回原页面。'
    $('companion-info').hidden = false
    $('companion-origin').textContent = state.companion.origin
    $('companion-cancel').hidden = false
  }
  if (token) {
    $('title').textContent =
      state.request.kind === 'create' ? '保存新的通行密钥' : '使用通行密钥登录'
    $('subtitle').textContent = '请核对来源网站，再解锁并确认。'
    $('request-info').hidden = false
    $('request-actions').hidden = false
    $('origin').textContent = state.request.origin
    $('request-account').textContent = state.request.userName
      ? `账号：${state.request.userName}`
      : `凭据域名：${state.request.rpId}`
  }
}
$('unlock-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    const entered = $('password').value
    if (!state.exists && entered !== $('confirmation').value) throw new Error('两次主口令不一致。')
    if (!state.exists) {
      await send('setup', { password: entered })
      state.exists = true
    }
    const result = await send('list', { password: entered })
    password = entered
    $('password').value = ''
    $('confirmation').value = ''
    $('gate').hidden = true
    if (token) {
      $('approval').hidden = false
      const create = state.request.kind === 'create'
      $('approval-title').textContent = create ? '确认保存' : '选择登录账号'
      $('approve').textContent = create ? '创建并保存通行密钥' : '确认登录'
      $('choices').replaceChildren()
      if (create) {
        const p = document.createElement('p')
        p.textContent = `${state.request.rpId} · ${state.request.userName}`
        $('choices').append(p)
      } else
        for (const [index, r] of result.records.entries()) {
          const label = document.createElement('label')
          label.className = 'choice check'
          const input = document.createElement('input')
          input.type = 'radio'
          input.name = 'credential'
          input.value = r.credentialId
          input.checked = index === 0
          const text = document.createElement('span')
          text.textContent = r.userName || r.userDisplayName
          label.append(input, text)
          $('choices').append(label)
        }
      if (!create && !result.records.length) {
        feedback('notice', '没有匹配的通行密钥，请使用系统或其他验证器。')
        $('approve').hidden = true
      }
      $('approve').focus()
    } else {
      $('manager').hidden = false
      records = result.records
      render()
      if (companion) showCompanion()
      else $('search').focus()
    }
  })
})
$('approve-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    const result = await send('approve', {
      credentialId: document.querySelector('input[name=credential]:checked')?.value
    })
    password = ''
    $('approval').hidden = true
    $('request-actions').hidden = true
    feedback(
      'notice',
      result.kind === 'create' ? '已保存。请返回网站完成注册确认。' : '已完成验证，请返回网站。'
    )
    setTimeout(() => window.close(), 1000)
  })
})
for (const action of ['fallback', 'deny'])
  $(action).addEventListener('click', () =>
    run(async () => {
      await send(action)
      password = ''
      window.close()
    })
  )
$('lock').addEventListener('click', lock)
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
    $('export-password').value = ''
    $('export-confirmation').value = ''
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
      li.textContent = `${r.rpId} · ${r.userName}`
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
    const nextPassword = $('next-password').value
    await send('password', { nextPassword })
    password = nextPassword
    $('next-password').value = ''
    $('next-confirmation').value = ''
    feedback('notice', '主口令已更新。已有备份仍使用导出时的备份口令。')
  })
})
$('paused').addEventListener('change', () =>
  run(async () => {
    await send('pause', { paused: $('paused').checked })
    feedback('notice', $('paused').checked ? '已暂停处理网站请求。' : '已恢复处理网站请求。')
  })
)
let lastActive = Date.now()
for (const event of ['pointerdown', 'keydown'])
  window.addEventListener(event, () => (lastActive = Date.now()))
setInterval(() => {
  if (password && Date.now() - lastActive > 5 * 60000) lock()
}, 1000)
window.addEventListener('pagehide', () => {
  password = ''
  importedText = ''
  importPassword = ''
  records = []
})
run(start)
