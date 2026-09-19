import { test } from 'node:test'
import assert from 'node:assert/strict'
import { historyTarget } from '../app/utils/history-navigation.ts'

test('arrows traverse newest-first history in both directions without wrapping', () => {
  const ids = ['newest', 'middle', 'oldest']
  assert.equal(historyTarget(ids, undefined, true), 'newest')
  assert.equal(historyTarget(ids, 'newest', true), 'middle')
  assert.equal(historyTarget(ids, 'middle', false), 'newest')
  assert.equal(historyTarget(ids, 'oldest', true), 'oldest')
  assert.equal(historyTarget(ids, 'newest', false), 'newest')
})
test('empty and removed records do not produce an invalid target', () => {
  assert.equal(historyTarget([], undefined, true), undefined)
  assert.equal(historyTarget(['remaining'], 'removed', true), 'remaining')
  assert.equal(historyTarget(['newest', 'oldest'], undefined, false), 'oldest')
})
