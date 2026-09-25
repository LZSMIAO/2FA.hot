/**
 * Whether the device has a network at all. navigator.onLine is only certain
 * when it says offline, so the page shows the offline state and nothing more.
 */
const online = shallowRef(true)
let listening = false

export function useNetworkStatus() {
  onMounted(() => {
    online.value = navigator.onLine
    if (listening) return
    listening = true
    window.addEventListener('online', () => (online.value = true))
    window.addEventListener('offline', () => (online.value = false))
  })
  return { online: readonly(online) }
}
