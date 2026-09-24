/**
 * History rows can be dragged by their key: a record between others, into or
 * out of a batch, or a whole batch at once. These work on the list as shown,
 * group by group, and return it in its new order with each record's batch.
 */
export interface HistoryItem {
  id: string
  batchId?: string
  batchLabel?: string
}
export type HistoryDrag = { id: string } | { batchId: string }
export type HistoryDrop =
  /** Beside a record, joining whatever batch that record is in. */
  | { place: 'before' | 'after'; id: string }
  /** Beside a whole batch, outside it. */
  | { place: 'before' | 'after'; batchId: string }
  /** Into a batch, as its first record. */
  | { place: 'into'; batchId: string }

function outsideBatch({ id }: HistoryItem): HistoryItem {
  return { id }
}

/** Returns null when the drop would change nothing. */
export function arrangeHistory(
  ordered: readonly HistoryItem[],
  drag: HistoryDrag,
  drop: HistoryDrop
): HistoryItem[] | null {
  const moving = ordered.filter((item) =>
    'id' in drag ? item.id === drag.id : item.batchId === drag.batchId
  )
  if (!moving.length) return null
  const movingIds = new Set(moving.map((item) => item.id))
  const rest = ordered.filter((item) => !movingIds.has(item.id))
  const batchRange = (batchId: string) => {
    const first = rest.findIndex((item) => item.batchId === batchId)
    let last = first
    while (last + 1 < rest.length && rest[last + 1]!.batchId === batchId) last++
    return first < 0 ? null : { first, last }
  }
  let index: number
  let placed: HistoryItem[]
  if ('id' in drop) {
    const target = rest.findIndex((item) => item.id === drop.id)
    if (target < 0) return null
    const batchId = rest[target]!.batchId
    if ('batchId' in drag && batchId) {
      // A batch never nests: beside a batched record means beside its batch.
      const range = batchRange(batchId)!
      index = drop.place === 'before' ? range.first : range.last + 1
      placed = moving
    } else {
      index = target + (drop.place === 'after' ? 1 : 0)
      placed =
        'batchId' in drag
          ? moving
          : moving.map((item) =>
              batchId ? { id: item.id, batchId, ...batchName(rest, batchId) } : outsideBatch(item)
            )
    }
  } else {
    const range = batchRange(drop.batchId)
    if (!range) return null
    if (drop.place === 'into' && 'id' in drag) {
      index = range.first
      placed = moving.map((item) => ({
        id: item.id,
        batchId: drop.batchId,
        ...batchName(rest, drop.batchId)
      }))
    } else {
      index = drop.place === 'after' ? range.last + 1 : range.first
      placed = 'id' in drag ? moving.map(outsideBatch) : moving
    }
  }
  const next = [...rest.slice(0, index), ...placed, ...rest.slice(index)]
  const same =
    next.length === ordered.length &&
    next.every(
      (item, i) =>
        item.id === ordered[i]!.id &&
        (item.batchId || '') === (ordered[i]!.batchId || '') &&
        (item.batchLabel || '') === (ordered[i]!.batchLabel || '')
    )
  return same ? null : next
}

/** Every record of a batch carries its name; one joining it takes the same. */
function batchName(items: readonly HistoryItem[], batchId: string) {
  const batchLabel = items.find((item) => item.batchId === batchId && item.batchLabel)?.batchLabel
  return batchLabel ? { batchLabel } : {}
}
