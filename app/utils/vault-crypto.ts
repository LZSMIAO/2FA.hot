export interface Envelope {
  version: 1
  iterations: number
  salt: string
  iv: string
  data: string
  revision: string
  enabled: boolean
}
const ITERATIONS = 600_000
const bytes = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0))
const base64 = (v: Uint8Array) => {
  let s = ''
  for (const b of v) s += String.fromCharCode(b)
  return btoa(s)
}
export async function deriveVaultKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = ITERATIONS
) {
  if (iterations < 100_000 || iterations > 2_000_000) throw new Error('备份派生参数不受支持。')
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
export function validateEnvelope(value: unknown): Envelope {
  const e = value as Envelope
  if (
    !e ||
    e.version !== 1 ||
    !Number.isInteger(e.iterations) ||
    e.iterations < 100_000 ||
    e.iterations > 2_000_000 ||
    typeof e.salt !== 'string' ||
    typeof e.iv !== 'string' ||
    typeof e.data !== 'string' ||
    typeof e.revision !== 'string' ||
    typeof e.enabled !== 'boolean' ||
    e.data.length > 14_000_000
  )
    throw new Error('备份格式或版本不受支持。')
  try {
    if (bytes(e.salt).length !== 16 || bytes(e.iv).length !== 12 || bytes(e.data).length < 16)
      throw new Error()
  } catch {
    throw new Error('备份格式不正确。')
  }
  return e
}
export async function encryptVault(
  data: unknown,
  key: CryptoKey,
  salt: string,
  enabled = true,
  iterations = ITERATIONS
): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  )
  return {
    version: 1,
    iterations,
    salt,
    iv: base64(iv),
    data: base64(new Uint8Array(encrypted)),
    revision: crypto.randomUUID(),
    enabled
  }
}
export async function createEncryptedVault(password: string, data: unknown) {
  if (password.length < 4) throw new Error('请使用至少 4 个字符的解锁口令。')
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    key = await deriveVaultKey(password, salt)
  return { key, envelope: await encryptVault(data, key, base64(salt)) }
}
export async function decryptVault(
  envelope: Envelope,
  password: string
): Promise<{ key: CryptoKey; data: unknown }> {
  const e = validateEnvelope(envelope),
    key = await deriveVaultKey(password, bytes(e.salt), e.iterations)
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes(e.iv) },
      key,
      bytes(e.data)
    )
    return { key, data: JSON.parse(new TextDecoder().decode(decrypted)) }
  } catch {
    throw new Error('口令不正确，或备份文件已损坏。')
  }
}
