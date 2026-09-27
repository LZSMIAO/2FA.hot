// Only public WebAuthn request/response data crosses this page-world bridge.
;(() => {
  if (!window.isSecureContext || !navigator.credentials || !window.PublicKeyCredential) return
  const nativeCreate = navigator.credentials.create.bind(navigator.credentials)
  const nativeGet = navigator.credentials.get.bind(navigator.credentials)
  const namespace = '2fa.hot/passkeys/v1'
  const errorNames = ['NotAllowedError', 'InvalidStateError', 'AbortError', 'NotSupportedError']
  const b64 = (v) => {
    if (!(v instanceof ArrayBuffer) && !ArrayBuffer.isView(v))
      throw new TypeError('Expected BufferSource')
    const bytes = ArrayBuffer.isView(v)
      ? new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
      : new Uint8Array(v)
    if (bytes.length > 2048) throw new TypeError('Buffer too large')
    return btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  const binary = (v) =>
    Uint8Array.from(atob(v.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)).buffer
  // PRF outputs are ArrayBuffers to the page, as a browser's own would be.
  function extensionResults(value) {
    const results = structuredClone(value ?? {})
    const prf = results.prf?.results
    if (prf)
      for (const key of ['first', 'second'])
        if (typeof prf[key] === 'string') prf[key] = binary(prf[key])
    return results
  }
  function hydrate(value) {
    const registration = 'attestationObject' in value.response
    const response = Object.create(
      registration
        ? AuthenticatorAttestationResponse.prototype
        : AuthenticatorAssertionResponse.prototype
    )
    for (const [key, v] of Object.entries(value.response)) {
      if (key === 'transports' || key === 'publicKeyAlgorithm') continue
      Object.defineProperty(response, key, {
        value: v === null ? null : binary(v),
        enumerable: true
      })
    }
    if (registration)
      Object.defineProperties(response, {
        getTransports: { value: () => [...value.response.transports] },
        getPublicKey: { value: () => binary(value.response.publicKey) },
        getPublicKeyAlgorithm: { value: () => -7 },
        getAuthenticatorData: { value: () => binary(value.response.authenticatorData) }
      })
    const credential = Object.create(PublicKeyCredential.prototype)
    Object.defineProperties(credential, {
      id: { value: value.id, enumerable: true },
      rawId: { value: binary(value.rawId), enumerable: true },
      type: { value: 'public-key', enumerable: true },
      authenticatorAttachment: { value: value.authenticatorAttachment, enumerable: true },
      response: { value: response, enumerable: true },
      getClientExtensionResults: { value: () => extensionResults(value.clientExtensionResults) },
      toJSON: { value: () => structuredClone(value) }
    })
    return credential
  }
  const prfValues = (v) =>
    v && { first: b64(v.first), ...(v.second !== undefined ? { second: b64(v.second) } : {}) }
  function serialize(options) {
    const p = options.publicKey
    const serialized = { ...p, challenge: b64(p.challenge) }
    if (p.user) serialized.user = { ...p.user, id: b64(p.user.id) }
    for (const field of ['excludeCredentials', 'allowCredentials'])
      if (p[field]) serialized[field] = p[field].map((d) => ({ ...d, id: b64(d.id) }))
    if (p.extensions) {
      serialized.extensions = { ...p.extensions }
      const prf = p.extensions.prf
      if (prf) {
        serialized.extensions.prf = {}
        if (prf.eval) serialized.extensions.prf.eval = prfValues(prf.eval)
        if (prf.evalByCredential)
          serialized.extensions.prf.evalByCredential = Object.fromEntries(
            Object.entries(prf.evalByCredential).map(([id, v]) => [id, prfValues(v)])
          )
      }
    }
    if (JSON.stringify(serialized).length > 64000) throw new TypeError('Request too large')
    return serialized
  }
  const failure = (data) =>
    new DOMException(data.error, errorNames.includes(data.name) ? data.name : 'NotAllowedError')
  const listen = (id, handler) => {
    const receive = (event) => {
      const data = event.data
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        data?.namespace !== namespace ||
        data.direction !== 'response' ||
        data.id !== id
      )
        return
      handler(data)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }
  const post = (message) => window.postMessage({ namespace, ...message }, location.origin)
  function request(kind, options) {
    const native = kind === 'create' ? nativeCreate : nativeGet
    if (!options?.publicKey || options.mediation === 'silent') return native(options)
    if (kind === 'get' && options.mediation === 'conditional') return conditional(options)
    // Creating from an iframe on another origin needs a click in that frame, as the browser requires.
    if (kind === 'create' && window.top !== window && !navigator.userActivation?.isActive)
      return native(options)
    if (options.signal?.aborted)
      return Promise.reject(new DOMException('Request aborted', 'AbortError'))
    let serialized
    try {
      serialized = serialize(options)
    } catch {
      return native(options)
    }
    const id = crypto.randomUUID()
    return new Promise((resolve, reject) => {
      let done = false
      const cleanup = () => {
        done = true
        clearTimeout(timer)
        stop()
        options.signal?.removeEventListener('abort', abort)
      }
      const cancel = () => post({ direction: 'cancel', id })
      const abort = () => {
        if (done) return
        cleanup()
        cancel()
        reject(new DOMException('Request aborted', 'AbortError'))
      }
      const timer = setTimeout(
        () => {
          if (done) return
          cleanup()
          cancel()
          reject(new DOMException('Request timed out', 'NotAllowedError'))
        },
        Math.min(120000, Math.max(15000, options.publicKey.timeout || 120000))
      )
      const stop = listen(id, (data) => {
        if (done) return
        cleanup()
        if (data.fallback) {
          resolve(native(options))
          return
        }
        if (data.error) {
          reject(failure(data))
          return
        }
        try {
          resolve(hydrate(data.value))
        } catch {
          reject(new DOMException('Invalid credential response', 'UnknownError'))
        }
      })
      options.signal?.addEventListener('abort', abort, { once: true })
      post({ direction: 'request', id, kind, options: serialized })
    })
  }
  /*
   * Autofill sign-in. The browser's own conditional request keeps running for
   * passkeys held elsewhere; this vault offers its own next to the username
   * field. Whichever the user picks resolves the site's request and ends the other.
   */
  function conditional(options) {
    let serialized
    try {
      serialized = serialize(options)
    } catch {
      return nativeGet(options)
    }
    if (options.signal?.aborted)
      return Promise.reject(new DOMException('Request aborted', 'AbortError'))
    const id = crypto.randomUUID()
    const ours = new AbortController()
    const signal = options.signal ? AbortSignal.any([options.signal, ours.signal]) : ours.signal
    return new Promise((resolve, reject) => {
      let done = false
      const finish = (settle, value) => {
        if (done) return
        done = true
        stop()
        options.signal?.removeEventListener('abort', abort)
        settle(value)
      }
      const withdraw = () => post({ direction: 'cancel', id })
      const abort = () => {
        withdraw()
        finish(reject, new DOMException('Request aborted', 'AbortError'))
      }
      const stop = listen(id, (data) => {
        // Declining our prompt, or preferring the browser's list, leaves both offers open.
        if (data.fallback || data.error || !data.value) return
        let credential
        try {
          credential = hydrate(data.value)
        } catch {
          return
        }
        ours.abort()
        finish(resolve, credential)
      })
      options.signal?.addEventListener('abort', abort, { once: true })
      post({ direction: 'conditional', id, options: serialized })
      nativeGet({ ...options, signal }).then(
        (credential) => {
          withdraw()
          finish(resolve, credential)
        },
        (error) => {
          if (ours.signal.aborted && !options.signal?.aborted) return
          withdraw()
          finish(reject, error)
        }
      )
    })
  }
  navigator.credentials.create = (options) => request('create', options)
  navigator.credentials.get = (options) => request('get', options)
  /*
   * Sites ask these before offering passkeys at all. This vault can answer
   * with user verification (its master password or the device's) and fills
   * the autofill list, so a browser without a platform authenticator of its
   * own still gets the passkey option.
   */
  const PKC = window.PublicKeyCredential
  PKC.isUserVerifyingPlatformAuthenticatorAvailable = async () => true
  PKC.isConditionalMediationAvailable = async () => true
  if (typeof PKC.getClientCapabilities === 'function') {
    const nativeCapabilities = PKC.getClientCapabilities.bind(PKC)
    PKC.getClientCapabilities = async () => ({
      ...(await nativeCapabilities().catch(() => ({}))),
      conditionalGet: true,
      passkeyPlatformAuthenticator: true,
      userVerifyingPlatformAuthenticator: true,
      'extension:prf': true
    })
  }
})()
