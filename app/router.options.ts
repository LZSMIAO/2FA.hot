import type { RouterConfig } from '@nuxt/schema'
import { START_LOCATION } from 'vue-router'
import { unlocalizedPath } from '~~/shared/seo/routes'
import { focusAnchor } from '~/utils/focus-anchor'

export default {
  scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp()
    const router = useRouter()
    // Explicit card transitions reset scrolling inside their snapshot callback.
    // Do not schedule a competing scroll on the following animation frame.
    if (useState<boolean>('otp-size-transition-active').value) return false
    const samePath = to.path.replace(/\/$/, '') === from.path.replace(/\/$/, '')

    const position = () => {
      if (savedPosition) return savedPosition
      const path = unlocalizedPath(to.path)
      // On code pages, the fragment is secret data, never a DOM selector.
      if (path === '/2fa' || path.startsWith('/2fa/')) return samePath ? false : { left: 0, top: 0 }
      if (to.hash) {
        let id: string
        try {
          id = decodeURIComponent(to.hash.slice(1))
        } catch {
          return false
        }
        const element = document.getElementById(id)
        if (!element) return false
        focusAnchor(element)
        if (element.matches('h1, h2, h3, h4, h5, h6')) {
          const viewportHeight = window.visualViewport?.height ?? window.innerHeight
          const viewportOffset = window.visualViewport?.offsetTop ?? 0
          return {
            el: element,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? ('instant' as const)
              : ('smooth' as const),
            top: Math.max(
              0,
              viewportOffset + (viewportHeight - element.getBoundingClientRect().height) / 2
            )
          }
        }
        const margin = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
        const padding =
          Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
        return { el: element, top: margin + padding }
      }
      return samePath && !from.hash ? false : { left: 0, top: 0 }
    }

    const scrollToTop = to.meta.scrollToTop
    if (
      !samePath &&
      (typeof scrollToTop === 'function' ? scrollToTop(to, from) : scrollToTop) === false
    )
      return false
    if (samePath || from === START_LOCATION) return position()
    return new Promise((resolve) => {
      nuxtApp.hooks.hookOnce('page:loading:end', () => {
        requestAnimationFrame(() => {
          resolve(router.currentRoute.value.fullPath === to.fullPath ? position() : false)
        })
      })
    })
  }
} satisfies RouterConfig
