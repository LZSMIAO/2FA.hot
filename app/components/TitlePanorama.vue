<script setup lang="ts">
const { tx } = useMessages()
const scenes = ['1.21', '1.20.1', '1.19.4', '1.18.2', '1.17.1', '1.16.5', '1.14.4'] as const
const selected = useCookie<string>('2fa-panorama', {
  default: () => '1.20.1',
  maxAge: 31536000,
  sameSite: 'lax'
})
const scene = computed(() =>
  scenes.includes(selected.value as (typeof scenes)[number]) ? selected.value : '1.20.1'
)
function faceUrl(version: string, face: number) {
  return `/panorama/${version === '1.20.1' ? '' : `${version}/`}panorama_${face}.png`
}
const loading = shallowRef(false)
const loadError = shallowRef(false)
let disposed = false
async function changeScene(version: string) {
  if (loading.value || version === scene.value) return
  loading.value = true
  loadError.value = false
  try {
    await Promise.all(
      Array.from({ length: 6 }, async (_, face) => {
        const image = new Image()
        image.src = faceUrl(version, face)
        await image.decode()
      })
    )
    if (!disposed) selected.value = version
  } catch {
    if (!disposed) loadError.value = true
  } finally {
    if (!disposed) loading.value = false
  }
}
const sceneItems = computed(() =>
  scenes.map((version) => ({
    label: `Minecraft ${version}`,
    version,
    type: 'checkbox' as const,
    checked: scene.value === version,
    disabled: loading.value,
    onSelect: () => changeScene(version)
  }))
)
const playbackPaused = useCookie<boolean>('2fa-panorama-paused', {
  default: () => true,
  maxAge: 31536000,
  sameSite: 'lax'
})
const paused = computed(() => playbackPaused.value !== false)
const mobileMotion = shallowRef(false)
const cube = useTemplateRef<HTMLElement>('cube')
let frame = 0
let lastFrame = 0
let angle = 0
function stopFrame() {
  cancelAnimationFrame(frame)
  frame = 0
  lastFrame = 0
}
function rotateFrame(now: number) {
  if (!lastFrame) lastFrame = now
  const elapsed = now - lastFrame
  if (elapsed >= 1000 / 30) {
    angle = (angle + Math.min(elapsed, 100) / 500) % 360
    if (cube.value)
      cube.value.style.transform = `translateZ(calc(var(--face-size) / 2)) rotateX(-8deg) rotateY(${angle}deg)`
    lastFrame = now
  }
  frame = requestAnimationFrame(rotateFrame)
}
// Persist explicit playback choices; visibility and reduced motion remain temporary overrides.
function toggleAnimation() {
  playbackPaused.value = !paused.value
}
const hidden = shallowRef(false)
const ready = shallowRef(false)
let mobile: MediaQueryList | undefined
function updateMobile() {
  mobileMotion.value = !!mobile?.matches
}
const reduced = shallowRef(false)
let preference: MediaQueryList | undefined
function updateVisibility() {
  hidden.value = document.hidden
}
function updatePreference() {
  reduced.value = preference?.matches || false
}
onMounted(() => {
  mobile = window.matchMedia('(max-width: 700px), (max-height: 500px) and (pointer: coarse)')
  updateMobile()
  mobile.addEventListener('change', updateMobile)
  ready.value = true
  preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updatePreference()
  updateVisibility()
  preference.addEventListener('change', updatePreference)
  document.addEventListener('visibilitychange', updateVisibility)
})
watch(
  () => ready.value && mobileMotion.value && !paused.value && !hidden.value && !reduced.value,
  (running) => {
    stopFrame()
    if (running) frame = requestAnimationFrame(rotateFrame)
    if (!mobileMotion.value && cube.value) cube.value.style.removeProperty('transform')
  },
  { flush: 'post' }
)
onBeforeUnmount(() => {
  disposed = true
  stopFrame()
  mobile?.removeEventListener('change', updateMobile)
  preference?.removeEventListener('change', updatePreference)
  document.removeEventListener('visibilitychange', updateVisibility)
})
</script>

<template>
  <div
    class="title-panorama"
    :class="{
      'mobile-motion': mobileMotion,
      paused: !ready || paused || hidden || reduced,
      'is-running': ready && !paused && !hidden && !reduced
    }"
    aria-hidden="true"
  >
    <div class="panorama-camera">
      <div ref="cube" class="panorama-cube">
        <div
          v-for="face in 6"
          :key="face"
          class="panorama-face"
          :class="`face-${face - 1}`"
          :style="{ backgroundImage: `url(${faceUrl(scene, face - 1)})` }"
        />
      </div>
    </div>
    <div class="panorama-light" />
    <div class="panorama-shade" />
  </div>
  <div v-if="ready" class="panorama-controls">
    <UDropdownMenu
      :items="sceneItems"
      :modal="false"
      :content="{ side: 'top', align: 'end', sideOffset: 8 }"
      :ui="{
        content: 'panorama-menu',
        viewport: 'panorama-menu-viewport',
        item: 'panorama-menu-item',
        itemTrailingIcon: 'text-primary size-4'
      }"
    >
      <AppHint :text="tx('切换背景')"
        ><button class="panorama-control" :disabled="loading" :aria-label="tx('切换背景')">
          <UIcon
            :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-image'"
            :class="{ 'animate-spin': loading }"
          /></button
      ></AppHint>
      <template #item-leading="{ item }">
        <img
          :src="`/panorama/previews/${item.version}.png`"
          class="panorama-preview"
          alt=""
          width="48"
          height="32"
        />
      </template>
    </UDropdownMenu>
    <AppHint v-if="!reduced" :text="tx(paused ? '继续' : '暂停')"
      ><button
        class="panorama-control"
        :aria-label="tx(paused ? '继续' : '暂停')"
        :aria-pressed="!paused"
        @click="toggleAnimation"
      >
        <UIcon :name="paused ? 'i-lucide-play' : 'i-lucide-pause'" /></button
    ></AppHint>
  </div>
  <ActionHint
    :open="loadError"
    :message="tx('无法完成操作，请重试。')"
    icon="i-lucide-circle-alert"
    @close="loadError = false"
  />
</template>

<style scoped>
.panorama-preview {
  width: 48px;
  height: 32px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--ui-border);
  image-rendering: pixelated;
}
:global(.panorama-menu) {
  width: 208px;
  min-width: 0;
  max-width: calc(100vw - 24px);
}
:global(.panorama-menu-viewport) {
  max-height: min(232px, var(--reka-dropdown-menu-content-available-height, 60vh));
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
}
:global(.panorama-menu-item) {
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 6px;
  font-size: 13px;
}
:global(.panorama-menu-item[data-state='checked']) {
  background: var(--wash);
}
.title-panorama {
  isolation: isolate;
  --face-size: max(100vw, 100svh);
  position: fixed;
  inset: 0;
  width: 100vw;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: #667e80;
}
.panorama-camera {
  position: absolute;
  inset: 0;
  perspective: calc(var(--face-size) / 2);
  filter: saturate(0.95) contrast(1.02);
}
.panorama-cube {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--face-size);
  height: var(--face-size);
  margin-left: calc(var(--face-size) / -2);
  margin-top: calc(var(--face-size) / -2);
  transform-style: preserve-3d;
  transform: translateZ(calc(var(--face-size) / 2)) rotateX(-8deg) rotateY(0deg);
  animation: panorama-turn 180s linear infinite;
}
.panorama-face {
  position: absolute;
  inset: -1px;
  background-size: 100% 100%;
  backface-visibility: hidden;
}
.face-0 {
  transform: translateZ(calc(var(--face-size) / -2));
}
.face-1 {
  transform: rotateY(-90deg) translateZ(calc(var(--face-size) / -2));
}
.face-2 {
  transform: rotateY(-180deg) translateZ(calc(var(--face-size) / -2));
}
.face-3 {
  transform: rotateY(-270deg) translateZ(calc(var(--face-size) / -2));
}
.face-4 {
  transform: rotateX(-90deg) translateZ(calc(var(--face-size) / -2));
}
.face-5 {
  transform: rotateX(90deg) translateZ(calc(var(--face-size) / -2));
}
.panorama-light {
  position: absolute;
  /* Keep the moving light's edges outside the viewport for the entire cycle. */
  inset: -20%;
  background: radial-gradient(ellipse at 78% 8%, #fff3cb80, transparent 55%);
  mix-blend-mode: screen;
  opacity: 0.16;
  animation: panorama-daylight 36s ease-in-out infinite alternate;
}
.panorama-shade {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, #10141033, #1014104d 65%, #080c1080);
}
:global(.dark .title-panorama .panorama-camera) {
  filter: saturate(0.9) contrast(1.08);
}
:global(.dark .title-panorama .panorama-shade) {
  background: radial-gradient(ellipse at center, #10141099, #101410a3 65%, #080c10bf);
}
:global(.dark .title-panorama .panorama-light) {
  opacity: 0.12;
}
.paused .panorama-cube,
.paused .panorama-light {
  animation-play-state: paused;
}
.panorama-controls {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 10;
  display: flex;
  gap: 0.375rem;
}
.panorama-control {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--ui-border);
  background: var(--panel);
  color: var(--ui-text);
  font-size: 0.8125rem;
}
@keyframes panorama-turn {
  to {
    transform: translateZ(calc(var(--face-size) / 2)) rotateX(-8deg) rotateY(360deg);
  }
}
@keyframes panorama-daylight {
  to {
    transform: translateX(-8%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .panorama-cube,
  .panorama-light {
    animation: none;
  }
}
.mobile-motion .panorama-cube {
  animation: none;
}

.panorama-control {
  width: 2.25rem;
  min-height: 2.25rem;
  justify-content: center;
  padding: 0;
  opacity: 0.65;
}
.panorama-control:hover,
.panorama-control:focus-visible {
  opacity: 1;
}
@media (max-width: 700px), (max-height: 500px) and (pointer: coarse) {
  .title-panorama {
    inset: 0 auto auto 0;
    width: 100%;
    height: 100vh;
    height: 100lvh;
    --face-size: max(100vw, 100vh);
    --face-size: max(100vw, 100lvh);
    contain: strict;
    transform: translateZ(0);
    backface-visibility: hidden;
  }
  .panorama-camera,
  .panorama-light,
  .panorama-shade {
    transform: translateZ(0);
  }
  .panorama-controls {
    position: absolute;
    right: 0.5rem;
    top: 5rem;
    bottom: auto;
  }
  .panorama-control {
    width: 2.75rem;
    min-height: 2.75rem;
    border: 0;
    background: transparent;
  }
}
</style>
