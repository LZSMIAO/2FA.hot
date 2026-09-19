import assert from 'node:assert/strict'
import test from 'node:test'
import {
  narrationLanguage,
  narrationText,
  narrationSegments,
  selectNarrationVoice
} from '../app/utils/guide-narration.ts'

test('narration is available for the supported English and Chinese locales', () => {
  for (const locale of ['en', 'zh-CN', 'zh-TW']) assert.ok(narrationLanguage(locale))
  assert.equal(narrationLanguage('ja'), undefined)
})
test('Chinese narration uses intelligible terms and keeps the sentence together', () => {
  for (const lang of ['zh-CN', 'zh-TW']) {
    assert.equal(
      narrationText('2fa.hot 和 Google Authenticator App 一样。', lang),
      '本站 和 谷歌验证器 应用 一样。'
    )
    assert.deepEqual(narrationSegments('使用2FA取得验证码。', lang), [
      { text: '使用双重验证取得验证码。', language: lang }
    ])
  }
  assert.equal(narrationText('Use 2FA.'), 'Use two factor authentication.')
})
test('voice choice is language-safe and independent of platform list ordering', () => {
  const voices = [
    { name: 'English', lang: 'en-US', default: true },
    { name: 'Basic Chinese', lang: 'zh-CN', default: true },
    { name: 'Microsoft Xiaoxiao Natural', lang: 'zh-CN', default: false }
  ]
  assert.equal(selectNarrationVoice(voices, 'zh-CN')?.name, 'Microsoft Xiaoxiao Natural')
  assert.equal(
    selectNarrationVoice([...voices].reverse(), 'zh-CN')?.name,
    'Microsoft Xiaoxiao Natural'
  )
  assert.equal(selectNarrationVoice(voices, 'zh-TW'), undefined)
  assert.equal(selectNarrationVoice([], 'zh-CN'), undefined)
})
