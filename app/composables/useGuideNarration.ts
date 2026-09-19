import { narrationLanguage, narrationSegments, selectNarrationVoice } from '~/utils/guide-narration'

export function useGuideNarration(text: () => string, paused: () => boolean) {
  const { locale } = useI18n()
  const supported = computed(() => !!narrationLanguage(locale.value))
  const enabled = shallowRef(false)
  const speaking = shallowRef(false)
  const issue = shallowRef(false)
  let generation = 0
  let utterance: SpeechSynthesisUtterance | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  let pendingRestart = false

  function stop() {
    generation++
    clearTimeout(timeout)
    if (utterance) window.speechSynthesis.cancel()
    utterance = undefined
    speaking.value = false
    pendingRestart = false
  }
  function fail() {
    stop()
    enabled.value = false
    issue.value = true
  }
  async function restart() {
    stop()
    if (!supported.value) {
      enabled.value = false
      issue.value = false
      return
    }
    if (!enabled.value) return
    if (paused() || document.hidden) {
      pendingRestart = true
      return
    }
    const synth = window.speechSynthesis
    const id = generation
    // Short utterances avoid long-speech stalls in browser speech engines.
    const chunks = narrationSegments(text(), narrationLanguage(locale.value)!)
    speaking.value = chunks.length > 0
    const lang = narrationLanguage(locale.value)!
    // Some browsers populate voices only after the first request.
    if (!synth.getVoices().length) {
      await new Promise<void>((resolve) => {
        const finish = () => {
          clearTimeout(timer)
          synth.removeEventListener('voiceschanged', finish)
          resolve()
        }
        const timer = setTimeout(finish, 1200)
        synth.addEventListener('voiceschanged', finish, { once: true })
      })
    }
    if (id !== generation) return
    if (paused() || document.hidden) {
      speaking.value = false
      pendingRestart = true
      return
    }
    const voice = selectNarrationVoice(synth.getVoices(), lang)
    // Do not let the OS silently pronounce Chinese using an unrelated voice.
    if (!voice) {
      fail()
      return
    }
    function next() {
      if (id !== generation) return
      const chunk = chunks.shift()
      if (!chunk) {
        speaking.value = false
        utterance = undefined
        return
      }
      const speech = new SpeechSynthesisUtterance(chunk.text)
      utterance = speech
      speech.lang = lang
      speech.rate = 1
      speech.voice = voice ?? null
      speech.onstart = () => {
        if (id !== generation) return
        clearTimeout(timeout)
        timeout = setTimeout(fail, 60000)
      }
      speech.onend = () => {
        if (id !== generation) return
        clearTimeout(timeout)
        next()
      }
      speech.onerror = () => {
        if (id === generation) fail()
      }
      timeout = setTimeout(fail, 8000)
      try {
        synth.resume()
        synth.speak(speech)
      } catch {
        fail()
      }
    }
    next()
  }
  function toggle() {
    if (!supported.value) return
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      issue.value = true
      return
    }
    enabled.value = !enabled.value
    issue.value = false
    restart()
  }
  watch(
    [text, locale],
    () => {
      if (enabled.value) restart()
    },
    { flush: 'sync' }
  )
  function syncPause() {
    if (!enabled.value) return
    if (paused() || document.hidden) {
      clearTimeout(timeout)
      if (utterance) window.speechSynthesis.pause()
    } else if (utterance) {
      window.speechSynthesis.resume()
      timeout = setTimeout(fail, 60000)
    } else if (pendingRestart) {
      restart()
    }
  }
  watch(paused, syncPause, { flush: 'sync' })
  function visibilityChanged() {
    syncPause()
  }
  onMounted(() => document.addEventListener('visibilitychange', visibilityChanged))
  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', visibilityChanged)
  })
  return { enabled, speaking, issue, supported, toggle, restart }
}
