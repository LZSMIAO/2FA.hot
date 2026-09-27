export type PasskeyOperation = 'list' | 'import' | 'export' | 'remove' | 'rename'
export interface PasskeySummary {
  rpId: string
  credentialId: string
  userName: string
  userDisplayName: string
  /** A name the user gave it; protocol 1 extensions never send one. */
  label: string | null
  createdAt: number
  lastUsedAt: number | null
}
export function readPasskeySummaries(value: unknown): PasskeySummary[] | null {
  if (!Array.isArray(value) || value.length > 1000) return null
  const records: PasskeySummary[] = []
  for (const item of value) {
    if (
      !item ||
      typeof item.rpId !== 'string' ||
      item.rpId.length > 253 ||
      typeof item.credentialId !== 'string' ||
      item.credentialId.length > 1400 ||
      typeof item.userName !== 'string' ||
      item.userName.length > 256 ||
      typeof item.userDisplayName !== 'string' ||
      item.userDisplayName.length > 256 ||
      !(
        item.label === undefined ||
        item.label === null ||
        (typeof item.label === 'string' && item.label.length <= 256)
      ) ||
      !Number.isFinite(item.createdAt) ||
      !(item.lastUsedAt === null || Number.isFinite(item.lastUsedAt))
    )
      return null
    records.push({
      rpId: item.rpId,
      credentialId: item.credentialId,
      userName: item.userName,
      userDisplayName: item.userDisplayName,
      label: item.label || null,
      createdAt: item.createdAt,
      lastUsedAt: item.lastUsedAt
    })
  }
  return records
}
/**
 * Whether a saved 2FA code belongs to the same website as a passkey: an issuer
 * named "GitHub" goes with github.com, "Google" with accounts.google.com. Only
 * whole domain labels count, so a short or partial name never matches by accident.
 */
export function sameSite(rpId: string, issuer: string) {
  const name = issuer.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (name.length < 3) return false
  return rpId
    .toLowerCase()
    .split('.')
    .slice(0, -1)
    .some((part) => part.replace(/[^a-z0-9]/g, '') === name)
}
