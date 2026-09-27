<script setup lang="ts">
const localePath = useLocalePath()
import { isPrivatePage, unlocalizedPath } from '~~/shared/seo/routes'
import ButtonSoundToggle from './ButtonSoundToggle.vue'

const { tx, locale } = useMessages()
const liteHref = computed(() => '/lite?lang=' + locale.value)
const route = useRoute()
const colorMode = useColorMode()
// Keep navigation controls in the standard Nuxt UI style, including teleported menus.
function navigationClasses(classes: string) {
  return classes.replace(/\bore-[\w-]+\b/g, '').replace(/rounded-none/g, 'rounded-md')
}
const headerTheme = {
  input: { base: navigationClasses },
  button: { base: navigationClasses, leadingIcon: 'size-5 shrink-0' },
  dropdownMenu: {
    content: navigationClasses,
    item: 'rounded-md before:rounded-md'
  }
}
const compact = computed(
  () => isPrivatePage(route.path) && unlocalizedPath(route.path) !== '/history'
)
type ThemePreference = 'light' | 'dark' | 'system'
function selectTheme(preference: ThemePreference) {
  if (colorMode.preference === preference) return
  colorMode.preference = preference
  window.dispatchEvent(new CustomEvent('2fa-ui-sound', { detail: 'select' }))
}
const themes = computed(() => [
  {
    label: tx('浅色'),
    icon: 'i-lucide-sun',
    type: 'checkbox' as const,
    checked: colorMode.preference === 'light',
    class: 'selection-sound-item',
    onSelect: () => selectTheme('light')
  },
  {
    label: tx('深色'),
    icon: 'i-lucide-moon',
    type: 'checkbox' as const,
    checked: colorMode.preference === 'dark',
    class: 'selection-sound-item',
    onSelect: () => selectTheme('dark')
  },
  {
    label: tx('跟随系统'),
    icon: 'i-lucide-monitor',
    type: 'checkbox' as const,
    checked: colorMode.preference === 'system',
    class: 'selection-sound-item',
    onSelect: () => selectTheme('system')
  }
])
const themeOpen = useHeaderPopover('theme')
const menuOpen = useHeaderPopover('menu')
/*
 * The backdrop sheet: on a phone the backdrop's corner button opens it
 * (TitlePanorama.vue asks with a window event, so neither component knows the
 * other). Loaded the first time it is asked for, not with every page.
 */
const sheetLoaded = shallowRef(false)
const sheetOpen = shallowRef(false)
function openSheet() {
  sheetLoaded.value = true
  sheetOpen.value = true
}
onMounted(() => {
  window.addEventListener('2fa-backdrop-sheet', openSheet)
  onBeforeUnmount(() => window.removeEventListener('2fa-backdrop-sheet', openSheet))
})
/*
 * One list, with no rules between groups: the site's own pages first, then
 * the other edition, which opens in a new window. A bare "Lite" said nothing
 * about what it is. Feature requests are in the footer.
 */
const menu = computed(() => [
  { label: tx('本地历史'), to: localePath('/history'), icon: 'i-lucide-history' },
  { label: tx('使用说明'), to: localePath('/help'), icon: 'i-lucide-book-open' },
  { label: tx('隐私说明'), to: localePath('/privacy'), icon: 'i-lucide-shield-check' },
  {
    label: tx('Lite 轻量版'),
    to: liteHref.value,
    external: true,
    target: '_blank',
    icon: 'i-lucide-feather',
    trailingIcon: 'i-lucide-arrow-up-right'
  }
])
</script>
<template>
  <UTheme :ui="headerTheme">
    <header class="site-header">
      <a class="skip-link" href="#main-content">{{ tx('跳转到主要内容') }}</a>
      <div class="header-inner">
        <NuxtLink :to="localePath('/')" class="wordmark" :aria-label="tx('2fa.hot 首页')"
          ><span class="header-wordmark"
            >2fa<span class="brand-hot">.hot</span><span class="brand-beta">Beta</span></span
          ><span class="header-pixel-wordmark"
            ><GameTitle /><span class="brand-beta">Beta</span></span
          ></NuxtLink
        >
        <nav v-if="!compact" class="desktop-nav" :aria-label="tx('主要导航')">
          <NuxtLink :to="localePath('/')" exact-active-class="active">{{ tx('取码') }}</NuxtLink
          ><NuxtLink :to="localePath('/history')" active-class="active">{{
            tx('本地历史')
          }}</NuxtLink
          ><NuxtLink :to="localePath('/help')" active-class="active">{{ tx('使用说明') }}</NuxtLink>
          <!-- The other edition opens beside this one, marked as leaving the page. -->
          <AppHint :text="tx('打开 Lite 轻量版')"
            ><a :href="liteHref" target="_blank" rel="noopener" class="lite-link"
              >Lite<UIcon
                name="i-lucide-arrow-up-right"
                class="external-arrow"
                aria-hidden="true"
              /><span class="sr-only"> {{ tx('（新窗口）') }}</span></a
            ></AppHint
          >
        </nav>
        <div class="header-actions">
          <LanguagePicker />
          <ButtonSoundToggle />
          <AppHint :text="tx('切换主题')">
            <UDropdownMenu v-model:open="themeOpen" :items="themes" :modal="false"
              ><UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-sun-moon"
                :aria-label="tx('切换主题')"
                class="icon-button"
            /></UDropdownMenu>
          </AppHint>
          <UDropdownMenu v-if="!compact" v-model:open="menuOpen" :items="menu"
            ><UButton
              class="mobile-menu icon-button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-menu"
              :aria-label="tx('打开导航')"
          /></UDropdownMenu>
        </div>
      </div>
    </header>
  </UTheme>
  <!-- Outside the header's theme: a dialog like the others, not a menu. -->
  <LazyBackdropSheet v-if="sheetLoaded" v-model:open="sheetOpen" />
</template>

<style scoped>
.lite-link {
  gap: 0.125rem;
}
.lite-link .external-arrow {
  width: 0.875rem;
  height: 0.875rem;
}
</style>
