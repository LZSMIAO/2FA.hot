// Apply saved textures before first paint without personalizing cached HTML.
;(() => {
  try {
    const cookie = document.cookie.split('; ').find((value) => value.startsWith('2fa-panorama='))
    const raw = decodeURIComponent(cookie?.slice('2fa-panorama='.length) || '')
    // Nuxt quotes numeric-looking version strings such as 1.21 in cookies.
    const scene = raw.startsWith('"') ? JSON.parse(raw) : raw
    const root = document.documentElement
    // A custom background lives in IndexedDB, which only the page can read. Keep the
    // default faces from loading meanwhile, and lay out a still image if it is one.
    if (scene === 'custom') {
      for (let face = 0; face < 6; face++) root.style.setProperty(`--panorama-face-${face}`, 'none')
      if (localStorage.getItem('2fa-panorama-custom-layout') === 'flat')
        root.setAttribute('data-panorama-flat', '')
    } else {
      // Keep in sync with panoramaScenes in app/composables/usePanoramaPreference.ts.
      if (
        ![
          '26.3',
          '26.2',
          '26.1',
          '1.21.11',
          '1.21.9',
          '1.21.6',
          '1.21.5',
          '1.21.4',
          '1.21',
          '1.20.1',
          '1.19.4',
          '1.18.2',
          '1.17.1',
          '1.16.5',
          '1.14.4'
        ].includes(scene)
      )
        throw new Error('Unknown panorama')
      const path = `/panorama/${scene === '1.20.1' ? '' : `${scene}/`}`
      for (let face = 0; face < 6; face++) {
        root.style.setProperty(`--panorama-face-${face}`, `url(${path}panorama_${face}.webp)`)
      }
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
