import { test } from 'node:test'
import assert from 'node:assert/strict'
import { arrangeHistory, type HistoryItem } from '../app/utils/history-order.ts'

// a, then batch B (b1, b2, named "Work"), then c.
const list: HistoryItem[] = [
  { id: 'a' },
  { id: 'b1', batchId: 'B', batchLabel: 'Work' },
  { id: 'b2', batchId: 'B', batchLabel: 'Work' },
  { id: 'c' }
]
const shape = (items: HistoryItem[] | null) =>
  items?.map((item) => item.id + (item.batchId ? `@${item.batchId}:${item.batchLabel || ''}` : ''))

test('a record moves between others and keeps standing alone', () => {
  assert.deepEqual(shape(arrangeHistory(list, { id: 'c' }, { place: 'before', id: 'a' })), [
    'c',
    'a',
    'b1@B:Work',
    'b2@B:Work'
  ])
  assert.deepEqual(shape(arrangeHistory(list, { id: 'a' }, { place: 'after', batchId: 'B' })), [
    'b1@B:Work',
    'b2@B:Work',
    'a',
    'c'
  ])
})

test('dropping on a batch or beside its records joins it, with its name', () => {
  assert.deepEqual(shape(arrangeHistory(list, { id: 'c' }, { place: 'into', batchId: 'B' })), [
    'a',
    'c@B:Work',
    'b1@B:Work',
    'b2@B:Work'
  ])
  assert.deepEqual(shape(arrangeHistory(list, { id: 'a' }, { place: 'after', id: 'b2' })), [
    'b1@B:Work',
    'b2@B:Work',
    'a@B:Work',
    'c'
  ])
})

test('a record leaves its batch when dropped outside it, and reorders within it', () => {
  assert.deepEqual(shape(arrangeHistory(list, { id: 'b2' }, { place: 'before', id: 'a' })), [
    'b2',
    'a',
    'b1@B:Work',
    'c'
  ])
  assert.deepEqual(shape(arrangeHistory(list, { id: 'b2' }, { place: 'before', id: 'b1' })), [
    'a',
    'b2@B:Work',
    'b1@B:Work',
    'c'
  ])
})

test('a whole batch moves together and never lands inside another batch', () => {
  assert.deepEqual(shape(arrangeHistory(list, { batchId: 'B' }, { place: 'after', id: 'c' })), [
    'a',
    'c',
    'b1@B:Work',
    'b2@B:Work'
  ])
  const two: HistoryItem[] = [...list, { id: 'd1', batchId: 'D' }, { id: 'd2', batchId: 'D' }]
  // Beside a record of batch D means beside batch D as a whole.
  assert.deepEqual(shape(arrangeHistory(two, { batchId: 'B' }, { place: 'after', id: 'd1' })), [
    'a',
    'c',
    'd1@D:',
    'd2@D:',
    'b1@B:Work',
    'b2@B:Work'
  ])
  assert.deepEqual(shape(arrangeHistory(two, { batchId: 'B' }, { place: 'into', batchId: 'D' })), [
    'a',
    'c',
    'b1@B:Work',
    'b2@B:Work',
    'd1@D:',
    'd2@D:'
  ])
})

test('drops that change nothing are reported as such', () => {
  assert.equal(arrangeHistory(list, { id: 'a' }, { place: 'before', batchId: 'B' }), null)
  assert.equal(arrangeHistory(list, { id: 'b1' }, { place: 'after', id: 'b1' }), null)
  assert.equal(arrangeHistory(list, { id: 'b1' }, { place: 'into', batchId: 'B' }), null)
  assert.equal(arrangeHistory(list, { id: 'missing' }, { place: 'before', id: 'a' }), null)
})

// a, batch B (b1, b2), c, batch D (d1, d2): for dragging what is ticked.
const ticked: HistoryItem[] = [
  { id: 'a' },
  { id: 'b1', batchId: 'B', batchLabel: 'Work' },
  { id: 'b2', batchId: 'B', batchLabel: 'Work' },
  { id: 'c' },
  { id: 'd1', batchId: 'D' },
  { id: 'd2', batchId: 'D' }
]

test('ticked records move together, in list order, and can join a batch', () => {
  assert.deepEqual(
    shape(arrangeHistory(ticked, { ids: ['c', 'a'], batchIds: [] }, { place: 'after', id: 'd2' })),
    ['b1@B:Work', 'b2@B:Work', 'd1@D:', 'd2@D:', 'a@D:', 'c@D:']
  )
  assert.deepEqual(
    shape(
      arrangeHistory(ticked, { ids: ['a', 'c'], batchIds: [] }, { place: 'into', batchId: 'B' })
    ),
    ['a@B:Work', 'c@B:Work', 'b1@B:Work', 'b2@B:Work', 'd1@D:', 'd2@D:']
  )
})

test('a ticked whole batch keeps its records and never lands inside another', () => {
  const drag = { ids: ['a', 'b1', 'b2'], batchIds: ['B'] }
  assert.deepEqual(shape(arrangeHistory(ticked, drag, { place: 'into', batchId: 'D' })), [
    'c',
    'a',
    'b1@B:Work',
    'b2@B:Work',
    'd1@D:',
    'd2@D:'
  ])
  // Beside a record inside D means beside D as a whole.
  assert.deepEqual(shape(arrangeHistory(ticked, drag, { place: 'after', id: 'd1' })), [
    'c',
    'd1@D:',
    'd2@D:',
    'a',
    'b1@B:Work',
    'b2@B:Work'
  ])
})

test('a record ticked on its own leaves its batch with the others', () => {
  assert.deepEqual(
    shape(arrangeHistory(ticked, { ids: ['b1', 'c'], batchIds: [] }, { place: 'before', id: 'a' })),
    ['b1', 'c', 'a', 'b2@B:Work', 'd1@D:', 'd2@D:']
  )
})
