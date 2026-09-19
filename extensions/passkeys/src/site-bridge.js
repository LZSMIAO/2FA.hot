import { isCompanionOrigin } from './site-access.js'

const namespace = '2fa.hot/passkeys/site/v1'
if (window.top === window && isCompanionOrigin(location.origin)) {
  let busy = false
  window.addEventListener('message', async (event) => {
    const data = event.data
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      data?.namespace !== namespace ||
      data.direction !== 'request' ||
      typeof data.id !== 'string' ||
      data.id.length > 80 ||
      !['status', 'open'].includes(data.action) ||
      busy
    )
      return
    busy = true
    try {
      const result = await chrome.runtime.sendMessage({ action: `site-${data.action}` })
      window.postMessage(
        {
          namespace,
          direction: 'response',
          id: data.id,
          ok: result.ok === true,
          version: result.version
        },
        location.origin
      )
    } catch {
      window.postMessage(
        { namespace, direction: 'response', id: data.id, ok: false },
        location.origin
      )
    } finally {
      busy = false
    }
  })
}
