import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'
import { shallowRef } from 'vue'

function setup(audioState = 'running') {
  const elements = new Map<string, { value: any }>()
  const sources: any[] = []
  const audio = {
    state: audioState,
    resume: () => Promise.resolve(),
    createGain: () => ({ gain: { value: 1 }, connect() {}, disconnect() {} }),
    createBufferSource: () => {
      const voice = {
        buffer: undefined,
        playbackRate: { value: 1 },
        starts: 0,
        stops: 0,
        connect() {},
        disconnect() {},
        start() {
          this.starts++
        },
        stop() {
          this.stops++
        },
        onended: undefined as undefined | (() => void)
      }
      sources.push(voice)
      return voice
    }
  }
  const context = vm.createContext({
    shallowRef,
    useMessages: () => ({ tx: (text: string) => text }),
    useTemplateRef: (name: string) => {
      const ref = {
        value: {
          plays: 0,
          pauses: 0,
          currentTime: 0,
          volume: 1,
          pause() {
            this.pauses++
          },
          play() {
            this.plays++
            return Promise.resolve()
          }
        }
      }
      elements.set(name, ref)
      return ref
    },
    onMounted() {},
    onBeforeUnmount() {},
    localStorage: { setItem() {} },
    AbortController
  })
  const source = parse(
    readFileSync(new URL('../app/components/ButtonSoundToggle.vue', import.meta.url), 'utf8')
  ).descriptor.scriptSetup!.content
  const api = vm.runInContext(
    ts.transpileModule(
      source +
        `
    ;({ play, toggle, stop, enabled, samples, buffers,
      setupAudio(audio) { prepared = true; context = audio; gain = audio.createGain() }
    })
  `,
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
    ).outputText,
    context
  )
  api.setupAudio(audio)
  return { api, elements, sources }
}

test('Ciallo is a local, intact MP3 and has no remote runtime dependency', () => {
  const bytes = readFileSync(new URL('../public/audio/ciallo.mp3', import.meta.url))
  assert.equal(bytes.length, 20589)
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    'ec592031726e4e9dfc28373f73dc5b95bf0fa0a85df11c70b5d817bf9d1eb40f'
  )
  const { api } = setup()
  assert.equal(api.samples.ciallo, '/audio/ciallo.mp3')
})

test('character voices replace each other, and an old onended cannot clear the new one', () => {
  const { api, sources } = setup()
  api.enabled.value = true
  api.buffers.set('character', {})
  api.buffers.set('ciallo', {})
  api.play('ciallo')
  api.play('character-angry')
  assert.equal(sources[0].stops, 1)
  assert.equal(sources[1].starts, 1)
  sources[0].onended()
  api.play('ciallo')
  assert.equal(sources[1].stops, 1)
  assert.equal(sources[2].starts, 1)
  api.stop()
})

test('muted means no voice; muting interrupts a voice already in progress', () => {
  const { api, sources, elements } = setup()
  api.buffers.set('ciallo', {})
  api.play('ciallo')
  assert.equal(sources.length, 0)
  assert.equal(elements.get('ciallo')!.value.plays, 0)
  api.enabled.value = true
  api.play('ciallo')
  api.toggle()
  assert.equal(api.enabled.value, false)
  assert.equal(sources[0].stops, 1)
  api.play('ciallo')
  assert.equal(sources.length, 1)
})

test('media fallback is exclusive too, without queued Web Audio in a suspended context', () => {
  const { api, sources, elements } = setup('suspended')
  api.enabled.value = true
  api.buffers.set('ciallo', {})
  api.play('ciallo')
  assert.equal(sources.length, 0)
  assert.equal(elements.get('ciallo')!.value.plays, 1)
  const pauses = elements.get('ciallo')!.value.pauses
  api.play('character-angry')
  assert.equal(elements.get('ciallo')!.value.pauses, pauses + 1)
  assert.equal(elements.get('character')!.value.plays, 1)
  api.toggle()
  assert.ok(elements.get('ciallo')!.value.pauses > pauses + 1)
})
