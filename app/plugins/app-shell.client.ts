import { unlocalizedPath } from '~~/shared/seo/routes'

type LaunchQueue = { setConsumer: (consumer: (params: { targetURL?: string }) => void) => void }

/**
 * The page's side of the installed app: keeps the browser's install offer for
 * the page's own button, notes an install, and, since opening the app again
 * reuses its window (launch_handler in shared/app-manifest.ts), takes a
 * shortcut to where it points while a plain launch leaves the page as it was.
 */
export default defineNuxtPlugin(() => {
  // Already the app: there is nothing to install. An offer made before the app
  // started was kept by public/workspace-mode.js.
  if (!runningAsApp()) {
    const early = (window as { __2faInstallOffer?: Event }).__2faInstallOffer
    if (early) offerInstall(early)
    window.addEventListener('beforeinstallprompt', offerInstall)
  }
  window.addEventListener('appinstalled', markInstalled)
  const queue = (window as { launchQueue?: LaunchQueue }).launchQueue
  queue?.setConsumer(({ targetURL }) => {
    if (!targetURL) return
    const url = new URL(targetURL)
    if (!url.searchParams.has('shortcut') && unlocalizedPath(url.pathname) === '/') return
    if (url.pathname + url.search === location.pathname + location.search) return
    void navigateTo(url.pathname + url.search)
  })
})
