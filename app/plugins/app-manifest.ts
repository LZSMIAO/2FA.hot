import { appManifestPath } from '~~/shared/app-manifest'

/**
 * Each page names the manifest in its own language, so installing shows the
 * app's description and shortcuts in that language. Keyed to replace the
 * English default in nuxt.config.ts.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const locale = nuxtApp.$i18n.locale
  useHead({
    link: [{ key: 'app-manifest', rel: 'manifest', href: () => appManifestPath(locale.value) }]
  })
})
