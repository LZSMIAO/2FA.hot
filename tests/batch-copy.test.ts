import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { codeOutput } from '../app/utils/code-output.ts'
import { parseSmartBatch } from '../app/utils/smart-paste.ts'
import { generateOtp } from '../app/utils/otp.ts'

// Execute the component's actual click handler, observing the clipboard boundary.
const source = readFileSync(
  new URL('../app/components/BatchWorkspace.vue', import.meta.url),
  'utf8'
)
const handler = source.slice(
  source.indexOf('async function copyRows('),
  source.indexOf('async function save()')
)
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
function setup(input: string) {
  const entries = parseSmartBatch(input)
  const captured: string[] = []
  const context = vm.createContext({
    codeOutput,
    generateOtp: (config: Parameters<typeof generateOtp>[0]) => generateOtp(config, 59_000),
    guiding: { value: false },
    sequence: 0,
    valid: { value: entries.filter((row) => row.config) },
    entries: { value: entries },
    copied: { value: false },
    copiedLine: { value: null },
    note: { value: '' },
    issue: { value: '' },
    deferredMessage: () => '',
    copy: async (value: string) => {
      captured.push(value)
      return true
    }
  })
  vm.runInContext(
    ts.transpileModule(handler, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText,
    context
  )
  return { context, captured }
}
test('bulk clipboard excludes secrets across bare and URI inputs, preserves duplicates and skips errors', async () => {
  const { context, captured } = setup(
    `${secret}\notpauth://totp/?secret=${secret}\ninvalid!\n${secret}`
  )
  await context.copyRows()
  assert.deepEqual(captured, ['287082\n287082\n287082'])
  assert.ok(!captured[0]!.includes(secret))
})
test('named and single-row copying preserve the existing output contract', async () => {
  const { context, captured } = setup(
    `otpauth://totp/Example:alice?secret=${secret}&issuer=Example\n${secret}`
  )
  await context.copyRows()
  assert.equal(captured[0], 'alice\t287082\n287082')
  await context.copyRows(1)
  assert.equal(captured[1], '287082')
  assert.equal(codeOutput('', '000042'), '000042')
  assert.equal(codeOutput('Steam', '2ABCD'), 'Steam\t2ABCD')
  context.guiding.value = true
  await context.copyRows()
  assert.equal(captured.length, 2)
})
test('changed input suppresses stale async clipboard results', async () => {
  const { context, captured } = setup(secret)
  let finish!: (value: string) => void
  context.generateOtp = () =>
    new Promise((resolve) => {
      finish = resolve
    })
  const pending = context.copyRows()
  context.sequence++
  finish('123456')
  await pending
  assert.deepEqual(captured, [])
})
