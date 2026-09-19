import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzePaste,
  parseSmartBatch,
  extractedSurroundingText,
  pastedBatchText,
  pastedInputText,
  removeBatchLines,
  insertBatchText
} from '../app/utils/smart-paste.ts'
import { parseBatch, toOtpUri, parseOtp, DEMO_SECRET } from '../app/utils/otp.ts'
const key = 'JBSWY3DPEHPK3PXP'
test('batch paste separates entries and replaces only the selected range', () => {
  const second = 'GEZDGNBVGY3TQOJQ'
  assert.equal(insertBatchText(key, second, key.length, key.length).text, key + '\n' + second)
  assert.equal(
    insertBatchText(key + '\n', second, key.length + 1, key.length + 1).text,
    key + '\n' + second
  )
  assert.equal(insertBatchText(key, second, 0, key.length).text, second)
  const current = key + '\nOLD\n' + key
  assert.equal(
    insertBatchText(current, second, key.length + 1, key.length + 4).text,
    key + '\n' + second + '\n' + key
  )
  assert.equal(insertBatchText(key, second, 0, 0).text, second + '\n' + key)
})
test('plain, grouped and named keys preserve their actual secret', () => {
  for (const source of [
    key,
    'jbsw y3dp ehpk 3pxp',
    '邮箱：' + key,
    'Email ' + key,
    'Social A\t' + key
  ]) {
    const result = analyzePaste(source)
    assert.equal(result.kind, 'single', source)
    assert.equal(result.candidates[0]?.config.secret, key)
  }
  assert.equal(analyzePaste('邮箱：' + key).candidates[0]?.config.label, '邮箱')
})
test('multiple lines and ambiguous prose never concatenate secrets', () => {
  assert.equal(analyzePaste(key + '\n' + DEMO_SECRET).kind, 'multiple')
  for (const source of [
    key + ' ' + DEMO_SECRET,
    '请在这里使用 ' + key + ' 进行验证',
    '说明\n' + key
  ]) {
    const result = analyzePaste(source)
    assert.equal(result.kind, source.includes(DEMO_SECRET) ? 'review' : 'single')
    assert.ok(
      result.candidates.every((c) => c.config.secret === key || c.config.secret === DEMO_SECRET)
    )
  }
})
test('URI settings survive batch transfer; invalid URI parameters cannot be discarded', () => {
  const config = parseOtp(key, {
    digits: 8,
    period: 60,
    algorithm: 'SHA-512',
    issuer: 'Demo',
    label: '邮箱'
  })
  const uri = toOtpUri(config)
  assert.deepEqual(analyzePaste(uri).candidates[0]?.config, config)
  const result = analyzePaste(uri + '\n' + key)
  assert.deepEqual(
    parseBatch(result.candidates.map((c) => toOtpUri(c.config)).join('\n'))[0]?.config,
    config
  )
  for (const bad of [
    uri + '&digits=6',
    uri.replace('totp', 'hotp'),
    'https://example.com/?secret=' + key
  ]) {
    assert.equal(analyzePaste(bad).candidates.length, 0)
    assert.equal(analyzePaste('复制 ' + bad + ' 谢谢').candidates.length, 0)
  }
})
test('invalid boundaries, too many candidates and oversized input stay bounded', () => {
  for (const bad of [key + '9', '_' + key, key + '_', 'not-a-key!'])
    assert.equal(analyzePaste(bad).candidates.length, 0)
  assert.ok(analyzePaste('x'.repeat(100001)).issue)
  assert.ok(analyzePaste(Array(101).fill(key).join('\n')).issue)
})

test('readable batch output retains names and uses URIs for custom parameters', () => {
  const configs = [
    parseOtp(key, { label: '邮箱' }),
    parseOtp(DEMO_SECRET, { period: 45, digits: 8, issuer: 'Work' })
  ]
  const text = pastedBatchText(configs)
  assert.ok(text.startsWith('邮箱\t' + key + '\n'))
  assert.deepEqual(
    parseBatch(text).map((entry) => entry.config),
    configs
  )
  assert.equal(analyzePaste('邮箱：JBSW Y3DP EHPK 3PXP').candidates[0]?.config.secret, key)
  assert.equal(analyzePaste('Email=' + key).candidates[0]?.config.label, 'Email')
})

test('single candidate in prose auto-selects; empty and invalid clipboard do not create candidates', () => {
  for (const source of ['请使用 ' + key + ' 登录', '说明\n' + key, '“' + key + '”']) {
    const result = analyzePaste(source)
    assert.equal(result.kind, 'single')
    assert.equal(result.candidates[0]?.config.secret, key)
  }
  for (const text of ['', '  \n', '123456', '说明文字']) {
    assert.equal(analyzePaste(text).kind, 'none')
    assert.equal(analyzePaste(text).candidates.length, 0)
  }
})
test('repeated complete-key paste replaces instead of concatenating; fragments still insert', () => {
  assert.equal(pastedInputText(key, key, key.length, key.length), key)
  assert.equal(pastedInputText(key, DEMO_SECRET, 0, 0), DEMO_SECRET)
  assert.equal(pastedInputText('JBSWY3DPEHPK', '3PXP', 12, 12), key)
})

test('Chinese prose can touch complete keys without joining key fragments', () => {
  for (const source of ['发疯' + key, key + '复制', '密钥' + key + '请使用']) {
    assert.equal(analyzePaste(source).kind, 'single')
    assert.equal(analyzePaste(source).candidates[0]?.config.secret, key)
  }
  assert.equal(analyzePaste('账号' + key + '另一个' + DEMO_SECRET).candidates.length, 2)
  for (const source of ['发疯' + key + '9', 'é' + key, key.slice(0, 8) + '文字' + key.slice(8)])
    assert.equal(analyzePaste(source).candidates.length, 0)
})

test('site links, verifier links and prose retain all OTP settings', () => {
  for (const base of ['https://2fa.hot', 'http://localhost:3001', '']) {
    const link = base + '/2fa/' + key + '?algorithm=SHA256&digits=8&period=45'
    const parsed = analyzePaste(link)
    assert.equal(parsed.kind, 'single')
    assert.equal(parsed.candidates[0]?.config.algorithm, 'SHA-256')
    assert.equal(parsed.candidates[0]?.config.digits, 8)
    assert.equal(parsed.candidates[0]?.config.period, 45)
  }
  assert.equal(analyzePaste('链接：https://2fa.hot/2fa/' + key + ' 谢谢').kind, 'single')
  assert.equal(
    analyzePaste('中文' + key + '\nhttps://2fa.hot/2fa/' + DEMO_SECRET).candidates.length,
    2
  )
  for (const link of [
    'https://evil.example/2fa/' + key,
    'https://2fa.hot/2fa/' + key + '?digits=9',
    'https://2fa.hot/2fa/' + key + '?period=30&period=45'
  ])
    assert.equal(analyzePaste(link).candidates.length, 0)
})

test('email beside a grouped key remains an unconfirmed candidate', () => {
  for (const source of [
    'demo@outlook.com JBSW Y3DP EHPK 3PXP',
    '"demo@outlook.comJBSW Y3DP EHPK 3PXP"',
    'demo@example.org\t' + key,
    'demo@custom.technologyJBSW Y3DP EHPK 3PXP'
  ]) {
    const result = analyzePaste(source)
    assert.equal(result.kind, 'review')
    assert.equal(result.candidates[0]?.config.secret, key)
    assert.equal(result.candidates[0]!.config.label, '')
    assert.ok(result.accounts?.some((account) => account.startsWith('demo@')))
  }
  assert.equal(analyzePaste('demo@outlook.com JBSW Y3DP password EHPK 3PXP').candidates.length, 0)
})
test('extraction notice excludes casing, spacing and valid URLs', () => {
  for (const source of [key.toLowerCase(), 'JBSW Y3DP EHPK 3PXP', 'https://2fa.hot/2fa/' + key])
    assert.equal(extractedSurroundingText(source), false)
  assert.equal(extractedSurroundingText('账号：' + key), true)
})

test('escaped account separator and quoted adjacent grouped key normalize without changing the account', () => {
  const result = analyzePaste('"test\\@example.technologyJBSW Y3DP EHPK 3PXP"')
  assert.equal(result.kind, 'review')
  assert.equal(result.candidates[0]?.config.label, '')
  assert.equal(result.candidates[0]?.config.secret, key)
})

test('Excel quoted TSV cells preserve account names and grouped secrets', () => {
  for (const source of [
    '"demo@example.com"\t"JBSW Y3DP EHPK 3PXP"\r\n',
    '"demo@example.comJBSW Y3DP EHPK 3PXP"'
  ]) {
    const r = analyzePaste(source)
    assert.equal(r.kind, 'review')
    assert.equal(r.candidates[0]?.config.label, '')
    assert.equal(r.candidates[0]?.config.secret, key)
  }
})

test('single and batch accept account line breaks and invisible clipboard direction marks', () => {
  const source = 'demo\\@example.com\\\n    jbsw y3dp ehpk 3pxp \u202a\u202c'
  const one = analyzePaste(source)
  assert.equal(one.kind, 'review')
  assert.equal(one.candidates[0]?.config.label, '')
  assert.equal(one.candidates[0]?.config.secret, key)
  const batch = parseSmartBatch(source + '\n' + DEMO_SECRET + '\nnot-a-key!')
  assert.equal(batch.length, 4)
  assert.equal(batch[1]?.config?.secret, key)
  assert.ok(batch[0]?.error)
  assert.equal(batch[1]?.config?.label, '')
  assert.equal(batch[2]?.config?.secret, DEMO_SECRET)
  assert.ok(batch[3]?.error)
  // A hard line break is a record boundary, not permission to join fragments.
  assert.ok(
    parseSmartBatch('"demo@example.com"\t"JBSW Y3DP\nEHPK 3PXP"').every((row) => !row.config)
  )
  assert.ok(parseSmartBatch(key + ' ' + DEMO_SECRET)[0]?.error)
})

test('quoted Excel multiline secrets never merge, in single or batch recognition', () => {
  const grouped = (value: string) =>
    value
      .match(/.{1,4}/g)!
      .join(' ')
      .toLowerCase()
  for (const newline of ['\n', '\r\n', '\r']) {
    for (const source of [
      `"demo@example.com${newline}${grouped(key)}${newline}${grouped(DEMO_SECRET)}"`,
      `"${grouped(key)}${newline}${grouped(DEMO_SECRET)}"`,
      `demo@example.com\t"${grouped(key)}${newline}${grouped(DEMO_SECRET)}"`
    ]) {
      const result = analyzePaste(source)
      assert.equal(result.kind, source.includes('@') ? 'review' : 'multiple')
      assert.deepEqual(
        result.candidates.map((row) => row.config.secret),
        [key, DEMO_SECRET]
      )
      assert.deepEqual(
        parseSmartBatch(source)
          .filter((row) => row.config)
          .map((row) => row.config?.secret),
        [key, DEMO_SECRET]
      )
    }
  }
})

test('ambiguous account blocks never assign a key by proximity', () => {
  const source = 'demo@example.com\\\n' + key + '\\\n' + DEMO_SECRET
  const result = analyzePaste(source)
  assert.equal(result.kind, 'review')
  assert.deepEqual(
    result.candidates.map((c) => c.config.secret),
    [key, DEMO_SECRET]
  )
  assert.ok(
    result.candidates.every((c) => c.config.label === '' && c.suggestedAccount === undefined)
  )
  const explicit = analyzePaste('demo@example.com\t' + key + '\n' + DEMO_SECRET)
  assert.equal(explicit.candidates[0]?.config.label, '')
  assert.ok(explicit.candidates.every((c) => !c.suggestedAccount))
})

test('Excel cell proximity does not prove email ownership', () => {
  const grouped = (value: string) => value.match(/.{1,4}/g)!.join(' ')
  const records = [
    `"one@example.com\n${grouped(key)}"`,
    `"two@example.com\n${grouped(DEMO_SECRET)}"`
  ]
  for (const separator of ['\n', '\r\n']) {
    const source = records.join(separator)
    const result = analyzePaste(source)
    assert.equal(result.kind, 'review')
    assert.deepEqual(
      result.candidates.map((c) => c.config.label),
      ['', '']
    )
    assert.deepEqual(
      result.candidates.map((c) => c.config.secret),
      [key, DEMO_SECRET]
    )
    assert.deepEqual(
      result.candidates.map((c) => c.suggestedAccount),
      ['one@example.com', 'two@example.com']
    )
  }
  const ambiguous = analyzePaste(`"one@example.com\n${grouped(key)}\n${grouped(DEMO_SECRET)}"`)
  assert.equal(ambiguous.kind, 'review')
  assert.ok(ambiguous.candidates.every((c) => !c.config.label))
  const markdown = analyzePaste(
    `| one@example.com<br>${grouped(key)} |\n| --- |\n| two@example.com<br>${grouped(DEMO_SECRET)} |`
  )
  assert.deepEqual(
    markdown.candidates.map((c) => c.config.label),
    ['', '']
  )
})

test('alternating plaintext emails and keys require ownership confirmation', () => {
  const source = `one@example.com\n${key}\ntwo@example.com\n${DEMO_SECRET}\nthree@example.com\n${key}`
  const result = analyzePaste(source)
  assert.equal(result.kind, 'review')
  assert.deepEqual(
    result.candidates.map((c) => c.config.label),
    ['', '', '']
  )
  assert.deepEqual(
    parseSmartBatch(source)
      .filter((c) => c.config)
      .map((c) => c.config?.label),
    ['', '', '']
  )
  const mixed = analyzePaste(`one@example.com\n${key}\n${DEMO_SECRET}\ntwo@example.com\n${key}`)
  assert.deepEqual(
    mixed.candidates.map((c) => c.config.label),
    ['', '', '']
  )
  assert.deepEqual(
    mixed.candidates.map((c) => c.suggestedAccount),
    [undefined, undefined, 'two@example.com']
  )
})

test('spreadsheet key cells do not merge and account suggestions stop at explicit pairs', () => {
  const grouped = (value: string) => value.match(/.{1,4}/g)!.join(' ')
  const cells = grouped(key) + '\t' + grouped(DEMO_SECRET)
  assert.deepEqual(
    analyzePaste(cells).candidates.map((c) => c.config.secret),
    [key, DEMO_SECRET]
  )
  assert.deepEqual(
    parseSmartBatch(cells).map((c) => c.config?.secret),
    [key, DEMO_SECRET]
  )
  const source = `one@example.com\n${key}\n${DEMO_SECRET}\ntwo@example.com\t${key}\n${DEMO_SECRET}`
  assert.deepEqual(
    analyzePaste(source).candidates.map((c) => c.suggestedAccount),
    [undefined, undefined, undefined, undefined]
  )
})

test('mixed complete and grouped keys remain separate candidates', () => {
  const grouped = DEMO_SECRET.match(/.{1,4}/g)!.join(' ')
  for (const source of [key + ' ' + grouped, grouped + ' ' + key]) {
    const result = analyzePaste(source)
    assert.equal(result.kind, 'review')
    assert.deepEqual(
      result.candidates.map((c) => c.config.secret).sort(),
      [key, DEMO_SECRET].sort()
    )
    assert.ok(result.candidates.every((c) => !c.config.label))
  }
})

test('removing batch rows preserves remaining values and invalid lines using normalized row IDs', () => {
  const raw = key + '\n\nnot-a-key!\n' + DEMO_SECRET + '\n' + key
  assert.equal(removeBatchLines(raw, [1, 4]), '\nnot-a-key!\n' + key)
  assert.deepEqual(
    parseSmartBatch(removeBatchLines(raw, [1, 4])).map((row) => row.line),
    [2, 3]
  )
  assert.equal(removeBatchLines(key + '\n' + DEMO_SECRET, [1, 2]), '')
  assert.equal(removeBatchLines(key, []), key)
})

test('email rows and stacked emails preserve keys without inferring ownership', () => {
  const paired = analyzePaste(`test@example.com\t${key}\t${DEMO_SECRET}`)
  assert.deepEqual(
    paired.candidates.map((c) => c.config.label),
    ['', '']
  )
  assert.equal(paired.kind, 'review')
  const ambiguous = analyzePaste(`one@example.com\ntwo@example.com\n${key}`)
  assert.equal(ambiguous.kind, 'review')
  assert.equal(ambiguous.candidates[0]?.config.label, '')
  assert.deepEqual(ambiguous.accounts, ['one@example.com', 'two@example.com'])
  const repeated = analyzePaste(`test@example.com\t${key}\ntest@example.com\t${DEMO_SECRET}`)
  assert.deepEqual(
    repeated.candidates.map((c) => c.config.label),
    ['', '']
  )
})

test('whole Excel rows keep primary and recovery emails without inventing associations', () => {
  const grouped = (value: string) => value.match(/.{1,4}/g)!.join(' ')
  const source = `primary@example.com\t"password8!\nsecond9!"\t"recovery@example.com\nauxiliary@example.com\n${grouped(key)}\n${grouped(DEMO_SECRET)}"\t"555-1234\nCity"`
  const result = analyzePaste(source)
  assert.equal(result.kind, 'review')
  assert.deepEqual(
    result.candidates.map((c) => c.config.secret),
    [key, DEMO_SECRET]
  )
  assert.deepEqual(result.accounts, [
    'primary@example.com',
    'recovery@example.com',
    'auxiliary@example.com'
  ])
  assert.ok(result.candidates.every((c) => !c.config.label && !c.suggestedAccount))
})

test('confirmed email assignments survive batch serialization as explicit OTP metadata', () => {
  const config = { ...parseOtp(key), label: 'confirmed@example.com' }
  const text = pastedBatchText([config])
  assert.ok(text.startsWith('otpauth://'))
  assert.equal(analyzePaste(text).candidates[0]?.config.label, config.label)
  assert.equal(parseSmartBatch(text)[0]?.config?.label, config.label)
})

test('unquoted spreadsheet columns isolate passwords from grouped keys', () => {
  const result = analyzePaste(
    'primary@example.com\tpassword9!\trecovery@example.com\tJBSW Y3DP EHPK 3PXP\t555-1234'
  )
  assert.deepEqual(
    result.candidates.map((c) => c.config.secret),
    [key]
  )
  assert.deepEqual(result.accounts, ['primary@example.com', 'recovery@example.com'])
  assert.equal(result.candidates[0]?.config.label, '')
})

test('explicit OTP account metadata wins over unrelated recovery addresses', () => {
  const config = parseOtp(key, { label: 'primary@example.com' })
  const result = analyzePaste('recovery@example.com\n' + toOtpUri(config))
  assert.equal(result.kind, 'single')
  assert.deepEqual(result.candidates[0]?.config, config)
})

test('confirmed batch transfer does not ask to associate intentionally unnamed keys again', () => {
  const text = pastedBatchText([
    parseOtp(key, { label: 'confirmed@example.com' }),
    parseOtp(DEMO_SECRET)
  ])
  const result = analyzePaste(text)
  assert.equal(result.kind, 'multiple')
  assert.deepEqual(
    result.candidates.map((c) => c.config.label),
    ['confirmed@example.com', '']
  )
})
