import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  accessEntries,
  accessLinkEntries,
  accessPath,
  parseOtp,
  sealedAccessPath
} from '../app/utils/otp.ts'
import { isSealedFragment, openFragment, sealFragment } from '../app/utils/sealed-link.ts'
import { analyzePaste, parseSmartBatch } from '../app/utils/smart-paste.ts'

const a = parseOtp('JY72ZZFTNNQFRMGY3LLYGPZFAOBXEJXD')
const b = parseOtp(
  'otpauth://totp/Work?secret=GEZDGNBVGY3TQOJQ&digits=8&period=60&algorithm=SHA256'
)
const broken = /安全链接不完整或已损坏/

test('a safe link seals exactly what the plain link carries, and shows no key', () => {
  const plain = accessPath([a, b]).slice('/2fa#'.length)
  const path = sealedAccessPath([a, b])
  assert.match(path, /^\/2fa#~[\w-]+$/)
  assert.equal(openFragment(path.slice('/2fa'.length)), plain)
  for (const secret of [a.secret, b.secret]) assert.ok(!path.includes(secret))
  // Each link has its own random key, so sealing again gives a different link.
  assert.notEqual(sealedAccessPath([a, b]), path)
  assert.ok(isSealedFragment('#~x') && isSealedFragment('~x') && !isSealedFragment('#KEY'))
})

test('safe links read back through the same readers as plain links', () => {
  const one = sealedAccessPath([a])
  assert.equal(parseOtp('https://2fa.hot' + one).secret, a.secret)
  assert.equal(parseOtp('https://2fa.hot/ja' + one).secret, a.secret)
  // Some apps percent-encode the ~ when passing a link along.
  assert.equal(parseOtp('https://2fa.hot' + one.replace('#~', '#%7E')).secret, a.secret)
  const read = accessEntries(sealedAccessPath([a, b]).slice('/2fa'.length))
  assert.deepEqual(
    read.map((config) => [config.secret, config.algorithm, config.digits, config.period]),
    [
      [a.secret, 'SHA-1', 6, 30],
      [b.secret, 'SHA-256', 8, 60]
    ]
  )
})

test('a damaged or edited safe link is refused, never read as other keys', () => {
  const fragment = sealedAccessPath([a]).slice('/2fa#'.length)
  assert.throws(() => openFragment(fragment.slice(0, -3)), broken)
  const edited = fragment.slice(0, 12) + (fragment[12] === 'A' ? 'B' : 'A') + fragment.slice(13)
  assert.throws(() => openFragment(edited), broken)
  assert.throws(() => openFragment('~'), broken)
  assert.throws(() => openFragment('~not base64!'), broken)
  assert.throws(() => openFragment('~' + 'A'.repeat(100_001)), broken)
  // A safe link never wraps another safe link.
  assert.throws(() => openFragment(sealFragment(fragment)), broken)
  assert.throws(() => parseOtp('https://2fa.hot/2fa#' + fragment.slice(0, -3)), broken)
})

test('smart paste reads plain and safe links, including several keys in one link', () => {
  const single = analyzePaste('https://2fa.hot' + sealedAccessPath([a]))
  assert.equal(single.kind, 'single')
  assert.equal(single.candidates[0]!.config.secret, a.secret)
  for (const link of [accessPath([a, b]), sealedAccessPath([a, b])]) {
    const pasted = analyzePaste('https://2fa.hot' + link)
    assert.equal(pasted.kind, 'multiple', link)
    assert.deepEqual(
      pasted.candidates.map((candidate) => [candidate.config.secret, candidate.config.digits]),
      [
        [a.secret, 6],
        [b.secret, 8]
      ]
    )
    // Inside surrounding text as well, without mistaking sealed text for a key.
    const prose = analyzePaste('打开这个 https://2fa.hot' + link + ' 就能看到')
    assert.deepEqual(
      prose.candidates.map((candidate) => candidate.config.secret),
      [a.secret, b.secret]
    )
  }
  assert.deepEqual(accessLinkEntries('https://example.com' + sealedAccessPath([a])), [])
  assert.equal(parseSmartBatch('https://2fa.hot' + sealedAccessPath([b]))[0]!.config!.digits, 8)
})
