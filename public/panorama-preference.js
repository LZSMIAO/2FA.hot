// Apply saved textures before first paint without personalizing cached HTML.
;(() => {
  try {
    const cookie = document.cookie.split('; ').find((value) => value.startsWith('2fa-panorama='))
    const scene = decodeURIComponent(cookie?.slice('2fa-panorama='.length) || '')
    if (!['1.21', '1.20.1', '1.19.4', '1.18.2', '1.17.1', '1.16.5', '1.14.4'].includes(scene))
      return
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
})()
