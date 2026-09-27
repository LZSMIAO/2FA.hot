<script setup lang="ts">
/*
 * One setting in the row under the tool: offline use, autosave. With a mouse
 * the icon stands alone, coloured when on. Where the icon is the switch
 * (offline use) a click switches it and the tip says what a click does. Where
 * the icon is a link (autosave's opens the history page, which has the same
 * switch), hovering it opens a box above it with the name and a switch, the
 * only way to switch it there. Touch has no hover (ore.css hides the tips
 * there), so the name is written out beside a switch and the icon is the link.
 * Both are in the page; the pointer decides which shows.
 */
defineProps<{
  icon: string
  /** Written beside the switch on touch. */
  name: string
  /** What pressing does: the switch's accessible name, and the tip. */
  action: string
  checked: boolean
  disabled?: boolean
  /** Where the icon leads on touch, and its accessible name. */
  to: string
  linkLabel: string
  /** The icon is that link with a mouse too, rather than a second switch. */
  iconLinks?: boolean
  /** Once on, the hover box says this instead of offering the switch again. */
  onTip?: string
  /** A setting that cannot be changed here shows no switch, only how it stands. */
  status?: string
  /** No switch in the installed app, from the first paint (before status is known). */
  fixedInApp?: boolean
  /** The touch icon in the accent colour, as offline use does with no network. */
  lit?: boolean
}>()
const emit = defineEmits<{ toggle: [] }>()

/*
 * Switched from inside the box, the box closes and stays shut until the
 * pointer comes back to the icon. Turning autosave on can open a dialog, and
 * the pointer, still resting where the box had been, opened it again over it.
 */
const boxOpen = shallowRef(false)
let heldShut = false
const popoverOpen = computed({
  get: () => boxOpen.value,
  set: (open: boolean) => {
    if (open && heldShut) return
    boxOpen.value = open
  }
})
function toggleFromBox() {
  heldShut = true
  popoverOpen.value = false
  emit('toggle')
}
// The box opens after a short delay, so this runs before it would.
function pointerBack() {
  heldShut = false
}
</script>

<template>
  <!-- On the wrapper: the hover trigger replaces the icon's own pointer listeners. -->
  <div
    class="summary-setting"
    :class="{ 'is-fixed-in-app': fixedInApp }"
    @pointerenter="pointerBack"
  >
    <UPopover
      v-if="iconLinks"
      v-model:open="popoverOpen"
      mode="hover"
      :open-delay="80"
      :close-delay="200"
      arrow
      :content="{ side: 'top', align: 'center', sideOffset: 4 }"
      :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
    >
      <NuxtLink :to="to" class="setting-icon" :class="{ 'is-on': checked }" :aria-label="linkLabel"
        ><UIcon :name="icon"
      /></NuxtLink>
      <template #content>
        <span v-if="checked && onTip">{{ onTip }}</span>
        <div v-else class="setting-pop-row">
          <span>{{ name }}</span>
          <PixelSwitch
            :checked="checked"
            :label="action"
            :disabled="disabled"
            @toggle="toggleFromBox"
          />
        </div>
      </template>
    </UPopover>
    <AppHint v-else :text="status || action"
      ><button
        v-if="!status"
        type="button"
        role="switch"
        class="setting-icon"
        :class="{ 'is-on': checked }"
        :aria-checked="checked"
        :aria-label="action"
        :disabled="disabled"
        @click="$emit('toggle')"
      >
        <UIcon :name="icon" /></button
      ><span
        v-else
        class="setting-icon is-static"
        :class="{ 'is-on': checked }"
        role="img"
        :aria-label="status"
        ><UIcon :name="icon" /></span
    ></AppHint>
    <span class="setting-touch">
      <NuxtLink :to="to" class="setting-link" :class="{ 'is-lit': lit }" :aria-label="linkLabel"
        ><UIcon :name="icon"
      /></NuxtLink>
      <!-- The switch carries the name for assistive technology; the words are a
           larger target for the finger, not a second control. -->
      <span
        class="setting-name"
        :aria-hidden="status ? undefined : 'true'"
        @click="!status && !disabled && $emit('toggle')"
        >{{ status || name }}</span
      >
      <PixelSwitch
        v-if="!status"
        class="setting-switch"
        :checked="checked"
        :label="action"
        :disabled="disabled"
        @toggle="$emit('toggle')"
      />
    </span>
  </div>
</template>

<style scoped>
.summary-setting {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
}
/* A 44px target around a 24px glyph, the extra taken back out of the layout. */
.setting-icon {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-inline: -0.625rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.setting-icon .iconify,
.setting-link .iconify {
  width: 1.5rem;
  height: 1.5rem;
}
.setting-icon.is-on {
  color: var(--accent-ink);
}
.setting-icon.is-static {
  cursor: default;
}
@media (hover: hover) {
  .setting-icon:not(.is-on, .is-static, :disabled):hover {
    color: var(--ui-text-highlighted);
  }
}
.setting-icon:disabled {
  cursor: not-allowed;
  opacity: var(--ore-disabled-opacity);
}
.setting-icon:focus-visible,
.setting-link:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}
/* The hover box: the name and its switch. */
.setting-pop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: var(--text-label);
  font-weight: 600;
}
.setting-touch {
  display: none;
  align-items: center;
  gap: 0.5rem;
}
.setting-link {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  margin-inline: -0.625rem;
  color: var(--ui-text-muted);
}
.setting-link.is-lit {
  color: var(--accent-ink);
}
.setting-name {
  font-size: var(--text-label);
  line-height: 1.5;
  color: var(--ui-text-muted);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
@media (pointer: coarse) {
  .setting-icon {
    display: none;
  }
  .setting-touch {
    display: flex;
  }
}
@media (display-mode: standalone) {
  .is-fixed-in-app .setting-switch {
    display: none;
  }
}
</style>
