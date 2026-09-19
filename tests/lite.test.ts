import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import vm from 'node:vm'
import test from 'node:test'

// No Web Crypto, typed arrays, Promise or modern URL APIs: IE11's fallback path.
const context = vm.createContext({
  Uint8Array: undefined,
  ArrayBuffer: undefined,
  Promise: undefined,
  crypto: undefined,
  URL: undefined,
  URLSearchParams: undefined
})
for (const file of ['sha.js', 'otp.js']) {
  vm.runInContext(
    readFileSync(new URL('../public/lite-assets/' + file, import.meta.url), 'utf8'),
    context
  )
}
const otp = context.LiteOTP
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
function base32(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = '',
    result = ''
  for (const byte of Buffer.from(value)) bits += byte.toString(2).padStart(8, '0')
  for (let i = 0; i < bits.length; i += 5)
    result += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]
  return result
}
test('Lite matches every RFC 6238 SHA-1, SHA-256 and SHA-512 test vector', () => {
  const times = [59, 1111111109, 1111111111, 1234567890, 2000000000, 20000000000]
  const expected = [
    ['94287082', '07081804', '14050471', '89005924', '69279037', '65353130'],
    ['46119246', '68084774', '67062674', '91819424', '90698825', '77737706'],
    ['90693936', '25091201', '99943326', '93441116', '38618901', '47863826']
  ]
  for (const [index, size] of [20, 32, 64].entries()) {
    const key = base32('1234567890'.repeat(7).slice(0, size))
    const config = otp.parse(key, { algorithm: ['SHA-1', 'SHA-256', 'SHA-512'][index], digits: 8 })
    for (const [i, seconds] of times.entries())
      assert.equal(otp.code(config, seconds * 1000), expected[index][i])
  }
})
test('Lite separates structured defaults from previous manual settings and round-trips fragments', () => {
  const config = otp.parse('otpauth://totp/Test?secret=' + secret, {
    algorithm: 'SHA-512',
    digits: 8,
    period: 60
  })
  assert.equal(config.algorithm, 'SHA-1')
  assert.equal(config.digits, 6)
  assert.equal(config.period, 30)
  const custom = otp.parse(secret, { algorithm: 'SHA-256', digits: 8, period: 60 })
  for (const prefix of ['', 'https://2fa.hot/2fa', 'http://localhost:3001/lite']) {
    assert.equal(JSON.stringify(otp.parse(prefix + otp.fragment(custom))), JSON.stringify(custom))
  }
})
test('Lite refuses multiple records, unsupported types and ambiguous parameters', () => {
  for (const input of [
    secret + '\n' + secret,
    'otpauth://hotp/Test?secret=' + secret,
    '#' + secret + '?digits=6&digits=8',
    '#' + secret + '?period=',
    '#' + secret + '?period=0',
    '#' + secret + '?digits=7',
    '#' + secret + '?algorithm=MD5',
    '/2fa/' + secret,
    'A'.repeat(17),
    secret + '!',
    '#' + secret + '?secret=' + secret
  ])
    assert.throws(() => otp.parse(input), input)
  assert.equal(
    otp.parse(
      secret
        .toLowerCase()
        .match(/.{1,4}/g)!
        .join(' ')
    ).secret,
    secret
  )
})
test('Lite page assets stay below 50 KiB gzipped and have no app runtime or form submission', () => {
  const html = readFileSync(new URL('../server/templates/lite.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(html, /<form|_nuxt|type="module"|https?:\/\/.*\.js/)
  const assets = ['theme.js', 'sha.js', 'otp.js', 'paste.js', 'ui.js', 'style.css'].map((file) =>
    readFileSync(new URL('../public/lite-assets/' + file, import.meta.url))
  )
  const bytes = [Buffer.from(html), ...assets].reduce(
    (sum, content) => sum + gzipSync(content).length,
    0
  )
  assert.ok(bytes < 50 * 1024, String(bytes))
})

test('Lite smart paste preserves rows and only associates unambiguous accounts', () => {
  context.window = context
  vm.runInContext(
    readFileSync(new URL('../public/lite-assets/paste.js', import.meta.url), 'utf8'),
    context
  )
  const analyze = context.LitePaste.analyze
  const a = 'ixrn hqfa f3nf m5zx cqm2 buwe spni uzxe'
  const b = 'al77 bst4 yldg xtud a4jm 5z2t xfnb wwaq'
  assert.equal(analyze(a + '\n' + b).candidates.length, 2)
  const ambiguous = analyze('test@example.com\n' + a + '\n' + b)
  assert.equal(ambiguous.candidates.length, 2)
  assert.ok(ambiguous.candidates.every((c: { label: string }) => !c.label))
  const paired = analyze('one@example.com\n' + a + '\ntwo@example.com\n' + b)
  assert.equal(paired.candidates[0].label, 'one@example.com')
  assert.equal(paired.candidates[1].label, 'two@example.com')
  const table = analyze(
    '| one\\@example.com<br> ' + a + ' |\n| --- |\n| two@example.com<br> ' + b + ' |'
  )
  assert.equal(table.candidates.length, 2)
  assert.equal(table.candidates[1].label, 'two@example.com')
  assert.equal(analyze(secret + ' ' + secret).candidates.length, 2)
  assert.equal(analyze('otpauth://hotp/Test?secret=' + secret).candidates.length, 0)
})

test('Lite follows the main theme without writing a preference, including system and storage changes', () => {
  const source = readFileSync(new URL('../public/lite-assets/theme.js', import.meta.url), 'utf8')
  let saved: string | null = 'dark',
    actual = '',
    blocked = false
  const listeners: Record<string, (event?: any) => void> = {}
  const media = {
    matches: false,
    addListener: (fn: () => void) => {
      listeners.system = fn
    }
  }
  const sandbox = {
    window: {
      localStorage: {
        getItem: (key: string) => {
          assert.equal(key, '2fa-hot-theme')
          if (blocked) throw Error()
          return saved
        }
      },
      matchMedia: () => media,
      addEventListener: (name: string, fn: () => void) => {
        listeners[name] = fn
      }
    },
    document: {
      documentElement: {
        setAttribute: (key: string, value: string) => {
          assert.equal(key, 'data-theme')
          actual = value
        }
      }
    }
  }
  vm.runInNewContext(source, sandbox)
  assert.equal(actual, 'dark')
  saved = 'light'
  media.matches = true
  listeners.storage({ key: '2fa-hot-theme' })
  assert.equal(actual, 'light')
  saved = 'system'
  listeners.pageshow()
  assert.equal(actual, 'dark')
  media.matches = false
  listeners.system()
  assert.equal(actual, 'light')
  blocked = true
  media.matches = true
  listeners.pageshow()
  assert.equal(actual, 'dark')
  for (const file of ['lite.ts', 'lite-help.ts']) {
    const html = readFileSync(new URL('../server/templates/' + file, import.meta.url), 'utf8')
    assert.ok(html.indexOf('/lite-assets/theme.js') < html.indexOf('<body>'))
  }
})
