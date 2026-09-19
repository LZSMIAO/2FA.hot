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
try {
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker'))
  const id = new URL(worker.url()).hostname
  const ui = await context.newPage()
  await ui.setViewportSize({ width: 1280, height: 800 })
  await ui.goto(`chrome-extension://${id}/ui.html`)
  console.log('UI:', (await ui.locator('main').innerText()).slice(0, 180))
  await ui.locator('#password').fill(password)
  await ui.locator('#confirmation').fill(password)
  await ui.locator('#unlock').click()
  await ui.locator('#manager').waitFor({ state: 'visible' })
  await mkdir('output', { recursive: true })
  await ui.screenshot({ path: 'output/passkeys-empty.png', fullPage: true })
  const site = await context.newPage()
  await site.route(`${base}/__passkey-test*`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>Local Passkey Fixture</title></head><body><h1>Local relying party</h1><button id="start">Create</button></body></html>'
    })
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
  assert.equal(connection.managerProtocol, 1)
  assert.equal(connection.records, undefined)
  const settings = {
    challenge: encode(random(32)),
    rp: { id: rpId, name: 'Passkey demo' },
    user: { id: encode(random(16)), name: 'browser-test@example.com', displayName: 'Browser test' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    extensions: { credProps: true }
  }
  await site.evaluate((settings) => {
    document.querySelector('#start').onclick = () => {
      const binary = (s) =>
        Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
      window.result = null
      window.failure = null
      navigator.credentials
        .create({
          publicKey: {
            ...settings,
            challenge: binary(settings.challenge),
            user: { ...settings.user, id: binary(settings.user.id) }
          }
        })
        .then(
          (c) =>
            (window.result = {
              json: c.toJSON(),
              instance: c instanceof PublicKeyCredential,
              responseInstance: c.response instanceof AuthenticatorAttestationResponse,
              spkiLength: c.response.getPublicKey().byteLength
            }),
          (e) => (window.failure = e.message)
        )
    }
  }, settings)
  const popupPromise = context.waitForEvent('page')
  await site.locator('#start').click()
  const popup = await popupPromise
  await popup.waitForLoadState()
  console.log('Registration popup:', (await popup.locator('main').innerText()).slice(0, 200))
  await popup.locator('#password').fill(password)
  await popup.locator('#unlock').click()
  await popup.locator('#approval').waitFor({ state: 'visible' })
  await popup.screenshot({ path: 'output/passkeys-register.png', fullPage: true })
  if (process.env.PASSKEY_STORE_SCREENSHOTS) {
    await mkdir('store/assets', { recursive: true })
    await popup.setViewportSize({ width: 1280, height: 800 })
    await popup.screenshot({ path: 'store/assets/screenshot-02-create.png' })
  }
  await popup.locator('#approve').click()
  await site.waitForFunction(() => window.result || window.failure)
  assert.equal(await site.evaluate(() => window.failure), null)
  const created = await site.evaluate(() => window.result)
  assert.equal(created.instance, true)
  assert.equal(created.responseInstance, true)
  assert.ok(created.spkiLength > 0)
  const registration = await verifyRegistrationResponse({
    response: created.json,
    expectedChallenge: settings.challenge,
    expectedOrigin: base,
    expectedRPID: rpId,
    requireUserVerification: true
  })
  assert.equal(registration.verified, true)
  console.log('Real browser registration verified')
  const challenge = encode(random(32))
  const prepareLogin = (challenge) =>
    site.evaluate(
      ({ challenge, rpId }) => {
        document.querySelector('#start').onclick = () => {
          window.result = null
          window.failure = null
          navigator.credentials
            .get({
              publicKey: {
                challenge: Uint8Array.from(
                  atob(challenge.replace(/-/g, '+').replace(/_/g, '/')),
                  (c) => c.charCodeAt(0)
                ),
                rpId,
                userVerification: 'required'
              }
            })
            .then(
              (c) => (window.result = c.toJSON()),
              (e) => (window.failure = e.message)
            )
        }
      },
      { challenge, rpId }
    )
  await prepareLogin(challenge)
  const loginPromise = context.waitForEvent('page')
  await site.locator('#start').click()
  const login = await loginPromise
  await login.waitForLoadState()
  await login.locator('#password').fill(password)
  await login.locator('#unlock').click()
  await login.locator('#choices input').waitFor()
  await login.locator('#approve').click()
  await site.waitForFunction(() => window.result || window.failure)
  assert.equal(await site.evaluate(() => window.failure), null)
  const assertion = await site.evaluate(() => window.result)
  const verified = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: challenge,
    expectedOrigin: base,
    expectedRPID: rpId,
    credential: registration.registrationInfo.credential,
    requireUserVerification: true
  })
  assert.equal(verified.verified, true)
  console.log('Real browser discoverable login verified')
  await ui.reload()
  await ui.locator('#password').fill(password)
  await ui.locator('#unlock').click()
  await ui.locator('.record').waitFor()
  await ui.screenshot({ path: 'output/passkeys-manager.png', fullPage: true })
  if (process.env.PASSKEY_STORE_SCREENSHOTS)
    await ui.screenshot({ path: 'store/assets/screenshot-01-vault.png' })
  await ui.emulateMedia({ colorScheme: 'dark' })
  await ui.setViewportSize({ width: 440, height: 800 })
  await ui.screenshot({ path: 'output/passkeys-manager-dark.png', fullPage: true })
  assert.equal(await ui.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await ui.locator('#select-all').check()
  await ui.locator('#export-section summary').click()
  await ui.locator('#export-password').fill('backup-browser-test-123')
  await ui.locator('#export-confirmation').fill('backup-browser-test-123')
  const downloadPromise = ui.waitForEvent('download')
  await ui.locator('#export-form button[type=submit]').click()
  const download = await downloadPromise
  const backup = await readFile(await download.path(), 'utf8')
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
  await ui.locator('.record').waitFor()
  if (companionURL)
    await verifyWebsiteManagement(context, companionURL, password, 'browser-test@example.com')
  const restoredChallenge = encode(random(32))
  await prepareLogin(restoredChallenge)
  const restoredPopupPromise = context.waitForEvent('page')
  await site.locator('#start').click()
  const restoredPopup = await restoredPopupPromise
  await restoredPopup.waitForLoadState()
  await restoredPopup.locator('#password').fill(password)
  await restoredPopup.locator('#unlock').click()
  await restoredPopup.locator('#choices input').waitFor()
  await restoredPopup.locator('#approve').click()
  await site.waitForFunction(() => window.result || window.failure)
  assert.equal(await site.evaluate(() => window.failure), null)
  const restoredLogin = await verifyAuthenticationResponse({
    response: await site.evaluate(() => window.result),
    expectedChallenge: restoredChallenge,
    expectedOrigin: base,
    expectedRPID: rpId,
    credential: registration.registrationInfo.credential,
    requireUserVerification: true
  })
  assert.equal(restoredLogin.verified, true)
  if (process.env.PASSKEY_STORE_SCREENSHOTS) {
    await ui.emulateMedia({ colorScheme: 'light' })
    await ui.setViewportSize({ width: 1280, height: 800 })
    await ui.locator('#export-section summary').click()
    await ui.locator('#import-preview').waitFor({ state: 'hidden' })
    await ui.locator('#import-section').scrollIntoViewIfNeeded()
    await ui.screenshot({ path: 'store/assets/screenshot-03-restore.png' })
  }
  console.log('Restored passkey signs a fresh challenge against the original registered public key')
  const state = await worker.evaluate(async () => {
    const local = await chrome.storage.local.get(null),
      session = await chrome.storage.session.get(null)
    return JSON.stringify({ local, session })
  })
  assert.equal(state.includes(password), false)
  assert.equal(state.includes('privateKey'), false)
  assert.deepEqual(errors, [])
  console.log('Encrypted export, delete, import, DOM rendering and storage privacy verified')
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
