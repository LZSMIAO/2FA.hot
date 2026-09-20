// Shared Ore controls; AppHeader removes these classes for plain navigation.
export const oreTheme = {
  button: {
    slots: { base: 'ore-button font-medium cursor-pointer rounded-none' },
    variants: {
      size: {
        xs: 'ore-size-xs',
        sm: 'ore-size-sm',
        md: 'ore-size-md',
        lg: 'ore-size-lg',
        xl: 'ore-size-xl'
      },
      variant: {
        solid: 'ore-raised',
        outline: 'ore-raised ore-secondary',
        soft: 'ore-raised ore-secondary',
        subtle: 'ore-raised ore-secondary',
        ghost: 'ore-ghost',
        link: 'ore-link'
      }
    },
    compoundVariants: [
      { color: 'primary', variant: 'solid', class: 'primary-button' },
      { color: 'error', variant: ['soft', 'subtle', 'outline'], class: 'ore-danger' }
    ],
    defaultVariants: { size: 'lg' }
  },
  input: { slots: { base: 'ore-input w-full rounded-none' } },
  textarea: { slots: { base: 'ore-input rounded-none' } },
  modal: {
    slots: { content: 'ore-window ore-theme rounded-none', header: 'ore-window-title' },
    variants: {
      transition: {
        true: { content: 'ore-dialog-motion', overlay: 'ore-overlay-motion' }
      }
    }
  },
  dropdownMenu: {
    slots: {
      content: 'ore-window ore-theme rounded-none',
      item: 'rounded-none before:rounded-none'
    }
  },
  tooltip: { slots: { content: 'ore-theme ore-tooltip' } },
  popover: { slots: { content: 'ore-theme ore-popover' } },
  contextMenu: { slots: { content: 'ore-theme ore-popover' } },
  checkbox: {
    slots: { root: 'ore-check-row', base: 'ore-checkbox rounded-none', indicator: 'rounded-none' }
  },
  kbd: { base: 'rounded-none' }
}
