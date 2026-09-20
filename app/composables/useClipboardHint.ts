export function useClipboardHint() {
  const visible = shallowRef(false)
  const seen = useState('clipboard-permission-hint-seen-v3', () => false)
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  async function start() {
    const token = ++revision
    try {
      seen.value ||= localStorage.getItem('2fa-clipboard-hint-seen-v3') === '1'
    } catch {}
    clearTimeout(timer)
    visible.value = !seen.value
    if (visible.value) {
      await nextTick()
      // Give the reminder a painted frame before native permission UI takes focus.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }
    return token
  }
  function finish(success: boolean, token = revision) {
    if (token !== revision) return
    if (success) {
      seen.value = true
      try {
        localStorage.setItem('2fa-clipboard-hint-seen-v3', '1')
      } catch {}
    }
    clearTimeout(timer)
    timer = setTimeout(
      () => {
        visible.value = false
      },
      success ? 1500 : 8000
    )
  }
  onBeforeUnmount(() => clearTimeout(timer))
  return { visible, start, finish }
}
