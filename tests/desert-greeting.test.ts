import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'
import { effectScope, shallowRef, type Ref } from 'vue'
import { DESERT_MOTION_MS, useDesertGreeting } from '../app/composables/useDesertGreeting.ts'

function setup(reducedMotion = () => false, annoyed?: Ref<boolean>) {
  const open = shallowRef(true)
  const scope = effectScope()
  const state = scope.run(() => useDesertGreeting(() => open.value, { reducedMotion, annoyed }))!
  return { open, scope, ...state }
}

test('tips rotate through five distinct actions without immediate repeats', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const s = setup()
  t.after(() => s.scope.stop())
  const motions = []
  const texts = new Set<string>()
  for (let i = 0; i < 6; i++) {
    s.greet()
    motions.push(s.tip.value.motion)
    texts.add(s.tip.value.text)
    assert.equal(s.active.value, true)
    assert.equal(s.playing.value, true)
    t.mock.timers.tick(s.motionDuration.value)
    assert.equal(s.playing.value, false)
    assert.equal(s.active.value, true, 'bubble stays readable after motion finishes')
  }
  assert.deepEqual(motions, ['look', 'ciallo', 'nod', 'shake', 'swing', 'look'])
  assert.equal(texts.size, 5)
  assert.equal([...texts].filter((text) => /验证码|密钥/.test(text)).length, 1)
  assert.ok([...texts].some((text) => text.includes('穗织')))
  assert.ok([...texts].some((text) => text.includes('丛雨丸')))
})

test('rapid taps queue at most one next action, never an unbounded replay', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const s = setup()
  t.after(() => s.scope.stop())
  for (let i = 0; i < 100; i++) s.greet()
  assert.equal(s.tip.value.motion, 'look')
  t.mock.timers.tick(DESERT_MOTION_MS - 1)
  assert.equal(s.tip.value.motion, 'look')
  t.mock.timers.tick(1)
  assert.equal(s.tip.value.motion, 'ciallo')
  t.mock.timers.tick(DESERT_MOTION_MS * 20)
  assert.equal(s.tip.value.motion, 'ciallo')
  assert.equal(s.playing.value, false)
})

test('reduced motion shows tips immediately and cancels an in-flight queue', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let reduce = false
  const s = setup(() => reduce)
  t.after(() => s.scope.stop())
  s.greet()
  s.greet()
  reduce = true
  s.greet()
  assert.equal(s.tip.value.motion, 'ciallo')
  assert.equal(s.playing.value, false)
  s.greet()
  assert.equal(s.tip.value.motion, 'nod')
  t.mock.timers.tick(DESERT_MOTION_MS * 2)
  assert.equal(s.tip.value.motion, 'nod')
  assert.equal(s.active.value, true)
})

test('dismiss, close and unmount cancel timers and queued actions', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  for (const stop of ['dismiss', 'close', 'unmount']) {
    const s = setup()
    s.greet()
    s.greet()
    if (stop === 'dismiss') s.dismiss()
    if (stop === 'close') s.open.value = false
    if (stop === 'unmount') s.scope.stop()
    t.mock.timers.tick(DESERT_MOTION_MS * 2)
    assert.equal(s.active.value, false, stop)
    assert.equal(s.playing.value, false, stop)
    assert.equal(s.tip.value.motion, 'look', stop)
    if (stop !== 'dismiss') {
      s.greet()
      assert.equal(s.active.value, false, 'closed/disposed components cannot restart')
    }
    s.scope.stop()
  }
})

test('reopening continues the rotation, without resurrecting an old timer', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const s = setup()
  t.after(() => s.scope.stop())
  s.greet()
  t.mock.timers.tick(300)
  s.open.value = false
  s.open.value = true
  s.greet()
  t.mock.timers.tick(900)
  assert.equal(s.playing.value, true)
  assert.equal(s.tip.value.motion, 'ciallo')
  t.mock.timers.tick(s.motionDuration.value - 900)
  assert.equal(s.playing.value, false)
})

test('four actual hover entries within three seconds latch anger until page state is recreated', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 10000 })
  const annoyed = shallowRef(false)
  const s = setup(() => false, annoyed)
  for (let i = 0; i < 4; i++) {
    s.hover()
    if (i < 3) {
      assert.notEqual(s.tip.value.motion, 'angry')
      s.dismiss()
      t.mock.timers.tick(400)
    }
  }
  assert.equal(s.tip.value.motion, 'angry')
  assert.equal(s.tip.value.sound, 'character-angry')
  const reactions = s.reaction.value
  s.dismiss()
  s.hover()
  assert.equal(s.reaction.value, reactions, 'jitter does not replay the angry sound')
  assert.equal(s.active.value, true)
  t.mock.timers.tick(60000)
  s.dismiss()
  s.greet()
  assert.equal(s.tip.value.motion, 'angry', 'time alone never clears anger')
  s.open.value = false
  s.open.value = true
  s.greet()
  assert.equal(s.tip.value.motion, 'angry', 'collapsing the scene does not clear anger')
  s.scope.stop()
  const remount = setup(() => false, annoyed)
  remount.greet()
  assert.equal(remount.tip.value.motion, 'angry', 'route changes reuse the page latch')
  remount.scope.stop()
  const refreshed = setup(() => false, shallowRef(false))
  refreshed.hover()
  assert.equal(refreshed.tip.value.motion, 'look')
  refreshed.scope.stop()
})

test('slow hovering, nested events, keyboard and taps do not cause anger', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 10000 })
  const s = setup()
  t.after(() => s.scope.stop())
  for (let i = 0; i < 8; i++) {
    s.hover()
    s.hover() // Already inside: not a new entry.
    assert.notEqual(s.tip.value.motion, 'angry')
    s.dismiss()
    t.mock.timers.tick(1600)
  }
  for (let i = 0; i < 10; i++) {
    s.greet()
    s.dismiss()
  }
  assert.notEqual(s.tip.value.motion, 'angry')
})

test('Ciallo uses its own sound and allows the full voice clip to finish', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const s = setup()
  t.after(() => s.scope.stop())
  s.greet()
  t.mock.timers.tick(s.motionDuration.value)
  s.greet()
  assert.equal(s.tip.value.text, 'Ciallo～(∠・ω< )⌒☆')
  assert.equal(s.tip.value.sound, 'ciallo')
  assert.ok(s.motionDuration.value >= 1272)
})

test('seasonal tip is determined at interaction time, not SSR time', (t) => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: new Date(2026, 2, 10).valueOf() })
  for (const [month, season] of [
    [2, '春'],
    [5, '夏'],
    [8, '秋'],
    [11, '冬']
  ] as const) {
    t.mock.timers.setTime(new Date(2026, month, 10).valueOf())
    const s = setup()
    s.greet()
    assert.ok(s.tip.value.text.includes(season))
    s.scope.stop()
  }
})

test('pointer focus, touch release and nested hover do not double-trigger or dismiss a tap', () => {
  const component = readFileSync(
    new URL('../app/components/DesertAccent.vue', import.meta.url),
    'utf8'
  )
  const source = parse(component).descriptor.scriptSetup!.content.replace(/^import .*\n/gm, '')
  const active = shallowRef(false)
  let greetings = 0
  const context = vm.createContext({
    defineProps: () => ({ open: true }),
    useMessages: () => ({ tx: (s: string) => s }),
    useState: (_key: string, initial: () => boolean) => shallowRef(initial()),
    useDesertGreeting: () => ({
      active,
      playing: shallowRef(false),
      tip: shallowRef({ motion: 'look' }),
      greet: () => {
        greetings++
        active.value = true
      },
      hover: () => {
        greetings++
        active.value = true
      },
      dismiss: () => {
        active.value = false
      }
    }),
    matchMedia: () => ({ matches: true }),
    watch: () => {},
    shallowRef,
    useTemplateRef: () => shallowRef(null),
    onMounted: () => {},
    onBeforeUnmount: () => {}
  })
  const { focusGreet, hoverGreet, leave, greet } = vm.runInContext(
    ts.transpileModule(source + '\n;({focusGreet, hoverGreet, leave, greet})', {
      compilerOptions: { target: ts.ScriptTarget.ES2022 }
    }).outputText,
    context
  )
  hoverGreet({ pointerType: 'touch' })
  focusGreet({ currentTarget: { matches: () => false } })
  greet() // Native click, following pointer focus.
  leave({ pointerType: 'touch' })
  assert.equal(greetings, 1)
  assert.equal(active.value, true)
  leave({ pointerType: 'mouse' })
  assert.equal(active.value, false)
  hoverGreet({ pointerType: 'mouse' })
  hoverGreet({ pointerType: 'mouse' })
  assert.equal(greetings, 2)
  focusGreet({ currentTarget: { matches: () => true } })
  assert.equal(greetings, 2, 'focusing a visible greeting does not advance it')
  leave({ pointerType: 'mouse' })
  focusGreet({ currentTarget: { matches: () => true } })
  assert.equal(greetings, 3)
  assert.match(component, /@pointerenter="hoverGreet"/)
  assert.doesNotMatch(component, /@pointerover=/)
  assert.match(component, /data-sound-custom/)
  assert.match(component, /useState<boolean>\('desert-annoyed', \(\) => false\)/)
  // Keep the text box intact until opacity has finished; never fade an empty frame.
  assert.match(component, /\{\{ tx\(tip\.text\) \}\}/)
  assert.doesNotMatch(component, /active \? tx\(tip\.text\)/)
  assert.match(component, /visibility 0s 140ms/)
  assert.match(component, /:aria-hidden="!active"/)
})

test('all bubble variants share a top anchor and retain their text while fading', () => {
  const component = readFileSync(
    new URL('../app/components/DesertAccent.vue', import.meta.url),
    'utf8'
  )
  const css = parse(component).descriptor.styles[0]!.content
  const bubbleRules = [...css.matchAll(/\.desert-tip\s*\{([^}]+)\}/g)].map((match) => match[1]!)
  // A top offset may be scaled with the scene, but it stays a top anchor.
  const fixedTopAnchors = bubbleRules.filter((rule) =>
    /top:\s*(?:-?[\d.]+(?:rem|px)?|calc\(-?[\d.]+rem \* var\(--desert-fit, 1\)\));/.test(rule)
  )
  assert.equal(
    fixedTopAnchors.length,
    2,
    'desktop and mobile retain fixed top anchors without pinning their design offsets'
  )
  assert.ok(bubbleRules.every((rule) => !/bottom:/.test(rule)))
  assert.doesNotMatch(css, /\[data-motion.*?\][^{]*\.desert-tip/)
  assert.doesNotMatch(
    css,
    /var\(--ore-window-shadow\)/,
    'bubble must not inherit the heavy panel base'
  )
  assert.match(component, /class="desert-emoticon"/)
  assert.match(css, /white-space: nowrap/)
})

test('generated motions return to exact rest poses and leave hit targets/scenery fixed', () => {
  const svg = readFileSync(
    new URL('../app/assets/art/desert-interactive.svg', import.meta.url),
    'utf8'
  )
  const joints = [
    ...svg.matchAll(
      /<g class="(desert-joint-\d+)" data-joint="(\w+)" transform="matrix\(([^)]+)\)"/g
    )
  ]
  assert.equal(joints.filter((m) => m[2] === 'head').length, 6)
  assert.equal(joints.filter((m) => m[2] === 'shin').length, 6)
  assert.equal(joints.filter((m) => m[2] === 'arm').length, 6)
  const styles = [...svg.matchAll(/<style>(.*?)<\/style>/g)].map((m) => m[1]!).join('')
  for (const joint of joints) {
    const rest = joint[3]!.split(' ').map(Number)
    const names =
      joint[2] === 'head'
        ? ['look', 'nod', 'shake', 'angry', 'ciallo']
        : joint[2] === 'arm'
          ? ['ciallo']
          : ['swing']
    for (const name of names) {
      const start = styles.indexOf(`@keyframes ${joint[1]}-${name}{`)
      assert.ok(start >= 0)
      const frames = styles.slice(start, styles.indexOf('}}', start) + 2)
      const transforms = [...frames.matchAll(/(\d+)%\{transform:matrix\(([^)]+)\)\}/g)]
      assert.equal(transforms[0]![1], '0')
      assert.equal(transforms.at(-1)![1], '100')
      assert.equal(transforms[0]![2], transforms.at(-1)![2])
      for (const [i, value] of transforms[0]![2]!.split(',').map(Number).entries()) {
        assert.ok(Math.abs(value - rest[i]!) < 1e-10)
      }
      for (const frame of transforms) {
        const matrix = frame[2]!.split(',').map(Number)
        assert.ok(matrix.every(Number.isFinite))
        // No face turns inside out or collapses during interpolation.
        assert.ok(matrix[0]! * matrix[3]! - matrix[1]! * matrix[2]! > 0.2)
      }
    }
  }
  assert.equal((styles.match(/prefers-reduced-motion:reduce/g) || []).length, 42)
  assert.doesNotMatch(styles, /infinite|1\.8s/)
  assert.doesNotMatch(svg.split('<g class="desert-hit">')[1]!, /transform|style|animation/)
  assert.match(svg, /<polygon points="[^"]+" fill="#c9c29a"\/>/)
})
