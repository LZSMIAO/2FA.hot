import { generateOtp, remainingSeconds, identity, type OtpConfig } from '~/utils/otp'
import { otpClock } from '~/utils/otp-clock'
export interface OtpDisplaySnapshot {
  config: OtpConfig
  code: string
  at: number
}
export function useOtp(config: Ref<OtpConfig | null>, initial?: OtpDisplaySnapshot | null) {
  function initialCode() {
    const c = config.value
    return initial &&
      c &&
      identity(initial.config) === identity(c) &&
      Math.floor(initial.at / (c.period * 1000)) === Math.floor(Date.now() / (c.period * 1000))
      ? initial.code
      : ''
  }
  const generatedAt = shallowRef(initial?.at ?? 0)
  const code = shallowRef(initialCode()),
    error = shallowRef(''),
    now = shallowRef(import.meta.client ? Date.now() : 0),
    busy = shallowRef(false)
  const remaining = computed(() =>
    config.value ? remainingSeconds(config.value.period, now.value) : 0
  )
  const progress = computed(() =>
    config.value ? (remaining.value / config.value.period) * 100 : 0
  )
  let generation = 0,
    unsubscribe: (() => void) | undefined,
    active = true
  async function update() {
    now.value = Date.now()
    const c = config.value,
      id = ++generation
    if (!c) {
      code.value = ''
      error.value = ''
      busy.value = false
      return
    }
    busy.value = true
    try {
      const at = now.value
      const result = await generateOtp(c, at)
      if (id === generation && active) {
        code.value = result
        generatedAt.value = at
        error.value = ''
      }
    } catch (e) {
      if (id === generation && active) {
        code.value = ''
        error.value = (e as Error).message
      }
    } finally {
      if (id === generation) busy.value = false
    }
  }
  watch(
    config,
    () => {
      code.value = initialCode()
      if (import.meta.client) update()
    },
    { flush: 'sync' }
  )
  function tick(at: number) {
    const old = now.value
    now.value = at
    const c = config.value
    if (c && Math.floor(old / 1000 / c.period) !== Math.floor(now.value / 1000 / c.period)) update()
  }
  onMounted(() => {
    update()
    unsubscribe = otpClock.subscribe(tick)
  })
  onBeforeUnmount(() => {
    active = false
    generation++
    unsubscribe?.()
  })
  async function current() {
    const c = config.value
    if (!c) throw new Error('请先输入有效密钥。')
    for (;;) {
      const at = Date.now()
      const result = await generateOtp(c, at)
      if (!active || config.value !== c) throw new Error('输入已变化，请重新复制。')
      // If generation crossed a time step, copy the new code rather than an expired one.
      if (Math.floor(at / (c.period * 1000)) !== Math.floor(Date.now() / (c.period * 1000)))
        continue
      if (at >= generatedAt.value) {
        code.value = result
        generatedAt.value = at
      }
      return result
    }
  }
  return { code, error, remaining, progress, busy, current, generatedAt }
}
