// Mark a visit that last used batch codes, so the home page opens on that tab
// from its first paint; app/pages/index.vue takes over and clears the mark.
// The installed app's shortcuts (?shortcut=single or batch) choose the tab too.
;(() => {
  try {
    const shortcut = new URLSearchParams(location.search).get('shortcut')
    if (shortcut === 'batch') localStorage.setItem('2fa-workspace-mode', 'batch')
    else if (shortcut === 'single') localStorage.removeItem('2fa-workspace-mode')
    if (localStorage.getItem('2fa-workspace-mode') === 'batch')
      document.documentElement.setAttribute('data-workspace-mode', 'batch')
  } catch {
    // Without storage the page opens on single codes, as it always did.
  }
})()
