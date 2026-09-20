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
    class: 'selection-sound-item',
    onSelect: () => selectTheme('light')
  },
  {
    label: tx('深色'),
    icon: 'i-lucide-moon',
    class: 'selection-sound-item',
    onSelect: () => selectTheme('dark')
  },
  {
    label: tx('跟随系统'),
    icon: 'i-lucide-monitor',
    class: 'selection-sound-item',
    onSelect: () => selectTheme('system')
  }
])
/*
 * The backdrop's own controls sit above the viewport on a phone, so the menu
 * carries them there instead. Only on the home page, which is the only place
 * the backdrop is on screen.
 */
const { scenes, selected, playbackPaused } = usePanoramaPreference()
const narrow = shallowRef(false)
const onHome = computed(() => unlocalizedPath(route.path) === '/')
onMounted(() => {
  const query = window.matchMedia('(max-width: 700px)')
  const update = () => (narrow.value = query.matches)
  update()
  query.addEventListener('change', update)
  onBeforeUnmount(() => query.removeEventListener('change', update))
})
const backdrop = computed(() =>
  narrow.value && onHome.value
    ? [
        {
          label: tx('切换背景'),
          icon: 'i-lucide-image',
          children: scenes.map((version) => ({
            label: `Minecraft ${version}`,
            type: 'checkbox' as const,
            checked: selected.value === version,
            onSelect: () => {
              selected.value = version
            }
          }))
        },
        {
          label: tx(playbackPaused.value === false ? '暂停' : '继续'),
          icon: playbackPaused.value === false ? 'i-lucide-pause' : 'i-lucide-play',
          onSelect: () => {
            playbackPaused.value = playbackPaused.value === false
          }
        }
      ]
    : []
)
const menu = computed(() => [
  { label: 'Lite', to: liteHref.value, external: true },
  { label: tx('本地历史'), to: localePath('/history'), icon: 'i-lucide-history' },
  { label: tx('使用说明'), to: localePath('/help'), icon: 'i-lucide-book-open' },
  { label: tx('功能建议'), to: localePath('/waitlist'), icon: 'i-lucide-plus' },
  { label: tx('隐私说明'), to: localePath('/privacy'), icon: 'i-lucide-shield-check' },
  ...backdrop.value
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
          ></NuxtLink
        >
        <nav v-if="!compact" class="desktop-nav" :aria-label="tx('主要导航')">
          <NuxtLink :to="localePath('/')" exact-active-class="active">{{ tx('取码') }}</NuxtLink
          ><NuxtLink :to="localePath('/history')" active-class="active">{{
            tx('本地历史')
          }}</NuxtLink
          ><NuxtLink :to="localePath('/help')" active-class="active">{{ tx('使用说明') }}</NuxtLink>
          <AppHint :text="tx('打开 Lite 轻量版')"><a :href="liteHref">Lite</a></AppHint>
        </nav>
        <div class="header-actions">
          <LanguagePicker />
          <ButtonSoundToggle />
          <AppHint :text="tx('切换主题')">
            <UDropdownMenu :items="themes" :modal="false"
              ><UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-sun-moon"
                :aria-label="tx('切换主题')"
                class="icon-button"
            /></UDropdownMenu>
          </AppHint>
          <UDropdownMenu v-if="!compact" :items="menu"
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
</template>
