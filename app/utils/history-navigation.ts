/** Move through a newest-first snapshot; stop at either end. */
export function historyTarget(ids: readonly string[], current: string | undefined, older: boolean) {
  if (!ids.length) return undefined
  const index = current ? ids.indexOf(current) : -1
  if (index < 0) return older ? ids[0] : ids[ids.length - 1]
  return ids[Math.max(0, Math.min(ids.length - 1, index + (older ? 1 : -1)))]
}
