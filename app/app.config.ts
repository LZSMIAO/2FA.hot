import { oreTheme } from './utils/oreTheme'

export default defineAppConfig({
  ui: {
    ...oreTheme,
    // OreUI's pixel glyphs wherever Nuxt UI draws its own; see assets/ore/oreui-source.txt.
    icons: {
      check: 'i-mc-check',
      minus: 'i-mc-minus',
      loading: 'i-mc-spinner',
      close: 'i-mc-close',
      chevronDown: 'i-mc-chevron-down',
      chevronUp: 'i-mc-chevron-up',
      chevronLeft: 'i-mc-chevron-left',
      chevronRight: 'i-mc-chevron-right',
      arrowDown: 'i-mc-arrow-down',
      arrowUp: 'i-mc-arrow-up',
      arrowLeft: 'i-mc-arrow-left',
      arrowRight: 'i-mc-arrow-right'
    },
    colors: { primary: 'green', neutral: 'zinc' }
  }
})
