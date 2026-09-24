<script setup lang="ts">
import {
  customPanoramaFromFiles,
  loadCustomPanorama,
  removeCustomPanorama,
  saveCustomPanorama,
  type CustomPanorama
} from '~/utils/custom-panorama'
import {
  customPanoramaScene,
  defaultPanoramaScene,
  flatPanoramaOf,
  flatPanoramaUrl,
  isBuiltInScene,
  panoramaGroups
} from '~/composables/usePanoramaPreference'
defineProps<{ bounded?: boolean }>()
const { tx } = useMessages()
const { selected, playbackPaused, custom } = usePanoramaPreference()
const hydrated = shallowRef(false)
const scene = computed(() => {
  if (!hydrated.value) return defaultPanoramaScene
  if (selected.value === customPanoramaScene) return customPanoramaScene
  return isBuiltInScene(selected.value) ? selected.value : defaultPanoramaScene
})
// Object URLs for the stored custom background, in face order.
const customUrls = shallowRef<string[]>([])
/** Whether a scene is one still image rather than six cube faces. */
const isFlat = (version: string) =>
  version === customPanoramaScene ? custom.value?.layout === 'flat' : !!flatPanoramaOf(version)
const flat = computed(() => isFlat(scene.value))
function flatUrl(version: string) {
  return version === customPanoramaScene ? customUrls.value[0] || '' : flatPanoramaUrl(version)
}
function faceUrl(version: string, face: number) {
  if (version === customPanoramaScene) return customUrls.value[face] || ''
  return `/panorama/${version === '1.20.1' ? '' : `${version}/`}panorama_${face}.webp`
}
function applyScene() {
  const root = document.documentElement
  // The custom images are still being read; the head script already cleared the faces.
  if (scene.value === customPanoramaScene && !customUrls.value.length) return
  root.toggleAttribute('data-panorama-flat', flat.value)
  if (flat.value) {
    root.style.setProperty('--panorama-flat', `url(${flatUrl(scene.value)})`)
    // A visitor's own image has no known subject, so it stays centred.
    root.style.setProperty(
      '--panorama-flat-position',
      flatPanoramaOf(scene.value)?.position ?? 'center'
    )
  } else
    for (let face = 0; face < 6; face++)
      root.style.setProperty(`--panorama-face-${face}`, `url(${faceUrl(scene.value, face)})`)
}
watch([scene, customUrls], () => {
  if (hydrated.value) applyScene()
})
const loading = shallowRef(false)
const issue = shallowRef('')
let disposed = false
async function decodeAll(urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      const image = new Image()
      image.src = url
      await image.decode()
    })
  )
}
async function changeScene(version: string) {
  if (loading.value || version === scene.value) return
  loading.value = true
  issue.value = ''
  try {
    await decodeAll(
      isFlat(version)
        ? [flatUrl(version)]
        : Array.from({ length: 6 }, (_, face) => faceUrl(version, face))
    )
    if (!disposed) selected.value = version
  } catch {
    if (!disposed) issue.value = '无法完成操作，请重试。'
  } finally {
    if (!disposed) loading.value = false
  }
}
function showCustom(stored: CustomPanorama | null) {
  customUrls.value.forEach((url) => URL.revokeObjectURL(url))
  customUrls.value = stored ? stored.images.map((image) => URL.createObjectURL(image)) : []
  custom.value = stored ? { layout: stored.layout, preview: customUrls.value[0]! } : null
  try {
    // Lets the head script lay out a still backdrop before the images are read.
    if (stored) localStorage.setItem('2fa-panorama-custom-layout', stored.layout)
    else localStorage.removeItem('2fa-panorama-custom-layout')
  } catch {}
}
async function restoreCustom() {
  let stored: CustomPanorama | null = null
  try {
    stored = await loadCustomPanorama()
  } catch {
    // Storage can be unavailable, e.g. in some private windows.
  }
  if (disposed) return
  showCustom(stored)
  if (!stored && selected.value === customPanoramaScene) selected.value = defaultPanoramaScene
}
const upload = useTemplateRef<HTMLInputElement>('upload')
function chooseUpload() {
  if (!loading.value) upload.value?.click()
}
async function receiveUpload() {
  const files = [...(upload.value?.files || [])]
  if (upload.value) upload.value.value = ''
  if (!files.length) return
  loading.value = true
  issue.value = ''
  try {
    const { layout, images } = customPanoramaFromFiles(files)
    const urls = images.map((image) => URL.createObjectURL(image))
    try {
      await decodeAll(urls)
    } catch {
      throw new Error('无法读取这张图片，请换一张后重试。')
    } finally {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
    const stored = { layout, images }
    await saveCustomPanorama(stored)
    if (disposed) return
    showCustom(stored)
    selected.value = customPanoramaScene
  } catch (cause) {
    const text = (cause as Error).message
    if (!disposed) issue.value = /[\u3400-\u9fff]/.test(text) ? text : '无法完成操作，请重试。'
  } finally {
    if (!disposed) loading.value = false
  }
}
async function removeCustom() {
  if (selected.value === customPanoramaScene) selected.value = defaultPanoramaScene
  try {
    await removeCustomPanorama()
  } catch {}
  if (!disposed) showCustom(null)
}
// The header menu offers the same actions on a phone, where these controls are off screen.
function uploadRequested() {
  chooseUpload()
}
function removeRequested() {
  void removeCustom()
}
const sceneItems = computed(() => [
  // One entry per collection; its scenes open beside it. The entry shows the
  // scene in use when it belongs to that collection, so the choice stays visible.
  panoramaGroups.map((group) => {
    const active = group.scenes.find((entry) => entry.id === scene.value)
    return {
      label: tx(group.label),
      icon: 'i-lucide-images',
      preview: (active ?? group.scenes[0]!).preview,
      children: group.scenes.map((entry) => ({
        label: tx(entry.label),
        preview: entry.preview,
        type: 'checkbox' as const,
        checked: scene.value === entry.id,
        disabled: loading.value,
        onSelect: () => changeScene(entry.id)
      }))
    }
  }),
  [
    ...(custom.value
      ? [
          {
            label: tx('自定义背景'),
            preview: custom.value.preview,
            type: 'checkbox' as const,
            checked: scene.value === customPanoramaScene,
            disabled: loading.value,
            onSelect: () => changeScene(customPanoramaScene)
          }
        ]
      : []),
    {
      label: tx('上传背景图片…'),
      icon: 'i-lucide-upload',
      disabled: loading.value,
      onSelect: chooseUpload
    },
    ...(custom.value
      ? [{ label: tx('移除自定义背景'), icon: 'i-lucide-trash-2', onSelect: removeCustom }]
      : [])
  ]
])
const paused = computed(() => !hydrated.value || playbackPaused.value !== false)
const mobileMotion = shallowRef(false)
const backdrop = useTemplateRef<HTMLElement>('backdrop')
const screen = useTemplateRef<HTMLElement>('screen')
usePanoramaViewport(backdrop, mobileMotion, screen)
const cube = useTemplateRef<HTMLElement>('cube')
let frame = 0
let lastFrame = 0
let angle = 0
let initialAngle = 0
function saveAngle() {
  if (!ready.value || !cube.value) return
  const rotation = cube.value
    .getAnimations()
    .find(
      (animation) =>
        animation instanceof CSSAnimation && animation.animationName.startsWith('panorama-turn')
    )
  const currentAngle = mobileMotion.value
    ? angle
    : (initialAngle + Number(rotation?.currentTime ?? 0) / 500) % 360
  try {
    localStorage.setItem('2fa-panorama-angle', String(currentAngle))
  } catch {}
}
watch(
  playbackPaused,
  (value) => {
    if (value) saveAngle()
  },
  { flush: 'post' }
)
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
  if (hidden.value) saveAngle()
}
function updatePreference() {
  reduced.value = preference?.matches || false
}
onMounted(() => {
  initialAngle =
    Number.parseFloat(document.documentElement.style.getPropertyValue('--panorama-angle')) || 0
  angle = initialAngle
  hydrated.value = true
  applyScene()
  void restoreCustom()
  window.addEventListener('2fa-panorama-upload', uploadRequested)
  window.addEventListener('2fa-panorama-remove', removeRequested)
  mobile = window.matchMedia('(max-width: 700px), (pointer: coarse)')
  updateMobile()
  mobile.addEventListener('change', updateMobile)
  ready.value = true
  preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  updatePreference()
  updateVisibility()
  preference.addEventListener('change', updatePreference)
  document.addEventListener('visibilitychange', updateVisibility)
  window.addEventListener('pagehide', saveAngle)
  // Keep the pre-paint flag true once the page takes over the playback state.
  watch(
    paused,
    (value) => document.documentElement.toggleAttribute('data-panorama-playing', !value),
    { immediate: true }
  )
})
watch(
  () => ready.value && mobileMotion.value && !paused.value && !hidden.value && !reduced.value,
  (running) => {
    stopFrame()
    if (running) frame = requestAnimationFrame(rotateFrame)
    if (cube.value) {
      if (mobileMotion.value)
        cube.value.style.transform = `translateZ(calc(var(--face-size) / 2)) rotateX(-8deg) rotateY(${angle}deg)`
      else cube.value.style.removeProperty('transform')
    }
  },
  { flush: 'post' }
)
onBeforeUnmount(() => {
  saveAngle()
  disposed = true
  stopFrame()
  mobile?.removeEventListener('change', updateMobile)
  preference?.removeEventListener('change', updatePreference)
  document.removeEventListener('visibilitychange', updateVisibility)
  window.removeEventListener('pagehide', saveAngle)
  window.removeEventListener('2fa-panorama-upload', uploadRequested)
  window.removeEventListener('2fa-panorama-remove', removeRequested)
  showCustom(null)
})
</script>

<template>
  <div :class="{ 'panorama-boundary': bounded }">
    <div
      ref="backdrop"
      class="title-panorama"
      :class="{
        'mobile-motion': mobileMotion,
        paused: !ready || paused || hidden || reduced,
        'is-running': ready && !paused && !hidden && !reduced
      }"
      aria-hidden="true"
    >
      <div ref="screen" class="panorama-screen" />
      <div class="panorama-scene">
        <div class="panorama-camera">
          <div ref="cube" class="panorama-cube">
            <div
              v-for="face in 6"
              :key="face"
              class="panorama-face"
              :class="`face-${face - 1}`"
              :style="{
                backgroundImage: `var(--panorama-face-${face - 1}, url(${faceUrl('1.20.1', face - 1)}))`
              }"
            />
          </div>
        </div>
        <div class="panorama-flat" />
        <div class="panorama-light" />
        <div class="panorama-shade" />
      </div>
    </div>
  </div>
  <div class="panorama-controls">
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
          v-if="item.preview"
          :src="item.preview"
          class="panorama-preview"
          alt=""
          width="48"
          height="32"
        />
        <span v-else class="panorama-preview panorama-action-icon"
          ><UIcon :name="item.icon"
        /></span>
      </template>
    </UDropdownMenu>
    <AppHint v-if="!flat" :text="tx(paused ? '继续' : '暂停')"
      ><button
        class="panorama-control panorama-playback"
        :aria-label="tx(paused ? '继续' : '暂停')"
        :aria-pressed="!paused"
        @click="toggleAnimation"
      >
        <span class="panorama-playback-icon"
          ><UIcon name="i-lucide-play" /><UIcon name="i-lucide-pause"
        /></span></button
    ></AppHint>
  </div>
  <input
    ref="upload"
    type="file"
    class="sr-only"
    accept="image/png,image/jpeg,image/webp"
    multiple
    tabindex="-1"
    aria-hidden="true"
    @change="receiveUpload"
  />
  <ActionHint
    :open="!!issue"
    :message="tx(issue)"
    icon="i-lucide-circle-alert"
    @close="issue = ''"
  />
</template>

<style scoped>
.panorama-boundary {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  /* Clip fixed paint at the document edge, including Safari's moving bottom inset.
     Unlike a transform or paint containment, this keeps the camera viewport-fixed. */
  clip-path: inset(0);
}
.panorama-preview {
  width: 48px;
  height: 32px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--ui-border);
  image-rendering: pixelated;
}
.panorama-action-icon {
  display: grid;
  place-items: center;
  border-style: dashed;
  color: var(--ui-text-muted);
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
  /* Clip the scene to the visible page without making the document wider. */
  width: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  /*
   * Safari 26 and later fill the area behind their bottom bar with the
   * background colour of a fixed element on that edge, and this layer spans
   * it. A grey-teal loading tone here showed as a pale slab under the bar
   * whenever the footer was not at the bottom; the page's own colour matches
   * the header and footer instead.
   */
  background: var(--canvas);
}
/* One screen tall however tall the backdrop is, for measuring the camera's size. */
.panorama-screen {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: var(--panorama-height, 100lvh);
  visibility: hidden;
}
.panorama-scene {
  position: absolute;
  top: 0;
  left: 0;
  /* Keep the camera and lighting steady when a scrollbar appears or a dialog locks it. */
  width: 100vw;
  height: 100%;
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
  transform: translateZ(calc(var(--face-size) / 2)) rotateX(-8deg)
    rotateY(var(--panorama-angle, 0deg));
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
.panorama-flat {
  position: absolute;
  inset: 0;
  display: none;
  background: var(--panorama-flat) var(--panorama-flat-position, center) / cover no-repeat;
}
/* A single uploaded image is a still backdrop in place of the cube. */
:global(html[data-panorama-flat] .title-panorama .panorama-flat) {
  display: block;
}
:global(html[data-panorama-flat] .title-panorama .panorama-camera) {
  display: none;
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
  /*
   * Fixed positioning resolves against the viewport minus the scrollbar, so a
   * dialog's scroll lock - which hides the scrollbar and pads the body instead
   * - would slide these controls sideways by the scrollbar's width. Add that
   * width back only once the scrollbar is gone so they stay put.
   */
  right: max(1rem, calc(1rem + 100% - 100vw + var(--page-scrollbar-width, 0px)));
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
    transform: translateZ(calc(var(--face-size) / 2)) rotateX(-8deg)
      rotateY(calc(var(--panorama-angle, 0deg) + 360deg));
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
/* An inline wrapper sat the glyph on the text baseline, about 2px above the image icon's. */
.panorama-playback-icon {
  display: grid;
  place-items: center;
}
@media (prefers-reduced-motion: reduce) {
  .panorama-playback {
    display: none;
  }
}
/*
 * Every touch device, not only a phone: a tablet ran the desktop path, where
 * the backdrop is a full-size 3D cube it cannot composite smoothly, and where
 * a keyboard opening under a fixed viewport height shifts the whole scene.
 */
@media (max-width: 700px), (pointer: coarse) {
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
  /*
   * iOS Safari never draws a fixed or sticky layer below the line its bottom
   * bar starts at, and fills the rest with a flat colour: a pale band under
   * the bar. It also moves such layers apart from the page when the keyboard
   * opens or the page bounces. Measured in the iOS 27 simulator, only content
   * that scrolls with the page reaches the screen's edge. So on iOS the
   * backdrop is part of the page, covering all of it and scrolling with it.
   * The camera stays sized and centred on the first screen, so the top of the
   * page looks as before; further down the scene carries on below it.
   */
  :global(html[data-ios] .title-panorama) {
    position: absolute;
    height: 100%;
    --panorama-screen: var(--panorama-height, 100lvh);
    --face-size: max(100vw, var(--panorama-screen));
    /* Keep positioning out of iOS's 3D compositing layer. */
    contain: none;
    transform: none;
    backface-visibility: visible;
  }
  :global(html[data-ios] .title-panorama .panorama-camera) {
    perspective-origin: 50% calc(var(--panorama-screen) / 2);
  }
  :global(html[data-ios] .title-panorama .panorama-cube) {
    top: calc(var(--panorama-screen) / 2);
  }
  :global(html[data-ios] .title-panorama .panorama-light) {
    top: calc(var(--panorama-screen) * -0.2);
    bottom: auto;
    height: calc(var(--panorama-screen) * 1.4);
  }
  /* The vignette keeps the first screen's shape; below it the edge tone carries on. */
  :global(html[data-ios] .title-panorama .panorama-shade) {
    background: radial-gradient(
      ellipse calc(50vw * 1.4142) calc(var(--panorama-screen) * 0.7071) at 50%
        calc(var(--panorama-screen) / 2),
      #10141033,
      #1014104d 65%,
      #080c1080
    );
  }
  :global(html.dark[data-ios] .title-panorama .panorama-shade) {
    background: radial-gradient(
      ellipse calc(50vw * 1.4142) calc(var(--panorama-screen) * 0.7071) at 50%
        calc(var(--panorama-screen) / 2),
      #10141099,
      #101410a3 65%,
      #080c10bf
    );
  }
  /* A still image keeps the first screen's framing and continues as its own
     reflection, fading out, rather than stretching to the page's height. */
  :global(html[data-ios] .title-panorama .panorama-flat) {
    bottom: auto;
    height: var(--panorama-screen);
  }
  :global(html[data-ios] .title-panorama .panorama-flat::after) {
    content: '';
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    height: 100%;
    background: inherit;
    transform: scaleY(-1);
    mask-image: linear-gradient(to top, #000 30%, transparent);
  }
  .panorama-camera,
  .panorama-light,
  .panorama-shade {
    transform: translateZ(0);
  }
  .panorama-controls {
    /* The header menu carries these at this width: the panorama's own strip
       lands above the viewport, where nothing can reach it. */
    display: none;
  }
  .panorama-control {
    width: 2.75rem;
    min-height: 2.75rem;
    border: 0;
    background: transparent;
  }
}
</style>
