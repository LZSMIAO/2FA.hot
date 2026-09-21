import test, { type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, shallowRef, watch } from 'vue'
import { usePanoramaViewport } from '../app/composables/usePanoramaViewport.ts'

function setup(t: TestContext, touch = true, ios = true) {
  const mounted: (() => void)[] = [],
    disposed: (() => void)[] = []
  const target = () => {
    const listeners = new Map<string, Set<Function>>()
    return {
      listeners,
      addEventListener(name: string, fn: Function) {
        if (!listeners.has(name)) listeners.set(name, new Set())
        listeners.get(name)!.add(fn)
      },
      removeEventListener(name: string, fn: Function) {
        listeners.get(name)?.delete(fn)
      },
      emit(name: string, event = {}) {
        listeners.get(name)?.forEach((fn) => fn(event))
      }
    }
  }
  const field = { matches: () => true }
  const document = {
    ...target(),
    documentElement: { hasAttribute: (name: string) => name === 'data-ios' && ios },
    activeElement: null as typeof field | null
  }
  const window = {
    ...target(),
    innerWidth: 393,
    matchMedia: () => ({ matches: touch })
  }
  const frames = new Map<number, FrameRequestCallback>()
  let sequence = 0,
    naturalTop = 0,
    liveHeight = 739
  const properties = new Map<string, string>()
  const style = {
    transform: '',
    setProperty(name: string, value: string) {
      properties.set(name, value)
    },
    removeProperty(name: string) {
      properties.delete(name)
      if (name === 'transform') this.transform = ''
    }
  }
  const element = {
    style,
    getBoundingClientRect() {
      return {
        top: naturalTop,
        height: Number.parseFloat(properties.get('--panorama-height') || '') || liveHeight
      }
    }
  }
  const globals = {
    window,
    document,
    watch,
    onMounted: (fn: () => void) => mounted.push(fn),
    onBeforeUnmount: (fn: () => void) => disposed.push(fn),
    requestAnimationFrame: (fn: FrameRequestCallback) => {
      frames.set(++sequence, fn)
      return sequence
    },
    cancelAnimationFrame: (id: number) => frames.delete(id)
  }
  const previous = Object.fromEntries(
    Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  )
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
  const scope = effectScope()
  scope.run(() =>
    usePanoramaViewport(shallowRef(element as unknown as HTMLElement), shallowRef(true))
  )
  mounted.forEach((fn) => fn())
  const unmount = () => {
    disposed.forEach((fn) => fn())
    scope.stop()
  }
  t.after(() => {
    unmount()
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else Reflect.deleteProperty(globalThis, key)
    }
  })
  return {
    element,
    properties,
    frames,
    window,
    document,
    unmount,
    geometry(top: number, height: number) {
      naturalTop = top
      liveHeight = height
    },
    focus(active: boolean) {
      document.activeElement = active ? field : null
      document.emit(active ? 'focusin' : 'focusout', { target: field })
    },
    advance(time: number) {
      const callbacks = [...frames.values()]
      frames.clear()
      callbacks.forEach((fn) => fn(time))
    }
  }
}

test('keyboard resizing lvh cannot resize the panorama; rotation remeasures after blur', (t) => {
  const env = setup(t)
  env.focus(true)
  env.geometry(0, 374)
  env.window.emit('resize')
  env.advance(120)
  assert.equal(env.element.getBoundingClientRect().height, 739)
  env.window.innerWidth = 844
  env.geometry(0, 250)
  env.window.emit('resize')
  assert.equal(env.element.getBoundingClientRect().height, 739)
  env.focus(false)
  env.geometry(0, 393)
  env.advance(300)
  assert.equal(env.element.getBoundingClientRect().height, 393)
})

test('keyboard panning never writes transforms or starts continuous frame tracking', (t) => {
  const env = setup(t)
  env.focus(true)
  env.geometry(-205, 739)
  env.advance(150)
  assert.equal(env.element.style.transform, '')
  assert.equal(env.frames.size, 0)
  env.focus(false)
  env.geometry(0, 739)
  env.advance(270)
  assert.equal(env.element.style.transform, '')
  env.advance(1100)
  assert.equal(env.frames.size, 0)
  env.window.innerWidth = 844
  env.window.emit('resize')
  assert.equal(env.frames.size, 1)
  env.unmount()
  assert.equal(env.frames.size, 0)
  assert.ok([...env.document.listeners.values()].every((listeners) => listeners.size === 0))
})

test('desktop resizing retains native CSS sizing without keyboard tracking', (t) => {
  const env = setup(t, false)
  env.focus(true)
  env.geometry(0, 900)
  env.window.emit('resize')
  assert.equal(env.element.getBoundingClientRect().height, 900)
  assert.equal(env.properties.size, 0)
  assert.equal(env.frames.size, 0)
})

test('Android touch devices keep native sizing and register no viewport listeners', (t) => {
  const env = setup(t, true, false)
  env.focus(true)
  env.geometry(0, 374)
  env.window.emit('resize')
  assert.equal(env.element.getBoundingClientRect().height, 374)
  assert.equal(env.properties.size, 0)
  assert.equal(env.frames.size, 0)
  assert.equal(env.window.listeners.size, 0)
  assert.equal(env.document.listeners.size, 0)
})
