// Fill these only after the listings are approved. Empty IDs show the preview installation guide.
export const passkeyStoreIds = { chrome: '', edge: '' }

export function passkeyStoreUrl(browser: 'chrome' | 'edge', id: string) {
  if (!/^[a-p]{32}$/.test(id)) return ''
  return browser === 'edge'
    ? `https://microsoftedge.microsoft.com/addons/detail/${id}`
    : `https://chromewebstore.google.com/detail/${id}`
}

export function passkeyLocale(locale: string) {
  return locale === 'zh-CN' || locale === 'zh-TW' ? locale : 'en'
}

export const passkeyNames = { en: 'Passkeys', 'zh-CN': '通行密钥', 'zh-TW': '通行密鑰' }
