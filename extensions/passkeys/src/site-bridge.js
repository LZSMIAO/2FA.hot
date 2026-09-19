import { isCompanionOrigin } from './site-access.js'

const namespace = '2fa.hot/passkeys/site/v1'
if (window.top === window && isCompanionOrigin(location.origin)) {
  let inFlight = 0
  window.addEventListener('message', async (event) => {
    const data = event.data
    if (
      event.source !== window ||
      event.origin !== location.origin ||
      data?.namespace !== namespace ||
      data.direction !== 'request' ||
      typeof data.id !== 'string' ||
      data.id.length > 80 ||
      !['status', 'open', 'manage', 'result', 'cancel'].includes(data.action) ||
      inFlight >= 8
    )
      return
    inFlight++
    try {
      const result = await chrome.runtime.sendMessage({
        action: `site-${data.action}`,
        operation: data.operation,
        ids: data.ids,
        token: data.token
      })
      window.postMessage(
        {
          namespace,
          direction: 'response',
          id: data.id,
          ok: result.ok === true,
          version: result.version,
          managerProtocol: result.managerProtocol,
          token: result.token,
          done: result.done,
          cancelled: result.cancelled,
          records: result.records
        },
        location.origin
      )
    } catch {
      window.postMessage(
        { namespace, direction: 'response', id: data.id, ok: false },
        location.origin
      )
    } finally {
      inFlight--
    }
  })
}
