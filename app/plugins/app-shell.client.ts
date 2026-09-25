import { unlocalizedPath } from '~~/shared/seo/routes'

type LaunchQueue = { setConsumer: (consumer: (params: { targetURL?: string }) => void) => void }

/**
 * The page's side of the installed app: keeps the browser's install offer for
 * the page's own button, notes an install, and, since opening the app again
 * reuses its window (launch_handler in shared/app-manifest.ts), takes a
 * shortcut to where it points while a plain launch leaves the page as it was.
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Already the app: there is nothing to install. An offer made before the app
  // started was kept by public/workspace-mode.js. It is taken up once the page
  // has hydrated: taken earlier, the page's first render already showed the
  // install button while the server's HTML had the plain icon, and the
  // mismatch left both on the page.
  if (!runningAsApp()) {
    nuxtApp.hook('app:mounted', () => {
      const early = (window as { __2faInstallOffer?: Event }).__2faInstallOffer
      if (early) offerInstall(early)
      window.addEventListener('beforeinstallprompt', offerInstall)
    })
    // No offer this time (installed from another window, say): the icon goes
    // back to the plain computer rather than promising an install.
    const settle = () =>
      setTimeout(() => {
        if (!useAppInstall().available.value) rememberInstallable(false)
      }, 5_000)
    if (document.readyState === 'complete') settle()
    else window.addEventListener('load', settle, { once: true })
  } else rememberInstallable(false)
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
