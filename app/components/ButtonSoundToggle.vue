<script setup lang="ts">
const { tx } = useMessages()
const enabled = shallowRef(false)
const ready = shallowRef(false)
const player = useTemplateRef<HTMLAudioElement>('player')
const selection = useTemplateRef<HTMLAudioElement>('selection')
const parameters = useTemplateRef<HTMLAudioElement>('parameters')
const character = useTemplateRef<HTMLAudioElement>('character')
const expand = useTemplateRef<HTMLAudioElement>('expand')
const demo = useTemplateRef<HTMLAudioElement>('demo')
const toast = useTemplateRef<HTMLAudioElement>('toast')
const experience = useTemplateRef<HTMLAudioElement>('experience')
const preferenceKey = '2fa-hot:button-sound'
type SoundSample =
  'click' | 'select' | 'parameters' | 'character' | 'expand' | 'demo' | 'experience' | 'toast'
type Sound =
  | 'click'
  | 'select'
  | 'parameters'
  | 'character'
  | 'expand'
  | 'demo'
  | 'success'
  | 'stone-on'
  | 'stone-off'
  | 'experience'
  | 'toast'
const samples: Record<SoundSample, string> = {
  click: '/audio/minecraft-click.ogg',
  select: '/audio/minecraft-select.ogg',
  parameters: '/audio/minecraft-parameters.ogg',
  character: '/audio/minecraft-character.ogg',
  expand: '/audio/minecraft-expand.ogg',
  demo: '/audio/minecraft-demo.ogg',
  experience: '/audio/minecraft-experience.ogg',
  toast: '/audio/minecraft-toast.ogg'
}
const profiles: Record<Sound, { sample: SoundSample; rate: number; gain: number }> = {
  click: { sample: 'click', rate: 1, gain: 1 },
  select: { sample: 'select', rate: 1, gain: 0.7 },
  parameters: { sample: 'parameters', rate: 1, gain: 0.9 },
  character: { sample: 'character', rate: 1, gain: 0.65 },
  expand: { sample: 'expand', rate: 1, gain: 0.65 },
  demo: { sample: 'demo', rate: 1, gain: 0.5 },
  success: { sample: 'experience', rate: 1, gain: 0.25 },
  'stone-on': { sample: 'click', rate: 0.6, gain: 0.9 },
  'stone-off': { sample: 'click', rate: 0.5, gain: 0.85 },
  experience: { sample: 'experience', rate: 1, gain: 1 },
  toast: { sample: 'toast', rate: 1, gain: 0.75 / 0.35 }
}
let context: AudioContext | undefined
let gain: GainNode | undefined
const buffers = new Map<SoundSample, AudioBuffer>()
const voices = new Set<AudioBufferSourceNode>()
const loading = new AbortController()
let prepared = false
let disposed = false

function prepare() {
  if (prepared || disposed || !enabled.value) return
  prepared = true
  try {
    context = new AudioContext({ latencyHint: 'interactive' })
    gain = context.createGain()
    gain.gain.value = 0.35
    gain.connect(context.destination)
    const audioContext = context
    for (const [sample, source] of Object.entries(samples) as [SoundSample, string][]) {
      void fetch(source, { signal: loading.signal })
        .then((response) => {
          if (!response.ok) throw new Error('Audio unavailable')
          return response.arrayBuffer()
        })
        .then((data) => audioContext.decodeAudioData(data))
        .then((buffer) => {
          if (!disposed) buffers.set(sample, buffer)
        })
        .catch(() => {
          /* The preloaded audio element remains the fallback. */
        })
    }
  } catch {
    /* Older browsers use the audio elements below. */
  }
}
function unlock() {
  if (!enabled.value) return
  prepare()
  if (context?.state === 'suspended') void context.resume().catch(() => {})
}
function stop() {
  for (const voice of voices) {
    voice.stop()
    voice.disconnect()
  }
  voices.clear()
  player.value?.pause()
  selection.value?.pause()
  parameters.value?.pause()
  character.value?.pause()
  expand.value?.pause()
  demo.value?.pause()
  experience.value?.pause()
  toast.value?.pause()
}
function play(kind: Sound = 'click') {
  if (!enabled.value || disposed) return
  unlock()
  const profile = profiles[kind]
  const buffer = buffers.get(profile.sample)
  if (context && gain && buffer && context.state !== 'closed') {
    // A fresh source avoids media-element seek latency and supports rapid taps.
    if (voices.size >= 4) {
      const oldest = voices.values().next().value
      oldest?.stop()
      if (oldest) voices.delete(oldest)
    }
    const voice = context.createBufferSource()
    voice.buffer = buffer
    voice.playbackRate.value = profile.rate
    const voiceGain = context.createGain()
    voiceGain.gain.value = profile.gain
    voice.connect(voiceGain)
    voiceGain.connect(gain)
    voice.onended = () => {
      voices.delete(voice)
      voice.disconnect()
      voiceGain.disconnect()
    }
    voices.add(voice)
    voice.start()
    return
  }
  const fallback = {
    click: player.value,
    select: selection.value,
    parameters: parameters.value,
    character: character.value,
    expand: expand.value,
    demo: demo.value,
    experience: experience.value,
    toast: toast.value
  }[profile.sample]
  if (fallback) {
    fallback.currentTime = 0
    fallback.playbackRate = profile.rate
    fallback.preservesPitch = false
    fallback.volume = Math.min(1, 0.35 * profile.gain)
    void fallback.play().catch(() => {})
  }
}
function isSound(value: unknown): value is Sound {
  return typeof value === 'string' && Object.hasOwn(profiles, value)
}
function scriptedSound(event: Event) {
  const kind = (event as CustomEvent).detail
  play(isSound(kind) ? kind : 'click')
}
function toggle() {
  const next = !enabled.value
  if (next) {
    enabled.value = true
    prepare()
    play('stone-on')
  } else {
    play('stone-off')
    enabled.value = false
  }
  try {
    localStorage.setItem(preferenceKey, next ? 'on' : 'off')
  } catch {
    /* In-memory preference still works. */
  }
}
function controlFor(target: EventTarget | null) {
  if (!(target instanceof Element)) return null
  const control = target.closest(
    'button, a[href], input[type="checkbox"], [role="button"], [role="checkbox"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"]'
  )
  return control &&
    !control.closest(
      '.selection-sound-item, [data-sound-toggle], [data-sound-custom], [disabled], [aria-disabled="true"]'
    )
    ? control
    : null
}
let touch: { id: number; x: number; y: number; control: Element; moved: boolean } | undefined
let lastPointer: { control: Element; at: number } | undefined
let lastKeyboard: { control: Element; at: number } | undefined
function pointerSound(control: Element) {
  play(controlSound(control))
  lastPointer = { control, at: performance.now() }
}
function controlSound(control: Element): Sound {
  if (control.matches('input[type="checkbox"], [role="checkbox"], [role="menuitemcheckbox"]'))
    return 'select'
  if (control.matches('[role="switch"], [aria-pressed]')) {
    const active =
      control.getAttribute('aria-checked') === 'true' ||
      control.getAttribute('aria-pressed') === 'true'
    return active ? 'stone-off' : 'stone-on'
  }
  return 'click'
}
function handlePointerDown(event: PointerEvent) {
  if (!event.isTrusted || event.button !== 0 || !event.isPrimary) return
  unlock()
  const control = controlFor(event.target)
  if (!control || !enabled.value) return
  if (event.pointerType === 'touch')
    touch = { id: event.pointerId, x: event.clientX, y: event.clientY, control, moved: false }
  else pointerSound(control)
}
function handlePointerMove(event: PointerEvent) {
  if (
    touch?.id === event.pointerId &&
    Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 10
  )
    touch.moved = true
}
function handlePointerUp(event: PointerEvent) {
  if (touch?.id !== event.pointerId) return
  const press = touch
  touch = undefined
  if (!press.moved && controlFor(event.target) === press.control) pointerSound(press.control)
}
function cancelPointer() {
  touch = undefined
}
function handleClick(event: MouseEvent) {
  if (!event.isTrusted || !enabled.value) return
  const control = controlFor(event.target)
  if (!control) return
  if (
    event.detail === 0 &&
    lastKeyboard?.control === control &&
    performance.now() - lastKeyboard.at < 1000
  ) {
    lastKeyboard = undefined
    return
  }
  if (
    event.detail > 0 &&
    lastPointer?.control === control &&
    performance.now() - lastPointer.at < 1000
  ) {
    lastPointer = undefined
    return
  }
  play(controlSound(control))
}
function handleKey(event: KeyboardEvent) {
  if (!event.isTrusted) return
  unlock()
  if (
    !enabled.value ||
    event.repeat ||
    event.isComposing ||
    (event.key !== 'Enter' && event.key !== ' ')
  )
    return
  const control = controlFor(event.target)
  if (!control || (event.key === ' ' && control.matches('a[href]'))) return
  play(controlSound(control))
  lastKeyboard = { control, at: performance.now() }
}
function syncPreference(event: StorageEvent) {
  if (event.key !== preferenceKey && event.key !== null) return
  enabled.value = event.key !== null && event.newValue === 'on'
  if (enabled.value) prepare()
  else stop()
}
onMounted(() => {
  try {
    enabled.value = localStorage.getItem(preferenceKey) === 'on'
  } catch {
    enabled.value = false
  }
  ready.value = true
  prepare()
  document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true })
  document.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true })
  document.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true })
  document.addEventListener('pointercancel', cancelPointer, true)
  document.addEventListener('keydown', handleKey, true)
  document.addEventListener('click', handleClick, true)
  window.addEventListener('storage', syncPreference)
  window.addEventListener('2fa-ui-sound', scriptedSound)
})
onBeforeUnmount(() => {
  disposed = true
  loading.abort()
  stop()
  if (context) void context.close().catch(() => {})
  document.removeEventListener('pointerdown', handlePointerDown, true)
  document.removeEventListener('pointermove', handlePointerMove, true)
  document.removeEventListener('pointerup', handlePointerUp, true)
  document.removeEventListener('pointercancel', cancelPointer, true)
  document.removeEventListener('keydown', handleKey, true)
  document.removeEventListener('click', handleClick, true)
  window.removeEventListener('storage', syncPreference)
  window.removeEventListener('2fa-ui-sound', scriptedSound)
})
</script>

<template>
  <AppHint :text="tx(enabled ? '关闭按钮音效' : '开启按钮音效')"
    ><UButton
      class="icon-button"
      data-sound-toggle
      color="neutral"
      variant="ghost"
      :icon="enabled ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
      :aria-pressed="enabled"
      :aria-label="tx('按钮音效')"
      @click="toggle"
  /></AppHint>
  <audio
    ref="player"
    src="/audio/minecraft-click.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
  <audio
    ref="experience"
    src="/audio/minecraft-experience.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
  <audio
    ref="selection"
    src="/audio/minecraft-select.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
  <audio
    ref="parameters"
    src="/audio/minecraft-parameters.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
  <audio
    ref="character"
    src="/audio/minecraft-character.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
  <audio
    ref="expand"
    src="/audio/minecraft-expand.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
  <audio
    ref="demo"
    src="/audio/minecraft-demo.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
  <audio
    ref="toast"
    src="/audio/minecraft-toast.ogg"
    :preload="ready && enabled ? 'auto' : 'none'"
    aria-hidden="true"
  />
</template>
