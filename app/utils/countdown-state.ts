export function countdownState(active: boolean, remaining: number, period: number) {
  if (!active || !Number.isFinite(remaining) || !Number.isFinite(period) || period <= 0)
    return 'idle'
  if (remaining <= 5) return 'urgent'
  return remaining <= period / 3 ? 'warning' : 'normal'
}
