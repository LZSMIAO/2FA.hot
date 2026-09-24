import { gcm } from '@noble/ciphers/aes.js'

/*
 * A safe link, /2fa#~…, carries its keys sealed instead of readable. The
 * browser seals and opens it; nothing is sent to a server. Its one-time
 * random key travels inside the link, so the complete link still opens
 * anywhere: sealing keeps keys out of address bars, history and screenshots,
 * it does not protect them from someone holding the whole link.
 *
 * After the mark, base64url: version (1) ‖ key (16) ‖ AES-GCM ciphertext
 * and tag. What it seals is exactly what a plain link carries after /2fa#.
 * The cipher is synchronous so that every reader of plain links, from the
 * route to smart paste, reads safe links the same way.
 */
const MARK = '~'
const VERSION = 1
const KEY_LENGTH = 16
const TAG_LENGTH = 16
// Each link has its own key, so this fixed nonce never repeats under one key.
const NONCE = new Uint8Array(12)
// Far above 100 keys with settings; refuses pathological input before decoding.
const MAX_LENGTH = 100_000

function encode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function decode(text: string): Uint8Array {
  if (!/^[\w-]+$/.test(text)) throw new Error()
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}
// Some apps percent-encode ~ when they pass a link along.
const unmarked = (fragment: string) => fragment.replace(/^#/, '').replace(/^%7e/i, MARK)

/** Whether a link fragment, with or without its #, is sealed. */
export function isSealedFragment(fragment: string): boolean {
  return unmarked(fragment).startsWith(MARK)
}

/** Seal what a plain link carries after /2fa#; the result goes after /2fa#. */
export function sealFragment(plain: string): string {
  const key = crypto.getRandomValues(new Uint8Array(KEY_LENGTH))
  const header = Uint8Array.of(VERSION)
  const sealed = gcm(key, NONCE, header).encrypt(new TextEncoder().encode(plain))
  const bytes = new Uint8Array(header.length + KEY_LENGTH + sealed.length)
  bytes.set(header)
  bytes.set(key, header.length)
  bytes.set(sealed, header.length + KEY_LENGTH)
  return MARK + encode(bytes)
}

/** What a sealed fragment carries after /2fa#. Any damage or edit is refused. */
export function openFragment(fragment: string): string {
  const text = unmarked(fragment)
  try {
    if (!text.startsWith(MARK) || text.length > MAX_LENGTH) throw new Error()
    const bytes = decode(text.slice(MARK.length))
    if (bytes[0] !== VERSION || bytes.length <= 1 + KEY_LENGTH + TAG_LENGTH) throw new Error()
    const opened = gcm(bytes.subarray(1, 1 + KEY_LENGTH), NONCE, bytes.subarray(0, 1)).decrypt(
      bytes.subarray(1 + KEY_LENGTH)
    )
    const plain = new TextDecoder('utf-8', { fatal: true }).decode(opened)
    // A safe link holds a plain link's keys, never another safe link.
    if (isSealedFragment(plain)) throw new Error()
    return plain
  } catch {
    throw new Error('安全链接不完整或已损坏，请重新复制完整链接。')
  }
}
