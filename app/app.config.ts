import { oreTheme } from './utils/oreTheme'

export default defineAppConfig({
  ui: {
    ...oreTheme,
    icons: { check: 'i-mc-check', minus: 'i-mc-minus' },
    colors: { primary: 'green', neutral: 'zinc' }
  }
})
