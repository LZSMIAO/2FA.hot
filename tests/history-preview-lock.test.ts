import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { effectScope, shallowRef, watch, nextTick } from 'vue'

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

test('return handoff preserves manual provenance and rejects locked history', async () => {
  const text = source('SingleWorkspace')
  const start = text.indexOf('watch(\n  vault.pending,')
  const code = text.slice(start, text.indexOf('\n)', start) + 2)
  for (const historyPreview of [false, true]) {
    for (const unlocked of [false, true]) {
      const config = {
        secret: 'PUBLIC-TEST',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        label: '',
        issuer: ''
      }
      const values = {
        vault: { pending: shallowRef({ config, historyPreview }), unlocked: shallowRef(unlocked) },
        pendingPaste: shallowRef(null),
        raw: shallowRef(''),
        kind: shallowRef('totp'),
        algorithm: shallowRef('SHA1'),
        digits: shallowRef(6),
        period: shallowRef(30),
        restoredDetails: shallowRef({}),
        historyPreviewIdentity: shallowRef(''),
        identity: (value: { secret: string }) => value.secret
      }
      const { scope } = run(code, values)
      await nextTick()
      assert.equal(values.raw.value, historyPreview && !unlocked ? '' : config.secret)
      assert.equal(
        values.historyPreviewIdentity.value,
        historyPreview && unlocked ? config.secret : ''
      )
      assert.equal(values.vault.pending.value, undefined)
      scope.stop()
    }
  }
})

test('ordinary standalone page does not redirect when the vault is initially locked', () => {
  const config = shallowRef({ secret: 'PUBLIC-TEST' })
  const destinations: unknown[] = []
  const { scope } = run(lockWatcher('DirectAccess'), {
    vault: { unlocked: shallowRef(false) },
    config,
    historyPreviewIdentity: '',
    navigateTo: (...args: unknown[]) => destinations.push(args)
  })
  assert.equal(config.value.secret, 'PUBLIC-TEST')
  assert.deepEqual(destinations, [])
  scope.stop()
})

test('session history handoff is not classified as locked vault data', () => {
  const text = source('SessionHistory')
  const code = text.slice(text.indexOf('function select('), text.indexOf('function time('))
  const pending = shallowRef<unknown>()
  const { scope, context } = run(code, { vault: { pending }, emit() {} })
  context.select({ secret: 'PUBLIC-TEST' })
  assert.equal(
    JSON.stringify(pending.value),
    JSON.stringify({ config: { secret: 'PUBLIC-TEST' }, historyPreview: false })
  )
  scope.stop()
})

test('size transition completes without animation frames, settles scroll before sound, and prevents double navigation', async () => {
  const events: string[] = []
  let release!: () => void
  const loading = new Promise<void>((resolve) => {
    release = resolve
  })
  const config = shallowRef({ secret: 'PUBLIC-TEST' })
  const active = shallowRef(false)
  const text = source('OtpResult')
  const expand = text.slice(text.indexOf('async function expand()'), text.indexOf('</script>'))
  const { scope, context } = run('let navigationRevision = 0\n' + expand, {
    props: { config: config.value, standalone: true, historyPreview: false },
    config,
    sizeTransitionActive: active,
    code: shallowRef('123456'),
    generatedAt: shallowRef(0),
    displayHandoff: shallowRef(null),
    vault: { pending: shallowRef() },
    localePath: (path: string) => path,
    preloadRouteComponents: () => loading,
    navigateTo: async () => {
      events.push('navigate')
    },
    nextTick: async () => {
      events.push('tick')
    },
    requestAnimationFrame: () => {
      throw new Error('Rendering is suspended during the view transition update')
    },
    window: { scrollTo: () => events.push('scroll'), dispatchEvent: () => events.push('sound') },
    CustomEvent: class {},
    reducedMotion: shallowRef(false),
    document: {
      documentElement: { classList: { add() {}, remove() {} } },
      startViewTransition: (update: () => Promise<void>) => {
        const ready = update().then(() => {
          events.push('ready')
        })
        return { ready, finished: ready }
      }
    }
  })
  const first = context.expand()
  assert.equal(active.value, true)
  await context.expand()
  release()
  await first
  assert.deepEqual(events, ['navigate', 'tick', 'scroll', 'ready', 'sound'])
  assert.equal(active.value, false)
  scope.stop()
})

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
    document: { documentElement: { classList: { add() {}, remove() {} } } },
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
