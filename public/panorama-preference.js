// Apply saved textures before first paint without personalizing cached HTML.
;(() => {
  const savedScene = () => {
    const cookie = document.cookie.split('; ').find((value) => value.startsWith('2fa-panorama='))
    const raw = decodeURIComponent(cookie?.slice('2fa-panorama='.length) || '')
    // Nuxt quotes numeric-looking version strings such as 1.21 in cookies.
    return raw.startsWith('"') ? JSON.parse(raw) : raw
  }
  // A new visitor - first-visit.js found no earlier settings and no angle is kept yet -
  // opens on the 26.1 cherry grove, turned so blossom fills the top with a bee and a fox
  // either side of the tool. The server writes the old default, 1.20.1, with the first
  // page, so that counts as no choice. It is saved as the visitor's own setting, so the
  // page and later visits agree. Returning visitors keep what they had.
  try {
    if (
      localStorage.getItem('2fa-first-visit') !== '0' &&
      localStorage.getItem('2fa-panorama-angle') === null &&
      // Keep in sync with defaultPanoramaScene in app/composables/usePanoramaPreference.ts.
      ['', '1.20.1'].includes(savedScene())
    ) {
      // Quoted as Nuxt writes it: unquoted, 26.1 would read back as a number.
      document.cookie = '2fa-panorama=%2226.1%22; max-age=31536000; path=/; samesite=lax'
      if (savedScene() === '26.1') localStorage.setItem('2fa-panorama-angle', '90')
    }
  } catch {
    // Without storage there is no telling a new visitor; the static default stays.
  }
  try {
    const scene = savedScene()
    const root = document.documentElement
    // Keep in sync with senrenScenes in app/composables/usePanoramaPreference.ts.
    const flat = {
      'senren/rena-stars': '32% 30%',
      'senren/koharu-haori': '21% 18%',
      'senren/mako-ninja': '30% 30%',
      'senren/yoshino-ears': '43% 50%',
      'senren/roka-teahouse': '62% 24%',
      'senren/yoshino-kagura': '52% 15%',
      'senren/mako-feeding': '50% 40%',
      'senren/murasame-sword': '68% 30%',
      'senren/roka-parfait': '62% 24%',
      'senren/rena-yukata': '33% 24%',
      'senren/koharu-lean': '55% 30%',
      'senren/murasame-kiss': '47% 45%'
    }
    // A custom background lives in IndexedDB, which cannot be read before the first
    // paint. Keep the default faces from loading, lay out a still image if it is one,
    // and paint the few-kilobyte preview saved with the upload meanwhile (see
    // customPreviewKey in app/utils/custom-panorama.ts).
    if (scene === 'custom') {
      const flatLayout = localStorage.getItem('2fa-panorama-custom-layout') === 'flat'
      if (flatLayout) root.setAttribute('data-panorama-flat', '')
      const paint = (urls) => {
        if (flatLayout)
          root.style.setProperty('--panorama-flat', urls[0] ? `url(${urls[0]})` : 'none')
        else
          for (let face = 0; face < 6; face++)
            root.style.setProperty(
              `--panorama-face-${face}`,
              urls[face] ? `url(${urls[face]})` : 'none'
            )
      }
      let previews = []
      try {
        previews = JSON.parse(localStorage.getItem('2fa-panorama-custom-preview') || '[]')
      } catch {}
      paint(Array.isArray(previews) ? previews : [])
      // Read the images now rather than once the app has started; TitlePanorama
      // takes this promise and keeps using the same object URLs. It settles on
      // null when nothing is stored, and on undefined when it could not read, so
      // the page tries again itself.
      // Keep in sync with openDatabase in app/utils/custom-panorama.ts.
      window.__2faCustomPanorama = new Promise((resolve) => {
        let request
        try {
          request = indexedDB.open('2fa-custom-panorama', 1)
        } catch {
          return resolve(undefined)
        }
        request.onupgradeneeded = () => request.result.createObjectStore('backgrounds')
        request.onerror = () => resolve(undefined)
        request.onsuccess = () => {
          const db = request.result
          let read
          try {
            read = db.transaction('backgrounds').objectStore('backgrounds').get('current')
          } catch {
            db.close()
            return resolve(undefined)
          }
          read.onerror = () => {
            db.close()
            resolve(undefined)
          }
          read.onsuccess = () => {
            db.close()
            const value = read.result
            if (!value || (value.layout !== 'cube' && value.layout !== 'flat')) return resolve(null)
            let urls
            try {
              urls = value.images.map((image) => URL.createObjectURL(image))
            } catch {
              // A malformed record would leave the app waiting on this forever;
              // it reads storage itself instead.
              return resolve(undefined)
            }
            resolve({ layout: value.layout, images: value.images, urls })
            // Swap in only once decoded, so the preview never gives way to a blank.
            Promise.all(
              urls.map((url) => {
                const image = new Image()
                image.src = url
                return image.decode()
              })
            ).then(
              () => {
                // Unless the visitor picked another scene in the meantime.
                if (savedScene() === 'custom') paint(urls)
              },
              () => {}
            )
          }
        }
      })
    } else if (Object.prototype.hasOwnProperty.call(flat, scene)) {
      // A still built-in scene: one image in place of the cube, cropped around its subject.
      for (let face = 0; face < 6; face++) root.style.setProperty(`--panorama-face-${face}`, 'none')
      root.setAttribute('data-panorama-flat', '')
      root.style.setProperty('--panorama-flat', `url(/panorama/${scene}.webp)`)
      root.style.setProperty('--panorama-flat-position', flat[scene])
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
