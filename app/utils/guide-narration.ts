import { supportedLocales } from '../../shared/locales.ts'

export function narrationLanguage(locale: string): string | undefined {
  if (locale === 'en') return 'en-US'
  return supportedLocales.some((item) => item.code === locale) ? locale : undefined
}

export function narrationText(text: string, language = 'en-US'): string {
  const chinese = language.startsWith('zh')
  if (!chinese && !language.startsWith('en')) return text
  return text
    .replace(/2fa\.hot/gi, chinese ? '本站' : 'this website')
    .replace(/Google Authenticator/gi, chinese ? '谷歌验证器' : 'Google Authenticator')
    .replace(/Authenticator/gi, chinese ? '验证器' : 'Authenticator')
    .replace(/2fa/gi, chinese ? '双重验证' : 'two factor authentication')
    .replace(/\bApp\b/gi, chinese ? '应用' : 'app')
    .replace(/\bQR\b/gi, chinese ? '二维' : 'Q R')
}

export function narrationSegments(text: string, language: string) {
  return (narrationText(text, language).match(/[^。！？.!?؟۔।]+[。！？.!?؟۔।]?/g) || [])
    .flatMap((sentence) => sentence.match(/.{1,140}/gu) || [])
    .map((text) => ({ text: text.trim(), language }))
    .filter((segment) => segment.text)
}

type Voice = { lang: string; name: string; default: boolean }
export function selectNarrationVoice<T extends Voice>(
  voices: T[],
  language: string
): T | undefined {
  const target = language.toLowerCase().replaceAll('_', '-')
  return voices
    .filter((voice) => {
      const lang = voice.lang.toLowerCase().replaceAll('_', '-')
      return (
        lang === target || (!target.startsWith('zh') && lang.split('-')[0] === target.split('-')[0])
      )
    })
    .map((voice) => ({
      voice,
      score:
        (voice.lang.toLowerCase().replaceAll('_', '-') === target ? 100 : 0) +
        (/natural|neural|premium|enhanced/i.test(voice.name) ? 30 : 0) +
        (/google|xiaoxiao|xiaoyi|hsiaochen|tingting|meijia|samantha/i.test(voice.name) ? 20 : 0) +
        (voice.default ? 5 : 0)
    }))
    .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name))[0]?.voice
}
