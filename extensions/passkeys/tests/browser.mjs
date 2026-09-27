import { verifyWebsiteManagement } from './companion-browser.mjs'
// Standalone integration test; fulfills localhost routes without starting a server.
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { verifyRegistrationResponse, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { encode, random } from '../src/encoding.js'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.PASSKEY_TEST_ORIGIN || 'http://localhost:3001'
const companionURL = process.env.PASSKEY_COMPANION_URL
  ? new URL(process.env.PASSKEY_COMPANION_URL)
  : null
companionURL?.searchParams.set('passkeys', '1')
const rpId = new URL(base).hostname
const dir = await mkdtemp(resolve(tmpdir(), '2fa-passkeys-test-'))
const extension = resolve(process.env.PASSKEY_BUILD_DIR || 'dist')
const context = await chromium.launchPersistentContext(dir, {
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
})
const errors = []
context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)))
const password = 'browser-test-password-123'
const fixture =
  '<!doctype html><html><head><title>Local Passkey Fixture</title></head><body>' +
  '<h1>Local relying party</h1>' +
  '<form><input id="username" name="username" autocomplete="username webauthn"></form>' +
  '<button id="start">Start</button></body></html>'

// Runs a WebAuthn call in the page, turning base64url fields into buffers and results back.
const call = (page, kind, publicKey, extra = {}) =>
  page.evaluate(
    ({ kind, publicKey, extra }) => {
      const bin = (s) =>
        Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
      const b64 = (b) =>
        btoa(String.fromCharCode(...new Uint8Array(b)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
      const pk = { ...publicKey, challenge: bin(publicKey.challenge) }
      if (pk.user) pk.user = { ...pk.user, id: bin(pk.user.id) }
      for (const field of ['allowCredentials', 'excludeCredentials'])
        if (pk[field]) pk[field] = pk[field].map((d) => ({ ...d, id: bin(d.id) }))
      const prf = pk.extensions?.prf?.eval
      if (prf)
        pk.extensions = {
          ...pk.extensions,
          prf: { eval: Object.fromEntries(Object.entries(prf).map(([k, v]) => [k, bin(v)])) }
        }
      window.outcome = null
      window.controller = new AbortController()
      navigator.credentials[kind]({
        publicKey: pk,
        signal: window.controller.signal,
        ...extra
      }).then(
        (c) => {
          const ext = c.getClientExtensionResults()
          const results = ext.prf?.results
          window.outcome = {
            ok: true,
            json: c.toJSON(),
            instance: c instanceof PublicKeyCredential,
            prfEnabled: ext.prf?.enabled,
            prf: results && {
              first: results.first instanceof ArrayBuffer ? b64(results.first) : null,
              second: results.second instanceof ArrayBuffer ? b64(results.second) : undefined
            }
          }
        },
        (e) => (window.outcome = { ok: false, name: e.name, message: e.message })
      )
    },
    { kind, publicKey, extra }
  )
const outcome = async (page) => {
  await page.waitForFunction(() => window.outcome, null, { timeout: 30000 })
  return page.evaluate(() => window.outcome)
}
async function promptFrame(page) {
  for (let i = 0; i < 100; i++) {
    const frame = page.frames().find((f) => f.url().includes('/prompt.html'))
    if (frame) {
      await frame.waitForLoadState()
      return frame
    }
    await page.waitForTimeout(100)
  }
  throw new Error('The in-page prompt did not appear.')
}
const noPrompt = async (page) => {
  await page.waitForTimeout(1200)
  return !page.frames().some((f) => f.url().includes('/prompt.html'))
}
const registrationOptions = (extra = {}) => ({
  challenge: encode(random(32)),
  rp: { id: rpId, name: 'Passkey demo' },
  user: { id: encode(random(16)), name: 'browser-test@example.com', displayName: 'Browser test' },
  pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
  authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  extensions: { credProps: true },
  ...extra
})
const loginOptions = (extra = {}) => ({
  challenge: encode(random(32)),
  rpId,
  userVerification: 'required',
  ...extra
})
async function verifyLogin(response, challenge, credential) {
  const verified = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: base,
    expectedRPID: rpId,
    credential,
    requireUserVerification: true
  })
  assert.equal(verified.verified, true)
}

try {
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'))
  const id = new URL(worker.url()).hostname
  const ui = await context.newPage()
  await ui.setViewportSize({ width: 1280, height: 800 })
  await ui.goto(`chrome-extension://${id}/ui.html`)
  await ui.locator('#gate').waitFor({ state: 'visible' })
  console.log('UI:', (await ui.locator('main').innerText()).slice(0, 120).replace(/\n+/g, ' / '))
  await ui.locator('#password').fill(password)
  await ui.locator('#confirmation').fill(password)
  await ui.locator('#unlock').click()
  await ui.locator('#manager').waitFor({ state: 'visible' })
  await mkdir('output', { recursive: true })
  await ui.screenshot({ path: 'output/passkeys-empty.png', fullPage: true })

  const site = await context.newPage()
  await site.route(`${base}/__passkey-test*`, (route) =>
    route.fulfill({ contentType: 'text/html', body: fixture })
  )
  await site.goto(`${base}/__passkey-test`)
  const connection = await site.evaluate(
    () =>
      new Promise((resolve) => {
        const namespace = '2fa.hot/passkeys/site/v1',
          id = crypto.randomUUID()
        const timer = setTimeout(() => resolve(null), 3000)
        function receive(event) {
          if (
            event.data?.namespace !== namespace ||
            event.data.id !== id ||
            event.data.direction !== 'response'
          )
            return
          clearTimeout(timer)
          window.removeEventListener('message', receive)
          resolve(event.data)
        }
        window.addEventListener('message', receive)
        window.postMessage(
          { namespace, id, action: 'status', direction: 'request' },
          location.origin
        )
      })
  )
  assert.equal(connection.ok, true)
  assert.equal(
    connection.version,
    JSON.parse(await readFile(resolve(extension, 'manifest.json'), 'utf8')).version
  )
  assert.equal(connection.managerProtocol, 2)
  assert.equal(connection.records, undefined)
  assert.equal(
    await site.evaluate(() => PublicKeyCredential.isConditionalMediationAvailable()),
    true
  )

  // An empty vault holds nothing for this site: the request goes to the browser, no prompt.
  await call(site, 'get', loginOptions())
  assert.equal(await noPrompt(site), true)
  await site.evaluate(() => window.controller.abort())
  assert.equal((await outcome(site)).ok, false)
  console.log('A site the vault holds nothing for goes to the browser without a prompt')

  // Registration in the in-page prompt; the vault is still open from setup, so no password.
  const settings = registrationOptions({
    extensions: {
      credProps: true,
      prf: { eval: { first: encode(new TextEncoder().encode('e2e')) } }
    }
  })
  await call(site, 'create', settings)
  const create = await promptFrame(site)
  await create.locator('#approval').waitFor({ state: 'visible' })
  assert.equal(await create.locator('#gate').isVisible(), false, 'quick unlock skips the password')
  await site.screenshot({ path: 'output/passkeys-register-in-page.png' })
  await create.locator('#approve').click()
  const created = await outcome(site)
  assert.equal(created.ok, true, created.message)
  assert.equal(created.instance, true)
  assert.equal(created.prfEnabled, true)
  assert.equal(created.prf.first.length, 43, 'a 32-byte PRF value, as an ArrayBuffer')
  const registration = await verifyRegistrationResponse({
    response: created.json,
    expectedChallenge: settings.challenge,
    expectedOrigin: base,
    expectedRPID: rpId,
    requireUserVerification: true
  })
  assert.equal(registration.verified, true)
  const credential = registration.registrationInfo.credential
  assert.equal(await noPrompt(site), true, 'the prompt removes itself')
  console.log('In-page registration verified, with PRF')

  // The same account again: the site hears InvalidStateError, as from any authenticator.
  await call(
    site,
    'create',
    registrationOptions({ excludeCredentials: [{ type: 'public-key', id: created.json.id }] })
  )
  const duplicate = await promptFrame(site)
  await duplicate.locator('#duplicate').waitFor({ state: 'visible' })
  await duplicate.locator('#exists').click()
  const refused = await outcome(site)
  assert.equal(refused.name, 'InvalidStateError')
  console.log('Duplicate registration answers InvalidStateError')

  // Lock, then sign in: the prompt asks for the password, and PRF gives the same value as at creation.
  await ui.locator('#lock').click()
  await ui.locator('#gate').waitFor({ state: 'visible' })
  const challenge = encode(random(32))
  await call(
    site,
    'get',
    loginOptions({
      challenge,
      extensions: { prf: { eval: { first: encode(new TextEncoder().encode('e2e')) } } }
    })
  )
  const login = await promptFrame(site)
  await login.locator('#gate').waitFor({ state: 'visible' })
  await login.locator('#password').fill(password)
  await login.locator('#unlock').click()
  await login.locator('#choices input').waitFor()
  // Something the page lays over the prompt stops confirmation until it goes away.
  await site.evaluate(() => {
    const cover = document.createElement('div')
    cover.id = 'cover'
    cover.setAttribute('popover', 'manual')
    cover.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;margin:0;background:rgba(255,255,255,.01)'
    document.body.append(cover)
    cover.showPopover()
  })
  await login.locator('#covered').waitFor({ state: 'visible' })
  assert.equal(await login.locator('#approve').isDisabled(), true, 'covered: no confirming')
  await site.evaluate(() => document.getElementById('cover').remove())
  await login.locator('#covered').waitFor({ state: 'hidden' })
  await login.locator('#approve').click()
  const signedIn = await outcome(site)
  assert.equal(signedIn.ok, true, signedIn.message)
  assert.equal(signedIn.prf.first, created.prf.first, 'PRF is stable across create and get')
  await verifyLogin(signedIn.json, challenge, credential)
  console.log('Locked sign-in verified; a covered prompt refuses to confirm')

  // Autofill: a conditional request offers this vault next to the username field.
  const conditionalChallenge = encode(random(32))
  await call(site, 'get', loginOptions({ challenge: conditionalChallenge }), {
    mediation: 'conditional'
  })
  await site.locator('#username').focus()
  const offer = await site.waitForFunction(() =>
    [...document.querySelectorAll('[popover]')].find((e) => e.matches(':popover-open'))
  )
  const box = await offer.evaluate((e) => {
    const r = e.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  })
  await site.screenshot({ path: 'output/passkeys-autofill-offer.png' })
  await site.mouse.click(box.x, box.y)
  const conditional = await promptFrame(site)
  await conditional.locator('#approve').waitFor({ state: 'visible' })
  await conditional.locator('#approve').click()
  const autofilled = await outcome(site)
  assert.equal(autofilled.ok, true, autofilled.message)
  await verifyLogin(autofilled.json, conditionalChallenge, credential)
  console.log('Autofill (conditional mediation) sign-in verified')

  // Device unlock through a virtual platform authenticator with PRF.
  await ui.bringToFront()
  const cdp = await context.newCDPSession(ui)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true
    }
  })
  await ui.reload()
  await ui.locator('#manager').waitFor({ state: 'visible' })
  await ui.locator('#settings-section summary').click()
  await ui.locator('#device-password').fill(password)
  await ui.locator('#device-toggle').click()
  await ui.locator('#notice').filter({ hasText: '已启用设备解锁' }).waitFor()
  await ui.locator('#lock').click()
  await ui.locator('#device-unlock').waitFor({ state: 'visible' })
  await ui.locator('#device-unlock').click()
  await ui.locator('#manager').waitFor({ state: 'visible' })
  console.log('Touch ID / Windows Hello style device unlock verified in the manager')

  // Rename, then export, delete and import in the manager.
  await ui.locator('.record button', { hasText: '重命名' }).click()
  await ui.locator('.rename input').fill('E2E account')
  await ui.locator('.rename button', { hasText: '保存' }).click()
  await ui.locator('.record strong', { hasText: 'E2E account' }).waitFor()
  await ui.screenshot({ path: 'output/passkeys-manager.png', fullPage: true })
  await ui.emulateMedia({ colorScheme: 'dark' })
  await ui.setViewportSize({ width: 440, height: 800 })
  await ui.screenshot({ path: 'output/passkeys-manager-dark.png', fullPage: true })
  assert.equal(await ui.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await ui.emulateMedia({ colorScheme: 'light' })
  await ui.setViewportSize({ width: 1280, height: 800 })
  await ui.locator('#select-all').check()
  await ui.locator('#export-section summary').click()
  await ui.locator('#export-password').fill('backup-browser-test-123')
  await ui.locator('#export-confirmation').fill('backup-browser-test-123')
  await ui.locator('#export-master').fill(password)
  const downloadPromise = ui.waitForEvent('download')
  await ui.locator('#export-form button[type=submit]').click()
  const backup = await readFile(await (await downloadPromise).path(), 'utf8')
  assert.equal(backup.includes('browser-test@example.com'), false)
  await ui.locator('#remove').click()
  await ui.locator('#delete-confirm').click()
  await ui.locator('#empty').waitFor({ state: 'visible' })
  await ui.locator('#import-section summary').click()
  await ui.locator('#import-file').setInputFiles({
    name: 'restore.2fapasskeys',
    mimeType: 'application/json',
    buffer: Buffer.from(backup)
  })
  await ui.locator('#import-password').fill('backup-browser-test-123')
  await ui.locator('#import-form button').click()
  await ui.locator('#import-preview').waitFor({ state: 'visible' })
  await ui.locator('#import-confirm').click()
  await ui.locator('.record strong', { hasText: 'E2E account' }).waitFor()
  if (companionURL)
    await verifyWebsiteManagement(context, companionURL, password, 'browser-test@example.com')

  // The restored copy still signs for the key the site registered, and its PRF value moved with it.
  const restoredChallenge = encode(random(32))
  await call(
    site,
    'get',
    loginOptions({
      challenge: restoredChallenge,
      extensions: { prf: { eval: { first: encode(new TextEncoder().encode('e2e')) } } }
    })
  )
  const restored = await promptFrame(site)
  // The website test renames the passkey; either way the name shows in the prompt.
  await restored
    .locator('#choices')
    .filter({ hasText: companionURL ? 'Website name' : 'E2E account' })
    .waitFor()
  await restored.locator('#approve').click()
  const restoredLogin = await outcome(site)
  assert.equal(restoredLogin.ok, true, restoredLogin.message)
  assert.equal(restoredLogin.prf.first, created.prf.first)
  await verifyLogin(restoredLogin.json, restoredChallenge, credential)
  console.log('Restored passkey signs a fresh challenge against the original registered public key')

  // The separate-window prompt still works for anyone who prefers it.
  await ui.locator('#settings-section summary').click()
  await ui.locator('#prompt-mode').selectOption('window')
  await ui.locator('#notice').filter({ hasText: '已更新确认框位置' }).waitFor()
  const windowChallenge = encode(random(32))
  const popupPromise = context.waitForEvent('page')
  await call(site, 'get', loginOptions({ challenge: windowChallenge }))
  const popup = await popupPromise
  await popup.waitForLoadState()
  assert.match(popup.url(), /prompt\.html/)
  await popup.locator('#approve').waitFor({ state: 'visible' })
  await popup.locator('#approve').click()
  const windowLogin = await outcome(site)
  assert.equal(windowLogin.ok, true, windowLogin.message)
  await verifyLogin(windowLogin.json, windowChallenge, credential)
  console.log('Window-mode prompt verified')

  // Touch ID / Windows Hello inside the site's page: the prompt frame asks the device, unlocks, signs.
  await ui.locator('#prompt-mode').selectOption('page')
  await ui.locator('#notice').filter({ hasText: '已更新确认框位置' }).waitFor()
  // Enrol a tab's authenticator from the manager, as a user would on their own device, then sign in there.
  const device = await context.newPage()
  await device.route(`${base}/__passkey-test*`, (route) =>
    route.fulfill({ contentType: 'text/html', body: fixture })
  )
  await device.goto(`chrome-extension://${id}/ui.html`)
  await device.locator('#manager').waitFor({ state: 'visible' })
  const deviceCdp = await context.newCDPSession(device)
  await deviceCdp.send('WebAuthn.enable')
  await deviceCdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true
    }
  })
  await device.locator('#settings-section summary').click()
  await device.locator('#device-toggle', { hasText: '停用' }).click()
  await device.locator('#device-password').fill(password)
  await device.locator('#device-toggle').click()
  await device.locator('#notice').filter({ hasText: '已启用设备解锁' }).waitFor()
  await device.goto(`${base}/__passkey-test`)
  await ui.reload()
  await ui.locator('#lock').click()
  await ui.locator('#gate').waitFor({ state: 'visible' })
  const deviceChallenge = encode(random(32))
  await call(device, 'get', loginOptions({ challenge: deviceChallenge }))
  const deviceFrame = await promptFrame(device)
  await deviceFrame.locator('#device').waitFor({ state: 'visible' })
  await deviceFrame.locator('#device').click()
  await deviceFrame.locator('#approval').waitFor({ state: 'visible' })
  await deviceFrame.locator('#approve').click()
  const deviceLogin = await outcome(device)
  assert.equal(deviceLogin.ok, true, deviceLogin.message)
  await verifyLogin(deviceLogin.json, deviceChallenge, credential)
  console.log('Device unlock inside the in-page prompt verified')

  // A sign-in from an iframe on another origin: confirmed in a window, and the site sees the page around it.
  const inner = base.replace(/:(\d+)$/, (_, port) => `:${Number(port) + 1}`)
  await device.route(`${inner}/__passkey-frame*`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>frame</title><p>embedded</p>'
    })
  )
  await device.evaluate((src) => {
    const frame = document.createElement('iframe')
    frame.src = src
    frame.allow = 'publickey-credentials-get *'
    document.body.append(frame)
    return new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }))
  }, `${inner}/__passkey-frame`)
  const embedded = device.frames().find((f) => f.url().startsWith(inner))
  const frameChallenge = encode(random(32))
  const framePopup = context.waitForEvent('page')
  await call(embedded, 'get', loginOptions({ challenge: frameChallenge }))
  const framePrompt = await framePopup
  await framePrompt.waitForLoadState()
  await framePrompt.locator('#embedded').filter({ hasText: base }).waitFor()
  // Still unlocked from the sign-in above: quick unlock goes straight to the choice.
  await framePrompt.locator('#approve').click()
  const framed = await outcome(embedded)
  assert.equal(framed.ok, true, framed.message)
  const framedClient = JSON.parse(
    Buffer.from(framed.json.response.clientDataJSON, 'base64url').toString()
  )
  assert.equal(framedClient.origin, inner)
  assert.equal(framedClient.crossOrigin, true)
  assert.equal(framedClient.topOrigin, base)
  const framedVerified = await verifyAuthenticationResponse({
    response: framed.json,
    expectedChallenge: frameChallenge,
    expectedOrigin: inner,
    expectedRPID: rpId,
    credential,
    requireUserVerification: true
  })
  assert.equal(framedVerified.verified, true)
  console.log('Cross-origin iframe sign-in verified, with its top origin reported')

  const state = await worker.evaluate(async () => {
    const local = await chrome.storage.local.get(null),
      session = await chrome.storage.session.get(null)
    return JSON.stringify({ local, session })
  })
  assert.equal(state.includes(password), false)
  assert.equal(state.includes('privateKey'), false)
  assert.equal(state.includes('browser-test@example.com'), false)
  assert.equal(state.includes('localhost'), false, 'the site index holds hashes, not domains')
  assert.deepEqual(errors, [])
  console.log('Storage keeps no password, private key, account or domain in the clear')
} finally {
  await context.close()
  await rm(dir, { recursive: true, force: true })
}

if (process.env.PASSKEY_COMPANION_URL) {
  const browser = await chromium.launch({ channel: 'chromium', headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(companionURL.href)
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await page.getByText('尚未检测到扩展', { exact: true }).waitFor()
    assert.equal(await page.locator('[data-passkey-open]').count(), 0)
    await page.locator('[data-passkey-download]').waitFor({ state: 'visible' })
    const release = JSON.parse(await readFile('../../shared/passkeys-release.json', 'utf8'))
    assert.equal(
      await page.locator('[data-passkey-download]').getAttribute('href'),
      companionURL.hostname === 'localhost' ? release.localDownload : release.download
    )
    await page.screenshot({ path: 'output/passkeys-website-install.png', fullPage: true })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.emulateMedia({ colorScheme: 'dark' })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false
    )
    await page.screenshot({ path: 'output/passkeys-website-mobile.png', fullPage: true })
    console.log(
      'Website missing-extension state, unpublished store guidance and mobile layout verified'
    )
  } finally {
    await browser.close()
  }
}
