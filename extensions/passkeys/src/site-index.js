import { decode, encode, random, utf8 } from './encoding.js'

/*
 * Lets a locked vault answer "could I hold a passkey for this request?" so a
 * site we have nothing for goes straight to the browser's own dialog instead
 * of asking for the master password first. Only keyed hashes are stored: the
 * list of sites is not readable as text, though anyone with this browser
 * profile's files could still test a guessed domain against it.
 */
const size = 16
async function hmacKey(raw) {
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}
async function digest(key, value) {
  return encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(value))).slice(0, size))
}
export async function buildIndex(records, previous) {
  const raw = previous?.key ? decode(previous.key, 32) : random(32)
  const key = await hmacKey(raw)
  const sites = new Set(),
    credentials = new Set()
  for (const r of records) {
    if (r.discoverable) sites.add(await digest(key, `site:${r.rpId}`))
    credentials.add(await digest(key, `credential:${r.rpId}:${r.credentialId}`))
  }
  return { key: encode(raw), sites: [...sites].sort(), credentials: [...credentials].sort() }
}
/** True when the vault may answer; an index that is missing or unreadable never hides a passkey. */
export async function mayMatch(index, kind, options, rpId) {
  if (kind === 'create') return true
  if (!index?.key || !Array.isArray(index.sites) || !Array.isArray(index.credentials)) return true
  const key = await hmacKey(decode(index.key, 32))
  const allowed = options.allowCredentials ?? []
  if (!allowed.length) return index.sites.includes(await digest(key, `site:${rpId}`))
  for (const credential of allowed)
    if (index.credentials.includes(await digest(key, `credential:${rpId}:${credential.id}`)))
      return true
  return false
}
