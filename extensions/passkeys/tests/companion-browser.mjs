import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

export async function verifyWebsiteManagement(context, url, password, account) {
  const page = await context.newPage()
  await page.goto(url.href)
  await page.getByRole('dialog').waitFor({ state: 'visible' })
  await page.getByText('扩展已连接', { exact: true }).waitFor()
  const responses = []
  await page.exposeFunction('recordCompanionResponse', (data) => responses.push(data))
  await page.evaluate(() =>
    window.addEventListener('message', (event) => {
      if (
        event.data?.namespace === '2fa.hot/passkeys/site/v1' &&
        event.data.direction === 'response'
      )
        window.recordCompanionResponse(event.data)
    })
  )
  async function popupFor(button) {
    const next = context.waitForEvent('page', { timeout: 10000 }).catch(async (error) => {
      console.error(
        'Popup failure:',
        await page.getByRole('dialog').innerText(),
        JSON.stringify(responses.slice(-3))
      )
      throw error
    })
    await button.click()
    const popup = await next
    await popup.waitForLoadState()
    await popup.locator('#companion-info').waitFor({ state: 'visible' })
    assert.equal(await popup.locator('#companion-origin').innerText(), url.origin)
    return popup
  }
  async function unlock(popup) {
    await popup.locator('#password').fill(password)
    await popup.locator('#unlock').click()
    await popup.locator('#gate').waitFor({ state: 'hidden' })
  }
  // Closing the approval leaves the website locked and allows a new request.
  const cancelled = await popupFor(page.locator('[data-passkey-unlock]'))
  await cancelled.close()
  await page.getByText('已取消操作。', { exact: true }).waitFor()
  assert.equal(await page.locator('.manager-record').count(), 0)
  const approval = await popupFor(page.locator('[data-passkey-unlock]'))
  await approval.locator('#password').fill('wrong-password')
  await approval.locator('#unlock').click()
  await approval.locator('#error').waitFor({ state: 'visible' })
  assert.equal(await page.locator('.manager-record').count(), 0)
  await unlock(approval)
  assert.equal(
    await page.locator('.manager-record').count(),
    0,
    'unlock alone does not disclose metadata'
  )
  await approval.locator('#share-confirm').click()
  await page.locator('.manager-record').waitFor()
  assert.match(
    await page.locator('.manager-record').innerText(),
    new RegExp(account.replaceAll('.', '\\.'))
  )
  await page.getByRole('textbox', { name: '搜索网站或账号' }).fill('not-a-matching-account')
  await page.getByText('没有匹配的网站或账号。', { exact: true }).waitFor()
  await page.getByRole('textbox', { name: '搜索网站或账号' }).fill('')
  await page.getByRole('checkbox', { name: '选择当前列表', exact: true }).check()
  await page.screenshot({ path: 'output/passkeys-website-manager.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.screenshot({ path: 'output/passkeys-website-manager-narrow.png', fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })

  const exporting = await popupFor(page.getByRole('button', { name: '导出所选', exact: true }))
  await unlock(exporting)
  assert.equal(await exporting.locator('#import-section').isVisible(), false)
  await exporting.locator('#export-password').fill('website-backup-password')
  await exporting.locator('#export-confirmation').fill('website-backup-password')
  const downloadPromise = exporting.waitForEvent('download')
  await exporting.locator('#export-form button[type=submit]').click()
  const download = await downloadPromise
  const backup = await readFile(await download.path(), 'utf8')
  assert.equal(backup.includes(account), false)
  await page.getByText('列表已更新。', { exact: true }).waitFor()
  await page.getByRole('checkbox', { name: '选择当前列表', exact: true }).check()

  const deleting = await popupFor(page.getByRole('button', { name: '删除所选', exact: true }))
  await unlock(deleting)
  await deleting.locator('#remove').click()
  await deleting.locator('#delete-confirm').click()
  await page.getByText('添加第一把通行密钥', { exact: true }).waitFor()
  const importing = await popupFor(page.getByRole('button', { name: '导入', exact: true }))
  await unlock(importing)
  await importing.locator('#import-file').setInputFiles({
    name: 'backup.2fapasskeys',
    mimeType: 'application/json',
    buffer: Buffer.from(backup)
  })
  await importing.locator('#import-password').fill('website-backup-password')
  await importing.locator('#import-form button').click()
  await importing.locator('#import-preview').waitFor({ state: 'visible' })
  await importing.locator('#import-confirm').click()
  await page.locator('.manager-record').waitFor()
  assert.equal(
    responses.some((r) => r.records?.length === 1),
    true
  )
  assert.equal(JSON.stringify(responses).includes(password), false)
  assert.equal(JSON.stringify(responses).includes('privateKey'), false)
  assert.equal(JSON.stringify(responses).includes('website-backup-password'), false)
  assert.equal(JSON.stringify(responses).includes(JSON.parse(backup).data), false)
  await page.getByRole('button', { name: '隐藏列表', exact: true }).click()
  await page.locator('[data-passkey-unlock]').waitFor()
  assert.equal(await page.locator('.manager-record').count(), 0)
  const closeTest = await popupFor(page.locator('[data-passkey-unlock]'))
  const popupClosed = closeTest.waitForEvent('close')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await popupClosed
  await page.locator('[data-passkey-trigger]').click()
  await page.locator('[data-passkey-unlock]').waitFor()
  assert.equal(await page.locator('.manager-record').count(), 0)
  await page.close()
  console.log(
    'Website management: approval, search, export, delete, import, cancel, clearing and metadata-only bridge verified'
  )
}
