// Shared Ore controls; AppHeader removes these classes for plain navigation.
export const oreTheme = {
  button: {
    // Nuxt UI fades a disabled button to 75%; ghost and link buttons take the
    // site's one disabled opacity instead (raised ones keep ore.css's look).
    slots: {
      base: 'ore-button font-medium cursor-pointer rounded-none disabled:opacity-(--ore-disabled-opacity) aria-disabled:opacity-(--ore-disabled-opacity)'
    },
    variants: {
      /*
       * Nuxt UI's button size variant is a per-slot object carrying padding,
       * gap, text size and icon size. Overriding it with a bare class string
       * drops all of that, so mirror the upstream values and append the ore
       * hook that ore.css keys its min-heights off.
       */
      size: {
        xs: {
          base: 'px-2 py-1 text-xs gap-1 ore-size-xs',
          leadingIcon: 'size-4',
          leadingAvatarSize: '3xs',
          trailingIcon: 'size-4'
        },
        sm: {
          base: 'px-2.5 py-1.5 text-xs gap-1.5 ore-size-sm',
          leadingIcon: 'size-4',
          leadingAvatarSize: '3xs',
          trailingIcon: 'size-4'
        },
        md: {
          base: 'px-2.5 py-1.5 text-sm gap-1.5 ore-size-md',
          leadingIcon: 'size-5',
          leadingAvatarSize: '2xs',
          trailingIcon: 'size-5'
        },
        lg: {
          base: 'px-3 py-2 text-sm gap-2 ore-size-lg',
          leadingIcon: 'size-5',
          leadingAvatarSize: '2xs',
          trailingIcon: 'size-5'
        },
        xl: {
          base: 'px-3 py-2 text-base gap-2 ore-size-xl',
          leadingIcon: 'size-6',
          leadingAvatarSize: 'xs',
          trailingIcon: 'size-6'
        }
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
      { color: 'primary', variant: 'solid', class: { base: 'primary-button' } },
      { color: 'error', variant: ['soft', 'subtle', 'outline'], class: { base: 'ore-danger' } }
    ],
    defaultVariants: { size: 'lg' }
  },
  input: { slots: { base: 'ore-input w-full rounded-none' } },
  textarea: { slots: { base: 'ore-input rounded-none' } },
  modal: {
    slots: {
      content: 'ore-window ore-theme rounded-none',
      header: 'ore-window-title',
      close: 'ore-close'
    },
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
    slots: { root: 'ore-check-row', base: 'ore-checkbox rounded-none', indicator: 'rounded-none' },
    // Match SelectionCheck's 20px box so both checkboxes read at one scale.
    defaultVariants: { size: 'xl' }
  },
  kbd: { base: 'rounded-none' }
}
