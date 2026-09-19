import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countdownState } from '../app/utils/countdown-state.ts'

test('30-second countdown warns after two thirds and becomes urgent for the last five seconds', () => {
  for (const [remaining, state] of [
    [30, 'normal'],
    [11, 'normal'],
    [10, 'warning'],
    [6, 'warning'],
    [5, 'urgent'],
    [1, 'urgent'],
    [0, 'urgent'],
    [30, 'normal']
  ] as const)
    assert.equal(countdownState(true, remaining, 30), state)
})

test('warning scales with the configured period but urgency always starts at five seconds', () => {
  assert.equal(countdownState(true, 21, 60), 'normal')
  assert.equal(countdownState(true, 20, 60), 'warning')
  assert.equal(countdownState(true, 6, 60), 'warning')
  assert.equal(countdownState(true, 5, 60), 'urgent')
  assert.equal(countdownState(true, 6, 15), 'normal')
  assert.equal(countdownState(true, 5, 15), 'urgent')
})

test('empty or invalid countdowns never show urgency', () => {
  assert.equal(countdownState(false, 1, 30), 'idle')
  assert.equal(countdownState(true, NaN, 30), 'idle')
  assert.equal(countdownState(true, 5, 0), 'idle')
  assert.equal(countdownState(true, 5, Infinity), 'idle')
})
