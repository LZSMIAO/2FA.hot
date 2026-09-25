/**
 * Offline mode: public/sw.js keeps this site's own files so the tool opens
 * and generates codes with no network. It is off until a visitor turns it on,
 * except that the installed app turns it on by itself once (OfflineToggle.vue);
 * turning it off removes the worker and every file it kept.
 */
export type OfflineStatus = 'off' | 'saving' | 'ready' | 'error'

const worker = '/sw.js'
const cachePrefix = '2fa-offline'
const configCache = '2fa-offline-config'
const configKey = '/__offline/config'
// Loaded media the offline copy should keep: the current backdrop, for one.
const mediaPath = /^\/(?:panorama|textures|audio|fonts|skins|art)\//

const status = shallowRef<OfflineStatus>('off')
const progress = shallowRef(0)
const supported = shallowRef(true)
/** Set when saving finishes in this visit, for a moment of confirmation. */
const justSaved = shallowRef(false)
let checked = false

const ours = (registration: ServiceWorkerRegistration) =>
  [registration.active, registration.waiting, registration.installing].some((item) =>
    item?.scriptURL.includes(worker)
  )

async function prepared() {
  try {
    return !!(await (await caches.open(configCache)).match(configKey))
  } catch {
    return false
  }
}

function mediaInUse() {
  const urls = new Set<string>()
  for (const entry of performance.getEntriesByType('resource')) {
    const url = new URL(entry.name)
    if (url.origin === location.origin && mediaPath.test(url.pathname)) urls.add(url.pathname)
  }
  return [...urls]
}

/** The worker at this build's address, so a new deploy registers as an update. */
export const offlineWorkerUrl = () => `${worker}?build=${useRuntimeConfig().app.buildId}`

export function useOfflineMode() {
  const { locale } = useI18n()
  const localePath = useLocalePath()

  async function prepare() {
    status.value = 'saving'
    progress.value = 0
    justSaved.value = false
    try {
      await navigator.serviceWorker.register(offlineWorkerUrl(), { scope: '/' })
      const registration = await navigator.serviceWorker.ready
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel()
        // A worker the browser stops mid-way never answers.
        const timeout = setTimeout(() => reject(new Error('timeout')), 180_000)
        channel.port1.onmessage = ({ data }) => {
          if (data?.type === 'progress') progress.value = Math.floor((data.done / data.total) * 100)
          if (data?.type === 'ready' || data?.type === 'error') {
            clearTimeout(timeout)
            if (data.type === 'ready') resolve()
            else reject(new Error(data.message))
          }
        }
        registration.active!.postMessage(
          { type: 'prepare', locale: locale.value, home: localePath('/'), media: mediaInUse() },
          [channel.port2]
        )
      })
      status.value = 'ready'
      justSaved.value = true
    } catch {
      status.value = 'error'
    }
  }

  async function enable() {
    if (!supported.value || status.value === 'saving') return
    await prepare()
  }

  async function disable() {
    status.value = 'off'
    justSaved.value = false
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.filter(ours).map((item) => item.unregister()))
      for (const name of await caches.keys())
        if (name.startsWith(cachePrefix)) await caches.delete(name)
    } catch {}
  }

  /** Reads whether offline mode is on in this browser, once per visit. */
  async function check() {
    if (checked) return
    checked = true
    if (!('serviceWorker' in navigator) || !window.isSecureContext || !('caches' in window)) {
      supported.value = false
      return
    }
    const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
    if (!registration || !ours(registration)) return
    if (await prepared()) status.value = 'ready'
    // Turned on, but the files were never all kept: finish now.
    else if (navigator.onLine) await prepare()
    else status.value = 'error'
  }

  return {
    status: readonly(status),
    progress: readonly(progress),
    supported: readonly(supported),
    justSaved,
    check,
    enable,
    disable
  }
}
