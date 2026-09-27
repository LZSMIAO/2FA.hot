import { getDomain } from 'tldts'
import { cbor, concat, decode, derSignature, encode, random, utf8 } from './encoding.js'

export function validateRp(origin, requested) {
  const url = new URL(origin)
  if (
    url.origin !== origin ||
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost'))
  )
    throw new Error('只支持 HTTPS 网站和 localhost。')
  const rpId = requested ?? url.hostname
  if (
    typeof rpId !== 'string' ||
    rpId.length > 253 ||
    rpId !== rpId.toLowerCase() ||
    rpId.endsWith('.') ||
    !/^[a-z0-9.-]+$/.test(rpId)
  )
    throw new Error('网站标识不正确。')
  if (url.hostname !== rpId && !url.hostname.endsWith(`.${rpId}`))
    throw new Error('网站与通行密钥的域名不匹配。')
  if (rpId !== 'localhost' && !getDomain(rpId, { allowPrivateDomains: true }))
    throw new Error('不能为公共后缀或 IP 地址创建通行密钥。')
  return rpId
}
/** An error the page should see under a specific DOMException name. */
export function named(message, name) {
  const error = new Error(message)
  error.name = name
  return error
}
const descriptors = (values = []) => {
  if (!Array.isArray(values) || values.length > 100) throw new Error('凭据列表不正确。')
  for (const v of values)
    if (v.type !== 'public-key' || !decode(v.id, 1024).length) throw new Error('凭据列表不正确。')
  return values
}
export function validateRequest(kind, options, origin) {
  if (!['create', 'get'].includes(kind) || !options || JSON.stringify(options).length > 64000)
    throw new Error('通行密钥请求不正确。')
  if (decode(options.challenge, 1024).length < 16) throw new Error('网站的验证挑战过短。')
  const rpId = validateRp(origin, kind === 'create' ? options.rp?.id : options.rpId)
  if (kind === 'create') {
    if (
      !options.rp ||
      typeof options.rp.name !== 'string' ||
      !options.user ||
      !decode(options.user.id, 64).length ||
      typeof options.user.name !== 'string' ||
      !options.user.name ||
      options.user.name.length > 256 ||
      typeof options.user.displayName !== 'string' ||
      options.user.displayName.length > 256
    )
      throw new Error('网站提供的账号信息不正确。')
    if (
      !Array.isArray(options.pubKeyCredParams) ||
      !options.pubKeyCredParams.some((p) => p.type === 'public-key' && p.alg === -7)
    )
      throw new Error('请使用支持此网站算法的系统验证器。')
    /*
     * A software key has no attestation to give. For "direct" and "indirect"
     * the client may answer "none" instead, as browsers do; "enterprise" is a
     * request for a managed device and goes to one.
     */
    if (
      options.authenticatorSelection?.authenticatorAttachment === 'cross-platform' ||
      !['none', 'direct', 'indirect', undefined].includes(options.attestation)
    )
      throw new Error('此网站需要其他类型的验证器。')
    descriptors(options.excludeCredentials)
  } else descriptors(options.allowCredentials)
  // PRF is computed here; anything else (largeBlob and the like) goes to the native provider.
  if (Object.keys(options.extensions ?? {}).some((key) => !['credProps', 'prf'].includes(key)))
    throw new Error('此网站需要扩展尚未支持的能力，请使用其他验证器。')
  validatePrf(kind, options)
  return rpId
}
function validatePrf(kind, options) {
  const prf = options.extensions?.prf
  if (prf === undefined) return
  const values = (v) => {
    if (v === undefined) return
    if (!v || typeof v.first !== 'string') throw new Error('PRF 请求不正确。')
    decode(v.first, 2048)
    if (v.second !== undefined) decode(v.second, 2048)
  }
  if (!prf || typeof prf !== 'object') throw new Error('PRF 请求不正确。')
  values(prf.eval)
  if (prf.evalByCredential === undefined) return
  // Per-credential inputs only make sense against the credentials the site listed.
  const allowed = (options.allowCredentials ?? []).map((c) => c.id)
  const entries = Object.entries(prf.evalByCredential ?? {})
  if (kind === 'create' || !prf.evalByCredential || entries.length > 100)
    throw new Error('PRF 请求不正确。')
  for (const [id, v] of entries) {
    if (!allowed.includes(id)) throw new Error('PRF 请求不正确。')
    values(v)
  }
}
/*
 * WebAuthn's PRF over a per-credential random seed, as CTAP2 hmac-secret does:
 * the site's input is first bound to the label "WebAuthn PRF".
 */
async function prfOutput(seed, input) {
  const salt = await crypto.subtle.digest(
    'SHA-256',
    concat(utf8('WebAuthn PRF'), Uint8Array.of(0), decode(input, 2048))
  )
  const key = await crypto.subtle.importKey(
    'raw',
    decode(seed, 32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return encode(await crypto.subtle.sign('HMAC', key, salt))
}
async function prfResults(seed, values) {
  const results = { first: await prfOutput(seed, values.first) }
  if (values.second !== undefined) results.second = await prfOutput(seed, values.second)
  return results
}
/** Whether a create request names a credential this vault already holds for the site. */
export function excluded(options, rpId, records) {
  return (options.excludeCredentials ?? []).some((v) =>
    records.some((r) => r.rpId === rpId && r.credentialId === v.id)
  )
}
export function matches(records, options, rpId) {
  const allowed = options.allowCredentials ?? []
  return records.filter(
    (r) =>
      r.rpId === rpId &&
      (allowed.length ? allowed.some((a) => a.id === r.credentialId) : r.discoverable)
  )
}
async function authData(record, register = false, publicKey) {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(record.rpId)))
  // UP + UV. New software credentials are backup eligible, initially not backed up.
  const flags =
    1 | 4 | (record.backupEligible ? 8 : 0) | (record.backupState ? 16 : 0) | (register ? 64 : 0)
  const counter = new Uint8Array(4)
  new DataView(counter.buffer).setUint32(0, record.counter)
  if (!register) return concat(hash, Uint8Array.of(flags), counter)
  const id = decode(record.credentialId, 1024)
  const cose = cbor(
    new Map([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, decode(publicKey.x)],
      [-3, decode(publicKey.y)]
    ])
  )
  return concat(
    hash,
    Uint8Array.of(flags),
    counter,
    new Uint8Array(16),
    Uint8Array.of(id.length >> 8, id.length & 255),
    id,
    cose
  )
}
/** A request from an iframe on another origin says so, and names the page around it. */
function clientData(kind, options, origin, topOrigin) {
  const crossOrigin = !!topOrigin && topOrigin !== origin
  return utf8(
    JSON.stringify({
      type: `webauthn.${kind}`,
      challenge: options.challenge,
      origin,
      crossOrigin,
      ...(crossOrigin ? { topOrigin } : {})
    })
  )
}
export async function createCredential(options, origin, records = [], { topOrigin } = {}) {
  const rpId = validateRequest('create', options, origin)
  if (excluded(options, rpId, records))
    throw named('此账号已有保存在这里的通行密钥，无需重复创建。', 'InvalidStateError')
  const prf = options.extensions?.prf
  const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify'
  ])
  const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey)
  const record = {
    credentialId: encode(random(32)),
    rpId,
    userHandle: options.user.id,
    userName: options.user.name,
    userDisplayName: options.user.displayName,
    label: null,
    privateKey: encode(await crypto.subtle.exportKey('pkcs8', keys.privateKey)),
    prfSeed: prf === undefined ? null : encode(random(32)),
    counter: 0,
    backupEligible: true,
    backupState: false,
    discoverable: options.authenticatorSelection?.residentKey !== 'discouraged',
    createdAt: Date.now(),
    lastUsedAt: null
  }
  const data = await authData(record, true, publicKey)
  const clientExtensionResults = {}
  if (options.extensions?.credProps) clientExtensionResults.credProps = { rk: record.discoverable }
  if (prf !== undefined) {
    clientExtensionResults.prf = { enabled: true }
    if (prf.eval) clientExtensionResults.prf.results = await prfResults(record.prfSeed, prf.eval)
  }
  const response = {
    id: record.credentialId,
    rawId: record.credentialId,
    type: 'public-key',
    authenticatorAttachment: 'platform',
    clientExtensionResults,
    response: {
      clientDataJSON: encode(clientData('create', options, origin, topOrigin)),
      attestationObject: encode(cbor({ fmt: 'none', attStmt: {}, authData: data })),
      authenticatorData: encode(data),
      publicKey: encode(await crypto.subtle.exportKey('spki', keys.publicKey)),
      publicKeyAlgorithm: -7,
      transports: ['internal']
    }
  }
  return { record, response }
}
export async function getCredential(options, origin, record, { topOrigin } = {}) {
  const rpId = validateRequest('get', options, origin)
  if (!matches([record], options, rpId).length) throw new Error('没有匹配此网站的通行密钥。')
  const next = {
    ...record,
    counter: record.counter ? record.counter + 1 : 0,
    lastUsedAt: Date.now()
  }
  if (next.counter > 0xffffffff) throw new Error('凭据计数器已达到上限，请重新创建。')
  const clientExtensionResults = {}
  const prf = options.extensions?.prf
  if (prf !== undefined) {
    // A credential made before PRF was asked for gets its seed now; the output is stable from here on.
    next.prfSeed ??= encode(random(32))
    const values = prf.evalByCredential?.[record.credentialId] ?? prf.eval
    clientExtensionResults.prf = values ? { results: await prfResults(next.prfSeed, values) } : {}
  }
  const data = await authData(next),
    client = clientData('get', options, origin, topOrigin)
  const key = await crypto.subtle.importKey(
    'pkcs8',
    decode(record.privateKey, 1024),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    concat(data, new Uint8Array(await crypto.subtle.digest('SHA-256', client)))
  )
  return {
    record: next,
    response: {
      id: record.credentialId,
      rawId: record.credentialId,
      type: 'public-key',
      authenticatorAttachment: 'platform',
      clientExtensionResults,
      response: {
        clientDataJSON: encode(client),
        authenticatorData: encode(data),
        signature: encode(derSignature(signature)),
        userHandle: record.userHandle
      }
    }
  }
}
