// Apply saved textures before first paint without personalizing cached HTML.
;(() => {
  try {
    const cookie = document.cookie.split('; ').find((value) => value.startsWith('2fa-panorama='))
    const raw = decodeURIComponent(cookie?.slice('2fa-panorama='.length) || '')
    // Nuxt quotes numeric-looking version strings such as 1.21 in cookies.
    const scene = raw.startsWith('"') ? JSON.parse(raw) : raw
    if (!['1.21', '1.20.1', '1.19.4', '1.18.2', '1.17.1', '1.16.5', '1.14.4'].includes(scene))
      throw new Error('Unknown panorama')
    const path = `/panorama/${scene === '1.20.1' ? '' : `${scene}/`}`
    for (let face = 0; face < 6; face++) {
      document.documentElement.style.setProperty(
        `--panorama-face-${face}`,
        `url(${path}panorama_${face}.png)`
      )
    }
  } catch {
    // Missing or malformed preferences use the static default.
  }
  try {
    const angle = Number(localStorage.getItem('2fa-panorama-angle'))
    if (Number.isFinite(angle) && angle >= 0 && angle < 360)
      document.documentElement.style.setProperty('--panorama-angle', `${angle}deg`)
  } catch {
    // Storage can be unavailable; start at the default angle.
  }
})()
