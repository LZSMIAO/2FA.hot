import { test } from 'node:test'
import assert from 'node:assert/strict'
import { accessEntries, accessPath, parseOtp, toAccessPath } from '../app/utils/otp.ts'

const a = parseOtp('JBSWY3DPEHPK3PXP')
const b = parseOtp(
  'otpauth://totp/Work?secret=GEZDGNBVGY3TQOJQ&digits=8&period=60&algorithm=SHA256'
)

test('one key keeps the single link; several are separated by #, each written as alone', () => {
  assert.equal(accessPath([a]), toAccessPath(a))
  assert.equal(
    accessPath([a, b]),
    '/2fa#JBSWY3DPEHPK3PXP#GEZDGNBVGY3TQOJQ?algorithm=SHA256&digits=8&period=60'
  )
})

test('commas, half- or full-width, separate keys too', () => {
  for (const fragment of [
    '#JBSWY3DPEHPK3PXP,GEZDGNBVGY3TQOJQ',
    '#JBSWY3DPEHPK3PXP，GEZDGNBVGY3TQOJQ',
    '#JBSWY3DPEHPK3PXP#GEZDGNBVGY3TQOJQ',
    '#JBSWY3DPEHPK3PXP, GEZDGNBVGY3TQOJQ'
  ])
    assert.deepEqual(
      accessEntries(fragment).map((config) => config.secret),
      ['JBSWY3DPEHPK3PXP', 'GEZDGNBVGY3TQOJQ'],
      fragment
    )
})

test('a link reads back as the same keys and settings', () => {
  const read = accessEntries(accessPath([a, b]).slice('/2fa'.length))
  assert.deepEqual(
    read.map((config) => [config.secret, config.algorithm, config.digits, config.period]),
    [
      ['JBSWY3DPEHPK3PXP', 'SHA-1', 6, 30],
      ['GEZDGNBVGY3TQOJQ', 'SHA-256', 8, 60]
    ]
  )
  assert.throws(() => accessEntries('#'), /格式不正确/)
  assert.throws(() => accessEntries('#JBSWY3DPEHPK3PXP,not a key'))
})
