import assert from 'node:assert/strict'
import test from 'node:test'
import { createOtpClock } from '../app/utils/otp-clock.ts'

test('1000 OTP consumers share one timer, pause while hidden and release all resources', () => {
  let time = 29_000,
    hidden = false,
    starts = 0,
    stops = 0,
    unlistens = 0
  let tick!: () => void, visibility!: () => void
  const clock = createOtpClock({
    now: () => time,
    hidden: () => hidden,
    start: (callback) => {
      starts++
      tick = callback
      return starts as unknown as ReturnType<typeof setInterval>
    },
    stop: () => {
      stops++
    },
    listen: (callback) => {
      visibility = callback
    },
    unlisten: () => {
      unlistens++
    }
  })
  const values = Array.from({ length: 1000 }, () => [] as number[])
  const leave = values.map((v) => clock.subscribe((at) => v.push(at)))
  assert.equal(starts, 1)
  time = 29_250
  tick()
  assert.equal(values[0]!.length, 1)
  time = 30_000
  tick()
  assert.ok(values.every((v) => v.join(',') === '29000,30000'))
  hidden = true
  visibility()
  assert.equal(stops, 1)
  time = 90_000
  hidden = false
  visibility()
  assert.equal(starts, 2)
  assert.ok(values.every((v) => v.at(-1) === 90_000))
  leave.slice(0, -1).forEach((fn) => fn())
  assert.equal(stops, 1)
  leave.at(-1)!()
  assert.equal(stops, 2)
  assert.equal(unlistens, 1)
  const again = clock.subscribe(() => {})
  assert.equal(starts, 3)
  again()
})
