import { decode, encode, random, utf8 } from './encoding.js'
import { validateRp } from './webauthn.js'
const FORMAT = '2fa.hot/passkeys'
const iterations = 600000
export function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024)
    throw new Error('请设置至少 12 个字符的主口令。')
}
async function passwordBits(password, salt, rounds) {
  if (typeof password !== 'string' || password.length > 1024) throw new Error('主口令格式不正确。')
  const material = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, [
    'deriveBits'
  ])
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds },
      material,
      256
    )
  )
}
const aesKey = (raw) =>
  crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
async function encrypt(raw, plain, additional) {
  const iv = random(12)
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: utf8(additional) },
    await aesKey(raw),
    plain
  )
  return { iv: encode(iv), data: encode(data) }
}
async function decrypt(raw, box, additional, limit = 4000000) {
  const iv = decode(box?.iv, 12),
    data = decode(box?.data, limit)
  if (iv.length !== 12 || data.length < 16) throw new Error('备份文件不完整。')
  return new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: utf8(additional) },
      await aesKey(raw),
      data
    )
  )
}
function checkKdf(envelope, version) {
  if (
    !envelope ||
    envelope.format !== FORMAT ||
    envelope.version !== version ||
    envelope.kdf !== 'PBKDF2-SHA256' ||
    !Number.isInteger(envelope.iterations) ||
    envelope.iterations < 100000 ||
    envelope.iterations > 2000000 ||
    decode(envelope.salt, 16).length !== 16
  )
    throw new Error('备份格式或版本不支持。')
}
const parseRecords = (plain) => validateRecords(JSON.parse(new TextDecoder().decode(plain)))

/*
 * Version 1 seals records straight under a password-derived key. Backups keep
 * this format, so a backup opens with nothing but its own backup password.
 */
export async function seal(records, password) {
  checkPassword(password)
  const salt = random(16)
  const raw = await passwordBits(password, salt, iterations)
  const box = await encrypt(raw, utf8(JSON.stringify(records)), `${FORMAT}/1`)
  return {
    format: FORMAT,
    version: 1,
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: encode(salt),
    ...box,
    revision: crypto.randomUUID()
  }
}
export async function unseal(envelope, password) {
  checkKdf(envelope, 1)
  try {
    const raw = await passwordBits(password, decode(envelope.salt, 16), envelope.iterations)
    return await parseRecords(await decrypt(raw, envelope, `${FORMAT}/1`))
  } catch {
    throw new Error('口令不正确，或备份文件已损坏。')
  }
}

/*
 * Version 2 is the local vault. A random key encrypts the records, and the
 * master password wraps that key. Quick unlock keeps only the key in session
 * memory, a device authenticator can wrap the same key, and changing the
 * password rewraps the key without touching the records.
 */
export async function createVault(records, password) {
  checkPassword(password)
  const key = random(32)
  return { envelope: await wrapVault(await writeVault(null, records, key), key, password), key }
}
async function wrapVault(envelope, key, password) {
  const salt = random(16)
  const kek = await passwordBits(password, salt, iterations)
  return {
    ...envelope,
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: encode(salt),
    key: await encrypt(kek, key, `${FORMAT}/2/key`)
  }
}
export async function writeVault(envelope, records, key) {
  const box = await encrypt(key, utf8(JSON.stringify(records)), `${FORMAT}/2`)
  return {
    ...(envelope ?? {}),
    format: FORMAT,
    version: 2,
    records: box,
    revision: crypto.randomUUID()
  }
}
export async function readVault(envelope, key) {
  checkKdf(envelope, 2)
  try {
    return await parseRecords(await decrypt(key, envelope.records, `${FORMAT}/2`))
  } catch {
    throw new Error('密钥库已锁定或已损坏，请重新解锁。')
  }
}
/** The vault key behind the password, and the records it opens. A version 1 vault is upgraded. */
export async function openVault(envelope, password) {
  if (envelope?.version === 1) {
    const records = await unseal(envelope, password)
    const upgraded = await createVault(records, password)
    return { records, key: upgraded.key, upgraded: upgraded.envelope }
  }
  checkKdf(envelope, 2)
  let key
  try {
    const kek = await passwordBits(password, decode(envelope.salt, 16), envelope.iterations)
    key = await decrypt(kek, envelope.key, `${FORMAT}/2/key`, 64)
  } catch {
    throw new Error('主口令不正确。')
  }
  if (key.length !== 32) throw new Error('密钥库已损坏。')
  return { records: await readVault(envelope, key), key }
}
export async function changeVaultPassword(envelope, key, nextPassword) {
  checkPassword(nextPassword)
  await readVault(envelope, key)
  return wrapVault(envelope, key, nextPassword)
}
/** Wraps the vault key under a device authenticator's PRF output. */
export async function wrapWithSecret(key, secret) {
  return encrypt(await secretKey(secret), key, `${FORMAT}/2/device`)
}
export async function unwrapWithSecret(box, secret) {
  try {
    const key = await decrypt(await secretKey(secret), box, `${FORMAT}/2/device`, 64)
    if (key.length !== 32) throw new Error()
    return key
  } catch {
    throw new Error('设备验证未能解锁密钥库，请改用主口令。')
  }
}
async function secretKey(secret) {
  const bytes = decode(secret, 64)
  if (bytes.length < 32) throw new Error('设备验证结果不完整。')
  const material = await crypto.subtle.importKey('raw', bytes, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: utf8(`${FORMAT}/device`) },
      material,
      256
    )
  )
}

const optionalText = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.length <= 256)
export async function validateRecords(value) {
  if (!Array.isArray(value) || value.length > 1000)
    throw new Error('凭据格式不正确或超过 1000 条。')
  const seen = new Set(),
    output = []
  for (const r of value) {
    if (
      !r ||
      typeof r.rpId !== 'string' ||
      !decode(r.credentialId, 1024).length ||
      !decode(r.userHandle, 64).length ||
      typeof r.userName !== 'string' ||
      r.userName.length > 256 ||
      typeof r.userDisplayName !== 'string' ||
      r.userDisplayName.length > 256 ||
      !optionalText(r.label) ||
      (r.prfSeed != null && decode(r.prfSeed, 32).length !== 32) ||
      !Number.isInteger(r.counter) ||
      r.counter < 0 ||
      r.counter > 0xffffffff ||
      typeof r.discoverable !== 'boolean' ||
      typeof r.backupEligible !== 'boolean' ||
      typeof r.backupState !== 'boolean' ||
      (r.backupState && !r.backupEligible)
    )
      throw new Error('凭据字段不完整。')
    validateRp(`https://${r.rpId}`, r.rpId)
    const id = `${r.rpId}:${r.credentialId}`
    if (seen.has(id)) throw new Error('文件包含重复凭据。')
    seen.add(id)
    await crypto.subtle.importKey(
      'pkcs8',
      decode(r.privateKey, 1024),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
    output.push({
      credentialId: r.credentialId,
      rpId: r.rpId,
      userHandle: r.userHandle,
      userName: r.userName,
      userDisplayName: r.userDisplayName,
      label: r.label?.trim() || null,
      privateKey: r.privateKey,
      prfSeed: r.prfSeed ?? null,
      counter: r.counter,
      discoverable: r.discoverable,
      backupEligible: r.backupEligible,
      backupState: r.backupState,
      createdAt: Number.isFinite(r.createdAt) ? r.createdAt : Date.now(),
      lastUsedAt: Number.isFinite(r.lastUsedAt) ? r.lastUsedAt : null
    })
  }
  return output
}
/** What may leave the vault's own code: never a private key or a PRF seed. */
export function publicRecords(records) {
  return records.map(({ privateKey, prfSeed, ...record }) => record)
}
export function mergeRecords(current, incoming) {
  const next = current.map((r) => ({ ...r }))
  let added = 0,
    duplicates = 0
  for (const r of incoming) {
    const old = next.find((item) => item.rpId === r.rpId && item.credentialId === r.credentialId)
    if (old) {
      if (
        old.privateKey !== r.privateKey ||
        old.userHandle !== r.userHandle ||
        old.backupEligible !== r.backupEligible ||
        (old.prfSeed && r.prfSeed && old.prfSeed !== r.prfSeed)
      )
        throw new Error('同一凭据包含冲突数据，未导入。')
      old.counter = Math.max(old.counter, r.counter)
      old.prfSeed ??= r.prfSeed
      old.label ??= r.label
      duplicates++
    } else {
      next.push(r)
      added++
    }
  }
  if (next.length > 1000) throw new Error('最多保存 1000 条通行密钥。')
  return { records: next, added, duplicates }
}
