// Places the backdrop's corner controls before the first paint where a script
// does it (iOS, and browsers without scroll-driven animations; see
// app/components/TitlePanorama.vue, which keeps them placed from then on).
// Loaded at the end of the body, so the page is read up to here, footer
// included: the controls rise by as much of the footer as is in view.
;(() => {
  const root = document.documentElement
  if (!root.hasAttribute('data-ios') && CSS.supports('animation-timeline: scroll()')) return
  const footer = document.querySelector('.site-footer')
  if (footer) {
    const overlap = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top)
    root.style.setProperty('--panorama-lift', `${Math.round(overlap)}px`)
  }
  root.setAttribute('data-backdrop-placed', '')
})()
