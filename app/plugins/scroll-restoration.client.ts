/**
 * A reload opens at the top. Safari restored the old position itself, but only
 * once the page had grown tall enough, a moment after it first painted, so the
 * whole page jumped; on /history it passed the green button under Safari's bar
 * on the way, which tinted the bar. Nuxt's router turns the browser's own
 * restoring back on as it starts, so this turns it off again right after; the
 * pre-paint script already did so for the moments before the app ran.
 * Navigation inside the app keeps the router's saved positions.
 */
export default defineNuxtPlugin(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
})
