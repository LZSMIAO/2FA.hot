/**
 * The header's lists (language, theme, the menu) open one at a time. On a
 * touch screen, tapping a second button opened its list over the first,
 * which stayed open underneath.
 */
export function useHeaderPopover(name: 'language' | 'theme' | 'menu') {
  const current = useState<string | null>('header-popover', () => null)
  return computed({
    get: () => current.value === name,
    set: (open: boolean) => {
      if (open) current.value = name
      else if (current.value === name) current.value = null
    }
  })
}
