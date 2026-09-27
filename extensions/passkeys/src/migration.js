import { decode, encode } from './encoding.js'
import { validateRecords, unseal } from './vault.js'
const normalize = (s) => {
  if (typeof s !== 'string' || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(s))
    throw new Error('导入文件中的密钥编码不正确。')
  return encode(decode(s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), 1024))
}
function credentialId(s) {
  if (typeof s !== 'string') throw new Error('缺少凭据 ID。')
  if (s.startsWith('b64.')) return normalize(s.slice(4))
  if (/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s))
    return encode(Uint8Array.from(s.replaceAll('-', '').match(/../g), (h) => parseInt(h, 16)))
  throw new Error('暂不支持此凭据 ID 格式。')
}
export async function parseImport(text, password = '') {
  if (typeof text !== 'string' || text.length > 8000000) throw new Error('导入文件超过 8MB。')
  let value
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('请选择有效的 JSON 或加密备份文件。')
  }
  if (value.format === '2fa.hot/passkeys')
    return { records: await unseal(value, password), skipped: 0, source: '2fa.hot' }
  if (value.encrypted !== false || !Array.isArray(value.items) || value.items.length > 5000)
    throw new Error('支持本站加密备份和 Bitwarden 未加密 JSON。')
  const records = []
  let skipped = 0
  for (const item of value.items) {
    if (item.deletedDate) continue
    const credentials = item.login?.fido2Credentials
    if (!credentials) continue
    if (!Array.isArray(credentials) || credentials.length > 1000)
      throw new Error('导入文件中的凭据列表不正确。')
    for (const r of credentials) {
      if (
        r.keyType !== 'public-key' ||
        r.keyAlgorithm !== 'ECDSA' ||
        r.keyCurve !== 'P-256' ||
        (r.extensions && Object.keys(r.extensions).length)
      ) {
        skipped++
        continue
      }
      records.push({
        credentialId: credentialId(r.credentialId),
        rpId: r.rpId,
        userHandle: normalize(r.userHandle),
        userName: r.userName ?? item.login.username ?? '',
        userDisplayName: r.userDisplayName ?? '',
        // The item's own name, when it says more than the domain does.
        label:
          typeof item.name === 'string' && item.name.trim() && item.name.trim() !== r.rpId
            ? item.name.trim().slice(0, 256)
            : null,
        privateKey: normalize(r.keyValue),
        counter: Number(r.counter),
        discoverable: r.discoverable === 'true' || r.discoverable === true,
        backupEligible: true,
        backupState: true,
        createdAt: Date.parse(r.creationDate),
        lastUsedAt: null
      })
    }
  }
  if (!records.length) throw new Error('文件中没有受支持的通行密钥。密码和 TOTP 不会导入。')
  return { records: await validateRecords(records), skipped, source: 'Bitwarden JSON' }
}
export function exportBitwarden(records) {
  if (records.some((r) => !r.backupEligible)) throw new Error('此凭据不支持可迁移的导出格式。')
  return JSON.stringify(
    {
      encrypted: false,
      folders: [],
      items: records.map((r) => ({
        id: crypto.randomUUID(),
        organizationId: null,
        folderId: null,
        type: 1,
        reprompt: 0,
        name: r.label || r.rpId,
        notes: null,
        favorite: false,
        fields: [],
        collectionIds: null,
        login: {
          username: r.userName,
          password: null,
          totp: null,
          uris: [{ match: null, uri: `https://${r.rpId}` }],
          fido2Credentials: [
            {
              credentialId: `b64.${r.credentialId}`,
              keyType: 'public-key',
              keyAlgorithm: 'ECDSA',
              keyCurve: 'P-256',
              keyValue: r.privateKey,
              rpId: r.rpId,
              userHandle: r.userHandle,
              userName: r.userName,
              counter: String(r.counter),
              rpName: r.rpId,
              userDisplayName: r.userDisplayName,
              discoverable: String(r.discoverable),
              creationDate: new Date(r.createdAt).toISOString()
            }
          ]
        }
      }))
    },
    null,
    2
  )
}
