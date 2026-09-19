import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { effectScope, shallowRef, watch } from 'vue'

function source(name: string) {
  return readFileSync(new URL(`../app/components/${name}.vue`, import.meta.url), 'utf8')
}
function lockWatcher(name: string) {
  const text = source(name)
  const start = text.indexOf('watch(\n  vault.unlocked,')
  assert.notEqual(start, -1)
  return text.slice(start, text.indexOf('\n)', start) + 2)
}
function run(code: string, values: Record<string, unknown>) {
  const scope = effectScope()
  const context = vm.createContext({ watch, ...values })
  scope.run(() =>
    vm.runInContext(
      ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
      context
    )
  )
  return { scope, context }
}

test('locking clears historical input and notices synchronously, preserving manual input', () => {
  for (const historical of [true, false]) {
    const unlocked = shallowRef(true)
    const raw = shallowRef('private seed')
    const values: Record<string, unknown> = {
      vault: { unlocked },
      historyPreviewIdentity: shallowRef(historical ? 'preview' : ''),
      raw,
      clearPasteFeedback() {},
      clearTimeout() {},
      validation: undefined,
      pasteRevision: 0,
      field: shallowRef(null)
    }
    for (const key of ['pasteIssue', 'issue', 'extracted', 'originalInput'])
      values[key] = shallowRef('sensitive input notice')
    for (const key of ['pendingPaste', 'kind', 'revealed', 'advanced'])
      values[key] = shallowRef(null)
    const text = source('SingleWorkspace')
    const clear = text.slice(
      text.indexOf('function clear()'),
      text.indexOf('function clearWithSound')
    )
    const { scope, context } = run(clear + '\n' + lockWatcher('SingleWorkspace'), values)
    unlocked.value = false
    assert.equal(raw.value, historical ? '' : 'private seed')
    assert.equal(context.originalInput.value, historical ? '' : 'sensitive input notice')
    scope.stop()
  }
})

test('expanded historical previews revoke the config and replace the secret-bearing URL', () => {
  const unlocked = shallowRef(true)
  const config = shallowRef({ secret: 'private seed' })
  const destinations: unknown[] = []
  const values = {
    vault: { unlocked },
    config,
    input: shallowRef('private seed'),
    fragment: shallowRef('#private-seed'),
    expandedConfig: shallowRef(config.value),
    expandedHistoryPreview: shallowRef(true),
    historyPreviewIdentity: 'private seed',
    identity: (value: { secret: string }) => value.secret,
    localePath: (value: string) => value,
    navigateTo: (...args: unknown[]) => destinations.push(args)
  }
  const { scope } = run(lockWatcher('DirectAccess'), values)
  unlocked.value = false
  assert.equal(config.value, null)
  assert.equal(values.fragment.value, '')
  assert.equal(values.expandedConfig.value, null)
  assert.equal(values.expandedHistoryPreview.value, false)
  assert.equal(JSON.stringify(destinations), JSON.stringify([['/2fa', { replace: true }]]))
  scope.stop()
})

test('lock closes exports and cancels an expansion waiting for route preloading', async () => {
  const unlocked = shallowRef(true)
  const config = shallowRef({ secret: 'private seed' })
  let release!: () => void
  const loading = new Promise<void>((resolve) => {
    release = resolve
  })
  const destinations: string[] = []
  const values = {
    vault: { unlocked },
    props: { config: config.value, historyPreview: true },
    config,
    exportMode: shallowRef('qr'),
    displayHandoff: shallowRef<unknown>(null),
    expandedConfig: shallowRef<unknown>(null),
    expandedHistoryPreview: shallowRef(false),
    sizeTransitionActive: shallowRef(false),
    code: shallowRef('123456'),
    generatedAt: shallowRef(0),
    window: { dispatchEvent() {} },
    CustomEvent: class {},
    localePath: (value: string) => value,
    toAccessPath: () => '/2fa#private-seed',
    preloadRouteComponents: () => loading,
    navigateTo: (path: string) => destinations.push(path),
    nextTick: async () => {},
    document: {},
    reducedMotion: shallowRef(true)
  }
  const text = source('OtpResult')
  const expand = text.slice(text.indexOf('async function expand()'), text.indexOf('</script>'))
  const { scope, context } = run(
    'let navigationRevision = 0\n' + lockWatcher('OtpResult') + '\n' + expand,
    values
  )
  const pending = context.expand()
  unlocked.value = false
  assert.equal(values.exportMode.value, null)
  assert.equal(values.displayHandoff.value, null)
  assert.equal(values.expandedConfig.value, null)
  release()
  await pending
  assert.deepEqual(destinations, [])
  scope.stop()
})
