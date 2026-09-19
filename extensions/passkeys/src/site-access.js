// The website bridge exposes installation status and opens the extension's own UI only.
export function isCompanionOrigin(origin) {
  try {
    const url = new URL(origin)
    return (
      url.origin === 'https://2fa.hot' ||
      (!(typeof __PASSKEYS_STORE_BUILD__ !== 'undefined' && __PASSKEYS_STORE_BUILD__) &&
        url.hostname === 'localhost' &&
        ['http:', 'https:'].includes(url.protocol))
    )
  } catch {
    return false
  }
}
