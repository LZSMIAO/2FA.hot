import { supportedLocales } from '../../shared/locales.ts'
import { isSealedFragment, openFragment, sealFragment } from './sealed-link.ts'
export type Algorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'
export type OtpKind = 'totp'
export interface OtpConfig {
  secret: string
  algorithm: Algorithm
  digits: 6 | 8
  period: number
  label: string
  issuer: string
  kind?: OtpKind
}
export const defaults = { algorithm: 'SHA-1' as Algorithm, digits: 6 as const, period: 30 }
export const DEMO_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ' // RFC 6238 public test vector
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const linkHosts = ['2fa.hot', 'www.2fa.hot', 'localhost', '127.0.0.1', '[::1]']

export function normalizeSecret(raw: string): string {
  const compact = raw.replace(/\s/g, '').toUpperCase()
  if (!compact || compact.length > 1024 || !/^[A-Z2-7]+=*$/.test(compact))
    throw new Error('密钥格式不正确，请检查是否包含多余字符。')
  const secret = compact.replace(/=+$/, '')
  if ([1, 3, 6].includes(secret.length % 8)) throw new Error('密钥长度不完整，请检查是否遗漏字符。')
  const padding = compact.length - secret.length
  if (padding && (compact.length % 8 !== 0 || padding !== (8 - (secret.length % 8)) % 8))
    throw new Error('密钥末尾填充格式不正确。')
  const bytes = decodeBase32(secret)
  if (bytes.length < 10) throw new Error('密钥过短，请使用完整的 2FA 密钥。')
  return secret
}
export function decodeBase32(secret: string): Uint8Array<ArrayBuffer> {
  let buffer = 0,
    bits = 0
  const result: number[] = []
  for (const char of secret) {
    const n = alphabet.indexOf(char)
    if (n < 0) throw new Error('密钥中含有无效字符。')
    buffer = (buffer << 5) | n
    bits += 5
    if (bits >= 8) {
      bits -= 8
      result.push((buffer >>> bits) & 255)
    }
  }
  if (bits && buffer & ((1 << bits) - 1)) throw new Error('密钥末尾编码不完整。')
  return new Uint8Array(result)
}
export function validateOptions(options: Partial<OtpConfig>): OtpConfig {
  const c = { ...defaults, label: '', issuer: '', secret: '', ...options }
  // Only TOTP is generated. An entry of any other kind, such as one kept in an
  // older local history, is reported instead of being shown with a wrong code.
  if (c.kind !== undefined && c.kind !== 'totp')
    throw new Error('仅支持 TOTP 配置，不支持 HOTP 或其他链接。')
  if (!['SHA-1', 'SHA-256', 'SHA-512'].includes(c.algorithm))
    throw new Error('不支持的验证码算法。')
  if (c.digits !== 6 && c.digits !== 8) throw new Error('验证码位数必须为 6 或 8。')
  if (!Number.isInteger(c.period) || c.period < 15 || c.period > 120)
    throw new Error('更新周期应为 15–120 秒的整数。')
  if (
    typeof c.label !== 'string' ||
    typeof c.issuer !== 'string' ||
    c.label.length > 120 ||
    c.issuer.length > 120
  )
    throw new Error('服务名称或标签过长。')
  return { ...c, secret: normalizeSecret(c.secret) }
}
export function parseOtp(raw: string, options: Partial<OtpConfig> = {}): OtpConfig {
  if (raw.length > 8192) throw new Error('输入过长，请检查密钥或配置链接。')
  const input = raw.trim()
  if (/^https?:\/\//i.test(input) || input.startsWith('/2fa')) {
    let link: URL
    try {
      link = new URL(input, 'https://2fa.hot')
    } catch {
      throw new Error('配置链接格式不正确。')
    }
    const parts = link.pathname.split('/')
    if (supportedLocales.some((locale) => locale.code === parts[1])) parts.splice(1, 1)
    const path = parts.join('/')
    const fragmentLink = /^\/2fa\/?$/.test(path) && !!link.hash
    if (
      !linkHosts.includes(link.hostname) ||
      link.username ||
      link.password ||
      (!fragmentLink && (link.hash || !/^\/2fa\/[^/]+\/?$/.test(path)))
    )
      throw new Error('仅支持 TOTP 配置，不支持 HOTP 或其他链接。')
    // A safe link opens here, in the browser, into the plain link it seals.
    const fragment =
      fragmentLink && isSealedFragment(link.hash) ? openFragment(link.hash) : link.hash.slice(1)
    const [fragmentSecret = '', fragmentQuery = ''] = fragment.split('?')
    const parameters = new URLSearchParams(link.search)
    if (fragmentLink)
      new URLSearchParams(fragmentQuery).forEach((value, name) => parameters.append(name, value))
    for (const name of ['algorithm', 'digits', 'period', 'kind'])
      if (parameters.getAll(name).length > 1) throw new Error('配置链接含有重复参数。')
    let secret: string
    try {
      secret = decodeURIComponent(fragmentLink ? fragmentSecret : parts[2]!)
    } catch {
      throw new Error('配置链接格式不正确。')
    }
    const kind = parameters.get('kind')
    if (kind && kind !== 'totp') throw new Error('配置链接格式不正确。')
    return validateOptions({
      secret,
      algorithm: algorithmFrom(parameters.get('algorithm') || 'SHA1'),
      digits: Number(parameters.get('digits') || 6) as 6 | 8,
      period: Number(parameters.get('period') || 30)
    })
  }
  if (!/^otpauth:/i.test(input)) return validateOptions({ ...options, secret: input })
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('配置链接格式不正确。')
  }
  if (
    url.protocol !== 'otpauth:' ||
    url.hostname !== 'totp' ||
    url.username ||
    url.password ||
    url.hash ||
    // A non-standard encoder writes codes differently; standard TOTP would not match them.
    url.searchParams.has('encoder')
  )
    throw new Error('仅支持 TOTP 配置，不支持 HOTP 或其他链接。')
  for (const field of ['secret', 'algorithm', 'digits', 'period', 'issuer'])
    if (url.searchParams.getAll(field).length > 1) throw new Error('配置链接含有重复参数。')
  let label: string
  try {
    label = decodeURIComponent(url.pathname.slice(1))
  } catch {
    throw new Error('配置名称编码不正确。')
  }
  const issuer = url.searchParams.get('issuer') || ''
  const prefix =
    issuer && label.startsWith(issuer + ':')
      ? issuer
      : label.includes(':')
        ? label.split(':')[0]!
        : ''
  if (prefix && issuer && prefix !== issuer) throw new Error('配置中的服务名称不一致。')
  const config = {
    secret: url.searchParams.get('secret') || '',
    algorithm: algorithmFrom(url.searchParams.get('algorithm') || 'SHA1'),
    digits: Number(url.searchParams.get('digits') || 6) as 6 | 8,
    period: Number(url.searchParams.get('period') || 30),
    label: prefix ? label.slice(prefix.length + 1).trim() : label,
    issuer: issuer || prefix
  }
  return validateOptions(config)
}
export function algorithmFrom(value: string): Algorithm {
  const v = value.toUpperCase().replace(/-/g, '')
  const map: Record<string, Algorithm> = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA512: 'SHA-512' }
  if (!map[v]) throw new Error('不支持的验证码算法。')
  return map[v]
}
export async function generateOtp(config: OtpConfig, time = Date.now()): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error('当前环境无法本地计算，请使用 HTTPS 或 localhost。')
  const c = validateOptions(config)
  if (!Number.isFinite(time) || time < 0) throw new Error('设备时间不正确。')
  const counter = new ArrayBuffer(8)
  new DataView(counter).setBigUint64(0, BigInt(Math.floor(time / 1000 / c.period)))
  const key = await crypto.subtle.importKey(
    'raw',
    decodeBase32(c.secret),
    { name: 'HMAC', hash: c.algorithm },
    false,
    ['sign']
  )
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter))
  const offset = digest[digest.length - 1]! & 15
  const binary =
    ((digest[offset]! & 127) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!
  return (binary % 10 ** c.digits).toString().padStart(c.digits, '0')
}
export function toOtpUri(config: OtpConfig): string {
  const c = validateOptions(config)
  const label = c.issuer ? `${c.issuer}:${c.label || '2FA'}` : c.label || '2FA'
  const query = new URLSearchParams({
    secret: c.secret,
    algorithm: c.algorithm.replace(/-/g, ''),
    digits: String(c.digits),
    period: String(c.period)
  })
  if (c.issuer) query.set('issuer', c.issuer)
  return `otpauth://totp/${encodeURIComponent(label)}?${query}`
}
export function toAccessPath(config: OtpConfig): string {
  const c = validateOptions(config),
    query = new URLSearchParams()
  if (c.algorithm !== 'SHA-1') query.set('algorithm', c.algorithm.replace(/-/g, ''))
  if (c.digits !== 6) query.set('digits', String(c.digits))
  if (c.period !== 30) query.set('period', String(c.period))
  const parameters = query.toString()
  return `/2fa#${encodeURIComponent(c.secret)}${parameters ? `?${parameters}` : ''}`
}
/**
 * Several keys share the single-key link: /2fa#KEY1#KEY2, each written as it
 * would be alone (KEY?digits=8). A key and its options never contain # once
 * encoded, so it separates them without escaping. One key is a plain link.
 */
export function accessPath(configs: readonly OtpConfig[]): string {
  return '/2fa#' + configs.map((config) => toAccessPath(config).slice('/2fa#'.length)).join('#')
}

/** The same link with its keys sealed in the browser: /2fa#~… (see sealed-link.ts). */
export function sealedAccessPath(configs: readonly OtpConfig[]): string {
  return '/2fa#' + sealFragment(accessPath(configs).slice('/2fa#'.length))
}

/** The keys a /2fa#KEY1#KEY2 fragment holds; commas, half- or full-width, also separate. */
export function accessEntries(fragment: string): OtpConfig[] {
  if (isSealedFragment(fragment)) return accessEntries(openFragment(fragment))
  const entries = fragment
    .replace(/^#/, '')
    .split(/[#,，]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (!entries.length) throw new Error('配置链接格式不正确。')
  return entries.map((entry) => parseOtp('/2fa#' + entry))
}

/** Every key a whole pasted /2fa# link holds, plain or safe; [] when it is not one. */
export function accessLinkEntries(input: string): OtpConfig[] {
  let link: URL
  try {
    link = new URL(input.trim(), 'https://2fa.hot')
  } catch {
    return []
  }
  const parts = link.pathname.split('/')
  if (supportedLocales.some((locale) => locale.code === parts[1])) parts.splice(1, 1)
  if (
    !linkHosts.includes(link.hostname) ||
    link.username ||
    link.password ||
    link.search ||
    !link.hash ||
    !/^\/2fa\/?$/.test(parts.join('/'))
  )
    return []
  return accessEntries(link.hash)
}
export function groupCode(code: string) {
  return code.length === 8
    ? `${code.slice(0, 4)} ${code.slice(4)}`
    : `${code.slice(0, 3)} ${code.slice(3)}`
}
export function remainingSeconds(period: number, time = Date.now()) {
  return period - (Math.floor(time / 1000) % period)
}
export function identity(c: OtpConfig) {
  return `${c.kind ?? 'totp'}:${c.secret}:${c.algorithm}:${c.digits}:${c.period}`
}
export interface BatchEntry {
  line: number
  config?: OtpConfig
  error?: string
  duplicate?: boolean
}
export function parseBatch(text: string): BatchEntry[] {
  if (new TextEncoder().encode(text).length > 100_000)
    throw new Error('文本超过 100KB，请分批处理。')
  const lines = text
    .split(/\r?\n/)
    .map((value, index) => ({ value: value.trim(), line: index + 1 }))
    .filter((x) => x.value)
  if (lines.length > 100) throw new Error('每次最多 100 条，请分批处理。')
  const seen = new Set<string>()
  return lines.map(({ value, line }) => {
    try {
      const parts = value.split('\t')
      if (parts.length > 2) throw new Error('每行格式为密钥，或标签与密钥（制表符分隔）。')
      const config = parseOtp(parts[parts.length - 1]!)
      if (parts.length === 2) config.label = parts[0]!.slice(0, 120)
      const key = identity(config),
        duplicate = seen.has(key)
      seen.add(key)
      return { line, config, duplicate }
    } catch (error) {
      return { line, error: error instanceof Error ? error.message : '格式不正确。' }
    }
  })
}
