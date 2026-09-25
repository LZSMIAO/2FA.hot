<script setup lang="ts">
/*
 * The backdrop's choices on a phone, where its own controls are off screen:
 * every scene at once as pictures, rather than menus two levels deep that
 * opened sideways over each other on a narrow screen. A sheet from the
 * bottom there, a dialog on a wider touch screen.
 */
import {
  customPanoramaScene,
  flatPanoramaOf,
  panoramaGroups
} from '~/composables/usePanoramaPreference'

const open = defineModel<boolean>('open', { default: false })
const { tx } = useMessages()
const { selected, playbackPaused, custom } = usePanoramaPreference()
// A still image, built in or the visitor's own, has nothing to play.
const playable = computed(
  () =>
    !(
      (selected.value === customPanoramaScene && custom.value?.layout === 'flat') ||
      flatPanoramaOf(selected.value)
    )
)
const playing = computed(() => playbackPaused.value === false)
function choose(scene: string) {
  selected.value = scene
}
// The panorama owns the file input and storage; ask it to act.
const upload = () => window.dispatchEvent(new Event('2fa-panorama-upload'))
const remove = () => window.dispatchEvent(new Event('2fa-panorama-remove'))
</script>
<template>
  <UModal
    v-model:open="open"
    :title="tx('切换背景')"
    :ui="{
      overlay: 'backdrop-sheet-overlay',
      content: 'backdrop-sheet',
      body: 'backdrop-sheet-body'
    }"
  >
    <template #actions>
      <UButton
        v-if="playable"
        class="backdrop-playback"
        color="neutral"
        variant="ghost"
        :icon="playing ? 'i-lucide-pause' : 'i-lucide-play'"
        :aria-pressed="playing"
        @click="playbackPaused = playing"
        >{{ tx(playing ? '暂停' : '继续') }}</UButton
      >
    </template>
    <template #body>
      <section v-for="group in panoramaGroups" :key="group.label" class="backdrop-group">
        <h3>{{ tx(group.label) }}</h3>
        <div class="backdrop-grid">
          <button
            v-for="entry in group.scenes"
            :key="entry.id"
            type="button"
            class="backdrop-tile"
            :aria-pressed="selected === entry.id"
            @click="choose(entry.id)"
          >
            <img :src="entry.preview" alt="" width="96" height="64" loading="lazy" />
            <span>{{ tx(entry.label) }}</span>
          </button>
        </div>
      </section>
      <section class="backdrop-group">
        <h3>{{ tx('自定义背景') }}</h3>
        <div v-if="custom" class="backdrop-grid">
          <button
            type="button"
            class="backdrop-tile"
            :aria-pressed="selected === customPanoramaScene"
            @click="choose(customPanoramaScene)"
          >
            <img :src="custom.preview" alt="" width="96" height="64" />
            <span>{{ tx('自定义背景') }}</span>
          </button>
        </div>
        <!-- Buttons, not tiles: in a tile's width these labels broke mid-word. -->
        <div class="backdrop-actions">
          <UButton color="neutral" variant="outline" icon="i-lucide-upload" @click="upload">{{
            tx('上传背景图片…')
          }}</UButton>
          <UButton
            v-if="custom"
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="remove"
            >{{ tx('移除自定义背景') }}</UButton
          >
        </div>
      </section>
    </template>
  </UModal>
</template>
<style>
/* Light enough to watch the backdrop change behind it. */
.backdrop-sheet-overlay {
  background: rgb(0 0 0 / 25%);
}
.backdrop-sheet-body {
  display: grid;
  gap: 1.25rem;
  overscroll-behavior: contain;
}
.backdrop-group {
  display: grid;
  gap: 0.5rem;
}
.backdrop-group h3 {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: var(--text-caption);
  font-weight: 600;
}
.backdrop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr));
  gap: 0.5rem;
}
.backdrop-tile {
  display: grid;
  align-content: start;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.25rem;
  border: 2px solid transparent;
  background: var(--wash);
  color: var(--ui-text);
  font-size: var(--text-caption);
  line-height: 1.25;
  text-align: center;
  cursor: pointer;
}
.backdrop-tile img {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border: 1px solid var(--ui-border);
  image-rendering: pixelated;
}
.backdrop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.backdrop-tile span {
  overflow-wrap: anywhere;
}
.backdrop-tile[aria-pressed='true'] {
  border-color: #3c8527;
  color: var(--ui-text-highlighted);
}
.backdrop-tile:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
@media (hover: hover) {
  .backdrop-tile:hover {
    color: var(--ui-text-highlighted);
  }
}
/* Clear of the close button, which sits over the header's end. */
.backdrop-playback {
  margin-inline: auto 2.5rem;
}
/*
 * A sheet along the bottom on a phone, leaving the top of the page, and the
 * backdrop behind it, in view while trying scenes.
 */
@media (max-width: 700px) {
  .backdrop-sheet.backdrop-sheet {
    top: auto;
    bottom: 0;
    left: 0;
    translate: none;
    width: 100%;
    max-width: none;
    max-height: min(36rem, 72dvh);
    border-inline-width: 0;
    border-bottom-width: 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
  .backdrop-sheet.backdrop-sheet[data-state='open'] {
    animation-name: backdrop-sheet-in;
  }
  .backdrop-sheet.backdrop-sheet[data-state='closed'] {
    animation-name: backdrop-sheet-out;
  }
}
@keyframes backdrop-sheet-in {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes backdrop-sheet-out {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}
</style>
