/**
 * History rows can be dragged by their key: a record between others, into or
 * out of a batch, a whole batch at once, or everything that is ticked. These
 * work on the list as shown, group by group, and return it in its new order
 * with each record's batch.
 */
export interface HistoryItem {
  id: string
  batchId?: string
  batchLabel?: string
}
export type HistoryDrag =
  | { id: string }
  | { batchId: string }
  /**
   * Several records together, as ticked. A batch listed in batchIds moves as
   * a whole and keeps its records; the rest move like one dragged record.
   */
  | { ids: readonly string[]; batchIds: readonly string[] }
export type HistoryDrop =
  /** Beside a record, joining whatever batch that record is in. */
  | { place: 'before' | 'after'; id: string }
  /** Beside a whole batch, outside it. */
  | { place: 'before' | 'after'; batchId: string }
  /** Into a batch, as its first record. */
  | { place: 'into'; batchId: string }

/** The records a drag moves, and the batches that move as a whole. */
export function draggedRecords(ordered: readonly HistoryItem[], drag: HistoryDrag) {
  if ('batchId' in drag)
    return {
      ids: new Set(ordered.filter((item) => item.batchId === drag.batchId).map((item) => item.id)),
      wholeBatches: new Set([drag.batchId])
    }
  if ('id' in drag) return { ids: new Set([drag.id]), wholeBatches: new Set<string>() }
  return { ids: new Set(drag.ids), wholeBatches: new Set(drag.batchIds) }
}

/** Returns null when the drop would change nothing. */
export function arrangeHistory(
  ordered: readonly HistoryItem[],
  drag: HistoryDrag,
  drop: HistoryDrop
): HistoryItem[] | null {
  const { ids, wholeBatches } = draggedRecords(ordered, drag)
  const moving = ordered.filter((item) => ids.has(item.id))
  if (!moving.length) return null
  const rest = ordered.filter((item) => !ids.has(item.id))
  // Batches never nest: while one moves whole, nothing lands inside another.
  const outsideOnly = wholeBatches.size > 0
  const batchRange = (batchId: string) => {
    const first = rest.findIndex((item) => item.batchId === batchId)
    let last = first
    while (last + 1 < rest.length && rest[last + 1]!.batchId === batchId) last++
    return first < 0 ? null : { first, last }
  }
  let index: number
  /** The batch the loose records land in, if any. */
  let joins: string | undefined
  if ('id' in drop) {
    const target = rest.findIndex((item) => item.id === drop.id)
    if (target < 0) return null
    const batchId = rest[target]!.batchId
    if (outsideOnly && batchId) {
      // Beside a batched record means beside its batch.
      const range = batchRange(batchId)!
      index = drop.place === 'before' ? range.first : range.last + 1
    } else {
      index = target + (drop.place === 'after' ? 1 : 0)
      joins = batchId
    }
  } else {
    const range = batchRange(drop.batchId)
    if (!range) return null
    if (drop.place === 'into' && !outsideOnly) {
      index = range.first
      joins = drop.batchId
    } else index = drop.place === 'after' ? range.last + 1 : range.first
  }
  const placed = moving.map((item): HistoryItem => {
    if (item.batchId && wholeBatches.has(item.batchId)) return item
    return joins ? { id: item.id, batchId: joins, ...batchName(rest, joins) } : { id: item.id }
  })
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
