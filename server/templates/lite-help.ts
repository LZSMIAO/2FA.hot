import { supportedLocales, type SupportedLocale } from '../../shared/locales'
import { escapeLiteText } from '../../shared/lite-language'
import { liteContent } from '../utils/lite-content'

export type LiteLanguage = SupportedLocale
export function liteHelp(language: LiteLanguage) {
  const { ui, help: copy } = liteContent(language)
  const direction = supportedLocales.find((item) => item.code === language)!.dir
  const escape = escapeLiteText
  return `<!doctype html><html lang="${language}" dir="${direction}"><head><meta charset="utf-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(copy.title)} · 2fa.hot</title><link rel="icon" href="data:,"><script src="/lite-assets/theme.js?v=1"></script><link rel="stylesheet" href="/lite-assets/style.css?v=7"></head><body><main class="page guide"><a href="/lite?lang=${language}">${escape(copy.back)}</a><nav class="languages" aria-label="${escape(ui.language!)}">${supportedLocales.map((item) => `<a href="?lang=${item.code}" lang="${item.language}" dir="${item.dir}"${item.code === language ? ' aria-current="page"' : ''}>${item.name}</a>`).join(' · ')}</nav><h1>${escape(copy.title)}</h1>${copy.sections.map(([title, body]) => `<section><h2>${escape(title!)}</h2><p>${escape(body!)}</p></section>`).join('')}<footer class="footer"><a href="https://github.com/LZSMIAO/2fa-hot" target="_blank" rel="noopener noreferrer">${escape(ui.source!)}</a>2fa.hot Lite<strong class="compatibility">${escape(ui.compatibility!)}</strong></footer></main></body></html>`
}
