import { deviceSecret, deviceSupported } from './device.js'

const $ = (id) => document.getElementById(id)
const token = new URLSearchParams(location.search).get('request')
const framed = window.top !== window
let state,
  busy = false,
  finished = false
/*
 * Per confirm button: seen in full and unobstructed for a moment (always true
 * in a window). The wrapper is watched, not the button, because a disabled
 * button is drawn faded, and faded counts as not visible.
 */
const clear = new Map()
const reachable = (button) => !framed || clear.get(button.parentElement) === true
async function send(action, values = {}) {
  const result = await chrome.runtime.sendMessage({ action, token, ...values })
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
function guard() {
  // Confirming needs the button itself in full, unobstructed view; see watchVisibility.
  for (const id of ['approve', 'exists']) $(id).disabled = busy || !reachable($(id))
}
async function run(action) {
  if (busy || finished) return
  busy = true
  feedback('error')
  const buttons = [...document.querySelectorAll('button')]
  buttons.forEach((b) => (b.disabled = true))
  try {
    await action()
  } catch (e) {
    if (e.code === 'Locked') showGate()
    feedback('error', e.message || '无法完成操作。')
  } finally {
    busy = false
    buttons.forEach((b) => (b.disabled = false))
    guard()
  }
}
function done(text) {
  finished = true
  for (const id of ['gate', 'approval', 'duplicate', 'request-actions']) $(id).hidden = true
  feedback('notice', text)
  // A window closes itself; inside a page, the page's script removes the frame.
  if (!framed) setTimeout(() => window.close(), 900)
}

/*
 * Inside a website, the page could lay something over this frame, or make it
 * transparent, and steer a click onto "confirm". The browser's visibility
 * tracking reports that, and confirming waits until the prompt has been fully
 * visible for a moment.
 */
function watchVisibility() {
  if (!framed) return
  if (!('isVisible' in IntersectionObserverEntry.prototype)) {
    $('covered').hidden = false
    guard()
    return
  }
  const timers = new Map(),
    covered = new Map()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const { target, isVisible, isIntersecting } of entries) {
        clearTimeout(timers.get(target))
        // In view but not visible means something lies over it, or it was faded or skewed.
        covered.set(target, isIntersecting && !isVisible)
        if (isVisible)
          timers.set(
            target,
            setTimeout(() => {
              clear.set(target, true)
              guard()
            }, 400)
          )
        else clear.set(target, false)
      }
      $('covered').hidden = ![...covered.values()].some(Boolean)
      guard()
    },
    { trackVisibility: true, delay: 100, threshold: [1] }
  )
  observer.observe($('approve-slot'))
  observer.observe($('exists-slot'))
}

function showGate() {
  for (const id of ['approval', 'duplicate', 'missing']) $(id).hidden = true
  $('gate').hidden = false
  $('device').hidden = !state.device || !deviceSupported()
  ;(state.device && deviceSupported() ? $('device') : $('password')).focus()
}
async function proceed() {
  $('gate').hidden = true
  const result = await send('list')
  const create = state.request.kind === 'create'
  if (create && result.excluded) {
    $('duplicate').hidden = false
    $('exists').focus()
    return
  }
  $('approval').hidden = false
  $('approval-title').textContent = create ? '确认保存' : '选择登录账号'
  $('approve').textContent = create ? '创建并保存' : '确认登录'
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
      text.textContent = r.label
        ? `${r.label} · ${r.userName || r.userDisplayName}`
        : r.userName || r.userDisplayName
      label.append(input, text)
      $('choices').append(label)
    }
  if (!create && !result.records.length) {
    $('approval').hidden = true
    feedback('notice', '这里没有此网站可用的通行密钥，请使用系统或其他验证器。')
    $('fallback').focus()
    return
  }
  $('approve').focus()
}

async function start() {
  if (!token) return
  if (framed) document.documentElement.classList.add('framed')
  document.body.hidden = false
  state = await send('status')
  const request = state.request
  $('title').textContent = request.kind === 'create' ? '保存新的通行密钥' : '使用通行密钥登录'
  $('origin').textContent = request.origin
  if (request.topOrigin && request.topOrigin !== request.origin) {
    $('embedded').hidden = false
    $('embedded').textContent = `嵌在 ${request.topOrigin} 的页面中`
  }
  $('account').textContent = request.userName
    ? `账号：${request.userName}`
    : `凭据域名：${request.rpId}`
  watchVisibility()
  if (!state.exists) {
    $('missing').hidden = false
    $('fallback').focus()
    return
  }
  if (state.unlocked) await proceed()
  else showGate()
}

$('unlock-form').addEventListener('submit', (event) => {
  event.preventDefault()
  run(async () => {
    await send('unlock', { password: $('password').value })
    $('password').value = ''
    await proceed()
  })
})
$('device').addEventListener('click', () =>
  run(async () => {
    const secret = await deviceSecret(state.device).catch((e) => {
      throw new Error(e?.name === 'NotAllowedError' ? '设备验证已取消，可改用主口令。' : e.message)
    })
    await send('device-unlock', { credentialId: state.device.credentialId, secret })
    await proceed()
  })
)
$('approve-form').addEventListener('submit', (event) => {
  event.preventDefault()
  if (!reachable($('approve'))) return
  run(async () => {
    const result = await send('approve', {
      credentialId: document.querySelector('input[name=credential]:checked')?.value
    })
    done(result.kind === 'create' ? '已保存，正在返回网站。' : '已完成验证，正在返回网站。')
  })
})
$('exists').addEventListener('click', () => {
  if (!reachable($('exists'))) return
  run(async () => {
    await send('exists')
    done('已告知网站此账号已有通行密钥。')
  })
})
for (const action of ['fallback', 'deny'])
  $(action).addEventListener('click', () =>
    run(async () => {
      await send(action)
      done(action === 'fallback' ? '已交给系统或其他验证器。' : '已取消。')
    })
  )
$('close').addEventListener('click', () => $('deny').click())
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') $('deny').click()
})
run(start)
