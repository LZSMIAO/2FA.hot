export type PasskeyOperation = 'list' | 'import' | 'export' | 'remove'
export interface PasskeySummary {
  rpId: string
  credentialId: string
  userName: string
  userDisplayName: string
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
      !Number.isFinite(item.createdAt) ||
      !(item.lastUsedAt === null || Number.isFinite(item.lastUsedAt))
    )
      return null
    records.push({
      rpId: item.rpId,
      credentialId: item.credentialId,
      userName: item.userName,
      userDisplayName: item.userDisplayName,
      createdAt: item.createdAt,
      lastUsedAt: item.lastUsedAt
    })
  }
  return records
}
