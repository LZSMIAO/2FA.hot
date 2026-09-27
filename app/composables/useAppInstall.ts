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
/** While the visitor is idle, the local-processing line fades into an invitation to install. */
const inviting = shallowRef(false)
/** The pointer rests on the invitation, which then stays until it leaves. */
const inviteHeld = shallowRef(false)
let deferred: InstallPrompt | null = null

/** Opened as the installed app rather than in a browser tab. */
export function runningAsApp() {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone
  )
}

/*
 * The same, kept up to date. Installed from a tab, the browser moves that very
 * page into the app's window, where it becomes the app without reloading; read
 * once at the start, it still took itself for a tab there.
 */
const asApp = shallowRef(false)
let followingMode = false
export function useRunningAsApp() {
  if (import.meta.client && !followingMode) {
    followingMode = true
    const read = () => (asApp.value = runningAsApp())
    read()
    matchMedia('(display-mode: standalone)').addEventListener('change', read)
    // The window can change after the install event; look again once it has.
    window.addEventListener('appinstalled', () => {
      read()
      setTimeout(read, 1000)
    })
  }
  return readonly(asApp)
}

/** Remembered for public/workspace-mode.js, which marks the page before its first paint. */
export function rememberInstallable(offered: boolean) {
  document.documentElement.toggleAttribute('data-installable', offered)
  try {
    if (offered) localStorage.setItem('2fa-install-offered', '1')
    else localStorage.removeItem('2fa-install-offered')
  } catch {}
}

export function offerInstall(event: Event) {
  // Keep the browser's own banner away; the page offers the button instead.
  event.preventDefault()
  deferred = event as InstallPrompt
  available.value = true
  rememberInstallable(true)
}

export function markInstalled() {
  deferred = null
  available.value = false
  inviting.value = false
  installed.value = true
  rememberInstallable(false)
}

export function useAppInstall() {
  async function install() {
    if (!deferred) return
    const prompt = deferred
    deferred = null
    available.value = false
    inviting.value = false
    // Declined, or refused by the browser, it offers the event again on a later visit.
    await prompt.prompt().catch(() => undefined)
    await prompt.userChoice.catch(() => undefined)
  }
  return { available: readonly(available), installed, inviting, inviteHeld, install }
}
