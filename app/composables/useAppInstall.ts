/**
 * Installing the site as an app. Chromium browsers offer it through
 * beforeinstallprompt, which app/plugins/app-shell.client.ts keeps so the
 * page can offer its own install button; Safari has no such event.
 */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const available = shallowRef(false)
/** Set when the app was installed during this visit. */
const installed = shallowRef(false)
let deferred: InstallPrompt | null = null

/** Opened as the installed app rather than in a browser tab. */
export function runningAsApp() {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  )
}

export function offerInstall(event: Event) {
  // Keep the browser's own banner away; the page offers the button instead.
  event.preventDefault()
  deferred = event as InstallPrompt
  available.value = true
}

export function markInstalled() {
  deferred = null
  available.value = false
  installed.value = true
}

export function useAppInstall() {
  async function install() {
    if (!deferred) return
    const prompt = deferred
    deferred = null
    available.value = false
    await prompt.prompt()
    // Declined, the browser offers the event again on a later visit.
    await prompt.userChoice.catch(() => undefined)
  }
  return { available: readonly(available), installed, install }
}
