/** Apply an inclusive range to a snapshot, keeping unrelated selections intact. */
export function selectionRange(
  ids: readonly string[],
  baseline: readonly string[],
  start: string,
  end: string,
  checked: boolean
): string[] {
  const a = ids.indexOf(start)
  const b = ids.indexOf(end)
  if (a < 0 || b < 0) return baseline.filter((id) => ids.includes(id))
  const result = new Set(baseline)
  for (const id of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) {
    if (checked) result.add(id)
    else result.delete(id)
  }
  return ids.filter((id) => result.has(id))
}
