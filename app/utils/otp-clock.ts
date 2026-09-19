interface ClockHost {
  now: () => number
  hidden: () => boolean
  start: (tick: () => void) => ReturnType<typeof setInterval>
  stop: (timer: ReturnType<typeof setInterval>) => void
  listen: (callback: () => void) => void
  unlisten: (callback: () => void) => void
}

/** One clock for all visible OTP consumers; no browser work until subscribed. */
export function createOtpClock(host: ClockHost) {
  const listeners = new Set<(at: number) => void>()
  let timer: ReturnType<typeof setInterval> | undefined
  let lastSecond = -1
  function tick() {
    const at = host.now()
    const second = Math.floor(at / 1000)
    if (second === lastSecond) return
    lastSecond = second
    for (const listener of listeners) listener(at)
  }
  function visibility() {
    if (timer !== undefined) host.stop(timer)
    timer = undefined
    if (host.hidden()) return
    lastSecond = -1
    tick()
    timer = host.start(tick)
  }
  return {
    subscribe(listener: (at: number) => void) {
      listeners.add(listener)
      if (listeners.size === 1) {
        host.listen(visibility)
        visibility()
      } else listener(host.now())
      return () => {
        listeners.delete(listener)
        if (listeners.size) return
        if (timer !== undefined) host.stop(timer)
        timer = undefined
        lastSecond = -1
        host.unlisten(visibility)
      }
    }
  }
}

export const otpClock = createOtpClock({
  now: () => Date.now(),
  hidden: () => document.hidden,
  start: (tick) => setInterval(tick, 250),
  stop: (timer) => clearInterval(timer),
  listen: (callback) => document.addEventListener('visibilitychange', callback),
  unlisten: (callback) => document.removeEventListener('visibilitychange', callback)
})
