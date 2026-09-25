/**
 * A NEW mark on a control for a new feature, shown until this browser opens it
 * once, or until the feature is no longer new.
 */
const features = {
  // Custom images and the Senren＊Banka stills, launched 2026-09-25.
  backdrop: '2026-10-25'
} satisfies Record<string, string>

export function useNewBadge(feature: keyof typeof features) {
  const storageKey = `2fa-new-seen-${feature}`
  const visible = useState(`new-badge-${feature}`, () => false)
  onMounted(() => {
    try {
      visible.value =
        Date.now() < new Date(`${features[feature]}T00:00:00`).getTime() &&
        localStorage.getItem(storageKey) !== '1'
    } catch {
      // Without storage it could not go away once seen, so it stays hidden.
    }
  })
  /** Called once a menu showing the mark closes, so it is seen before it goes. */
  function seen() {
    if (!visible.value) return
    visible.value = false
    try {
      localStorage.setItem(storageKey, '1')
    } catch {}
  }
  return { visible: readonly(visible), seen }
}
