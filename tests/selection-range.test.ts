import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectionRange } from '../app/utils/selection-range.ts'

const ids = ['a', 'b', 'c', 'd', 'e']
test('inclusive selection works in either direction and preserves unrelated records', () => {
  assert.deepEqual(selectionRange(ids, ['e'], 'a', 'c', true), ['a', 'b', 'c', 'e'])
  assert.deepEqual(selectionRange(ids, ['e'], 'c', 'a', true), ['a', 'b', 'c', 'e'])
})
test('dragging backwards shrinks selection against the original snapshot', () => {
  const baseline = ['e']
  selectionRange(ids, baseline, 'a', 'd', true)
  assert.deepEqual(selectionRange(ids, baseline, 'a', 'b', true), ['a', 'b', 'e'])
  assert.deepEqual(baseline, ['e'])
})
test('dragging from a checked item deselects a range', () => {
  assert.deepEqual(selectionRange(ids, ids, 'd', 'b', false), ['a', 'e'])
})
test('filtered or removed records cannot remain selected', () => {
  assert.deepEqual(selectionRange(['b', 'c'], ids, 'b', 'c', true), ['b', 'c'])
  assert.deepEqual(selectionRange(['b'], ids, 'missing', 'b', true), ['b'])
  assert.deepEqual(selectionRange([], ids, 'a', 'b', true), [])
})
