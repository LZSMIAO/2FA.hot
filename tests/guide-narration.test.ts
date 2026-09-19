import assert from 'node:assert/strict'
import test from 'node:test'
import { supportedLocales } from '../shared/locales.ts'
import {
  narrationLanguage,
  narrationText,
  narrationSegments,
  selectNarrationVoice
} from '../app/utils/guide-narration.ts'

test('narration recognizes all site languages and refuses unknown locales', () => {
  for (const { code } of supportedLocales) assert.ok(narrationLanguage(code))
  assert.equal(narrationLanguage('unknown'), undefined)
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
  assert.equal(selectNarrationVoice(voices, 'ja'), undefined)
  const french = [{ name: 'French', lang: 'fr-FR', default: false }]
  assert.equal(selectNarrationVoice(french, 'fr')?.lang, 'fr-FR')
  assert.equal(selectNarrationVoice(french, 'de'), undefined)
})

test('non-English narration keeps translated wording and splits local punctuation', () => {
  assert.equal(narrationText('Utilisez 2FA sur 2fa.hot.', 'fr'), 'Utilisez 2FA sur 2fa.hot.')
  assert.deepEqual(
    narrationSegments('ما هذا؟ هذا رمز.', 'ar').map((part) => part.text),
    ['ما هذا؟', 'هذا رمز.']
  )
})
