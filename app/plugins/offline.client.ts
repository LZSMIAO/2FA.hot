/**
 * With offline mode on, each visit moves the worker to this build, so a new
 * deploy is kept while online, before it is needed offline. Off, it does
 * nothing: no worker is registered unless a visitor turns offline mode on.
 */
export default defineNuxtPlugin(() => {
  if (!('serviceWorker' in navigator)) return
  onNuxtReady(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/').catch(() => undefined)
    if (!registration?.active?.scriptURL.includes('/sw.js')) return
    navigator.serviceWorker.register(offlineWorkerUrl(), { scope: '/' }).catch(() => {})
  })
})
