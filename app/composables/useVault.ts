import {
  computed,
  shallowRef,
  readonly,
  onMounted,
  onBeforeUnmount,
  inject,
  type InjectionKey
} from 'vue'
import type { OtpConfig } from '../utils/otp.ts'
import { identity, validateOptions } from '../utils/otp.ts'
import {
  createEncryptedVault,
  decryptVault,
  encryptVault,
  validateEnvelope,
  type Envelope
} from '../utils/vault-crypto.ts'
import { readEnvelope, writeEnvelope, type StoredEnvelope } from '../utils/storage.ts'
export interface VaultRecord extends OtpConfig {
  id: string
  note: string
  usedAt: number
  batchId?: string
}
export interface SessionRecord extends VaultRecord {
  batch?: readonly OtpConfig[]
}
function validRecords(value: unknown): VaultRecord[] {
  if (!Array.isArray(value) || value.length > 1000)
    throw new Error('历史数据格式不正确或超过 1000 条。')
  const ids = new Set<string>()
  return value.map((r) => {
    if (
      !r ||
      typeof r.id !== 'string' ||
      ids.has(r.id) ||
      (r.batchId !== undefined &&
        (typeof r.batchId !== 'string' || !r.batchId || r.batchId.length > 120)) ||
      typeof r.note !== 'string' ||
      r.note.length > 1000 ||
      !Number.isFinite(r.usedAt) ||
      !Number.isFinite(new Date(r.usedAt).getTime())
    )
      throw new Error('历史数据格式不正确。')
    ids.add(r.id)
    return {
      ...validateOptions(r),
      id: r.id,
      note: r.note,
      usedAt: r.usedAt,
      ...(r.batchId ? { batchId: r.batchId } : {})
    }
  })
}
export function createVault() {
  const envelope = shallowRef<StoredEnvelope>(),
    records = shallowRef<VaultRecord[]>([]),
    key = shallowRef<CryptoKey>(),
    busy = shallowRef(false),
    issue = shallowRef('')
  const recent = shallowRef<SessionRecord[]>([])
  const recentVersion = shallowRef(0)
  function remember(configs: OtpConfig[]) {
    const next = [...recent.value]
    for (const config of configs) {
      const index = next.findIndex((row) => !row.batch && identity(row) === identity(config))
      const previous = index >= 0 ? next.splice(index, 1)[0] : undefined
      next.unshift({
        ...config,
        label: previous?.label ?? config.label,
        id: previous?.id ?? crypto.randomUUID(),
        note: previous?.note ?? '',
        usedAt: Date.now()
      })
    }
    recent.value = next.slice(0, 100)
  }
  function rememberBatch(configs: OtpConfig[], id: string) {
    if (!configs.length) return
    const previous =
      recent.value.find((row) => row.id === id) ||
      recent.value.find((row) => row.batch && JSON.stringify(row.batch) === JSON.stringify(configs))
    const row: SessionRecord = {
      ...configs[0]!,
      id,
      label: previous?.label || '',
      issuer: '',
      note: '',
      usedAt: Date.now(),
      batch: configs.map((config) => ({ ...config }))
    }
    recent.value = [
      row,
      ...recent.value.filter((entry) => entry.id !== id && entry.id !== previous?.id)
    ].slice(0, 100)
  }
  function clearRecent() {
    recentVersion.value++
    recent.value = []
  }
  const ready = shallowRef(false),
    pending = shallowRef<{ config: OtpConfig; historyPreview: boolean }>()
  const passwordProtected = computed(() => envelope.value?.version === 1)
  const unlocked = computed(() => envelope.value?.version === 2 || !!key.value),
    enabled = computed(() => envelope.value?.enabled ?? false),
    exists = computed(() => !!envelope.value)
  const status = computed(() =>
    !enabled.value ? '本地历史：关闭' : unlocked.value ? '本地历史：已开启' : '本地历史：已锁定'
  )
  let session = 0
  let channel: BroadcastChannel | undefined,
    lastActive = Date.now(),
    timer: ReturnType<typeof setInterval> | undefined
  function lock() {
    session++
    key.value = undefined
    if (envelope.value?.version !== 2) records.value = []
    pending.value = undefined
  }
  let refreshVersion = 0
  async function refresh() {
    const version = ++refreshVersion
    try {
      const stored = await readEnvelope()
      if (version !== refreshVersion) return
      const plain = stored?.version === 2 ? validRecords(stored.data) : []
      envelope.value = stored
      records.value = plain
      issue.value = ''
    } catch (e) {
      if (version !== refreshVersion) return
      lock()
      envelope.value = undefined
      records.value = []
      issue.value = (e as Error).message
    } finally {
      ready.value = true
    }
  }
  async function operation<T>(fn: () => Promise<T>): Promise<T> {
    if (busy.value) throw new Error('上一项操作尚未完成，请稍后重试。')
    busy.value = true
    try {
      return await fn()
    } finally {
      busy.value = false
    }
  }
  async function commit(next: VaultRecord[], save = enabled.value) {
    const epoch = session
    const current = envelope.value,
      sessionKey = key.value
    if (!current || (current.version === 1 && !sessionKey)) throw new Error('请先解锁本地历史。')
    if (next.length > 1000) throw new Error('最多保存 1000 条，请先备份或清理。')
    const encrypted: StoredEnvelope =
      current.version === 2
        ? { ...current, data: next, enabled: save, revision: crypto.randomUUID() }
        : await encryptVault(next, sessionKey!, current.salt, save, current.iterations)
    if (epoch !== session || key.value !== sessionKey) throw new Error('历史已锁定，请重新解锁。')
    await writeEnvelope(encrypted, current.revision)
    envelope.value = encrypted
    if (epoch === session && key.value === sessionKey) records.value = next
    channel?.postMessage('changed')
  }
  async function enable(password?: string) {
    return operation(async () => {
      if (exists.value) throw new Error('已有本地历史，请先解锁。')
      const epoch = session
      const value =
        password === undefined
          ? {
              envelope: {
                version: 2,
                protection: 'none',
                data: [],
                enabled: true,
                revision: crypto.randomUUID()
              } as StoredEnvelope,
              key: undefined
            }
          : await createEncryptedVault(password, [])
      if (epoch !== session) throw new Error('操作已取消，请重新开启。')
      await writeEnvelope(value.envelope)
      envelope.value = value.envelope
      if (epoch === session) key.value = value.key
      records.value = []
      lastActive = Date.now()
      channel?.postMessage('changed')
    })
  }
  async function setPassword(password?: string) {
    return operation(async () => {
      const current = envelope.value
      if (!current || !unlocked.value) throw new Error('请先解锁本地历史。')
      const epoch = session
      const data = [...records.value]
      const value =
        password === undefined
          ? {
              envelope: {
                version: 2,
                protection: 'none',
                data,
                enabled: current.enabled,
                revision: crypto.randomUUID()
              } as StoredEnvelope,
              key: undefined
            }
          : await createEncryptedVault(password, data)
      value.envelope.enabled = current.enabled
      if (epoch !== session) throw new Error('操作已取消，请重新开启。')
      await writeEnvelope(value.envelope, current.revision)
      envelope.value = value.envelope
      if (epoch === session) {
        key.value = value.key
        records.value = data
      }
      lastActive = Date.now()
      channel?.postMessage('changed')
    })
  }
  async function unlock(password: string) {
    return operation(async () => {
      const epoch = session
      const current = await readEnvelope()
      if (!current) throw new Error('没有可解锁的本地历史。')
      if (current.version === 2) {
        records.value = validRecords(current.data)
        envelope.value = current
        return
      }
      const result = await decryptVault(current, password)
      const data = validRecords(result.data)
      if (epoch !== session) throw new Error('历史已锁定，请重新解锁。')
      const latest = await readEnvelope()
      if (latest?.revision !== current.revision)
        throw new Error('历史已在其他页面更新，请重新解锁。')
      envelope.value = current
      key.value = result.key
      records.value = data
      lastActive = Date.now()
    })
  }
  async function save(configs: OtpConfig[], batchId?: string, replaceBatch = false) {
    return operation(async () => {
      if (!enabled.value || !unlocked.value) return false
      const incoming = new Set(configs.map(identity))
      const next = records.value.filter(
        (row) => !replaceBatch || !batchId || row.batchId !== batchId || incoming.has(identity(row))
      )
      for (const config of configs) {
        const sessionRecord = recent.value.find(
          (row) => !row.batch && identity(row) === identity(config)
        )
        const c = {
          ...config,
          label: batchId ? config.label : (sessionRecord?.label ?? config.label)
        }
        const index = next.findIndex((r) => identity(r) === identity(c) && r.batchId === batchId)
        if (index >= 0)
          next[index] = {
            ...next[index]!,
            label: batchId ? c.label : next[index]!.label || c.label,
            issuer: batchId ? c.issuer : next[index]!.issuer || c.issuer,
            usedAt: Date.now()
          }
        else
          next.unshift({
            ...c,
            id: crypto.randomUUID(),
            note: '',
            usedAt: Date.now(),
            ...(batchId ? { batchId } : {})
          })
      }
      await commit(next)
      return true
    })
  }
  async function edit(id: string, label: string, note: string) {
    return operation(async () => {
      if (label.length > 120 || note.length > 1000) throw new Error('标签或备注过长。')
      const row = records.value.find((record) => record.id === id)
      if (!row) return
      await commit(records.value.map((r) => (r.id === id ? { ...r, label, note } : r)))
      recent.value = recent.value.map((entry) =>
        !entry.batch && identity(entry) === identity(row) ? { ...entry, label, note } : entry
      )
    })
  }
  async function editRecent(id: string, label: string) {
    return operation(async () => {
      if (label.length > 120) throw new Error('标签或备注过长。')
      const row = recent.value.find((entry) => entry.id === id)
      if (!row) return
      if (enabled.value && !row.batch) {
        if (!unlocked.value) throw new Error('请先开启并解锁本地历史。')
        const next = [...records.value]
        const index = next.findIndex((entry) => !entry.batchId && identity(entry) === identity(row))
        if (index >= 0) next[index] = { ...next[index]!, label }
        else next.unshift({ ...row, label })
        await commit(next)
      }
      recent.value = recent.value.map((entry) => (entry.id === id ? { ...entry, label } : entry))
    })
  }
  async function remove(ids: string[]) {
    return operation(() => commit(records.value.filter((r) => !ids.includes(r.id))))
  }
  async function disable() {
    return operation(async () => {
      const current = await readEnvelope()
      if (!current || !current.enabled) {
        envelope.value = current
        return
      }
      // The enabled flag is metadata; stopping writes never needs the decryption key.
      if (current.revision !== envelope.value?.revision) lock()
      const next = { ...current, enabled: false, revision: crypto.randomUUID() }
      await writeEnvelope(next, current.revision)
      envelope.value = next
      channel?.postMessage('changed')
    })
  }
  async function toggle() {
    return operation(() => commit(records.value, !enabled.value))
  }
  async function erase() {
    return operation(async () => {
      await writeEnvelope(undefined, envelope.value?.revision)
      lock()
      records.value = []
      envelope.value = undefined
      channel?.postMessage('changed')
    })
  }
  async function backup() {
    const e = await readEnvelope()
    if (!e) throw new Error('没有可备份的历史。')
    return JSON.stringify(e)
  }
  async function inspectBackup(text: string, password: string) {
    if (text.length > 10_000_000) throw new Error('备份文件过大。')
    let e: Envelope
    try {
      const parsed = JSON.parse(text)
      if (parsed?.version === 2 && parsed.protection === 'none') return validRecords(parsed.data)
      e = validateEnvelope(parsed)
    } catch {
      throw new Error('备份文件格式不正确。')
    }
    return validRecords((await decryptVault(e, password)).data)
  }
  async function merge(data: VaultRecord[]) {
    return operation(async () => {
      const next = [...records.value],
        seen = new Set(next.map((r) => identity(r) + ':' + (r.batchId || '')))
      for (const r of validRecords(data))
        if (!seen.has(identity(r) + ':' + (r.batchId || ''))) {
          next.push({ ...r, id: crypto.randomUUID() })
          seen.add(identity(r) + ':' + (r.batchId || ''))
        }
      await commit(next)
    })
  }
  function activity() {
    if (Date.now() - lastActive >= 30 * 60_000) lock()
    lastActive = Date.now()
  }
  onMounted(() => {
    refresh()
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('2fa-hot-vault')
      channel.onmessage = () => {
        lock()
        refresh()
      }
    }
    window.addEventListener('pointerdown', activity)
    window.addEventListener('keydown', activity)
    window.addEventListener('pagehide', lock)
    window.addEventListener('pagehide', clearRecent)
    timer = setInterval(() => {
      if (Date.now() - lastActive >= 30 * 60_000) lock()
    }, 1000)
  })
  onBeforeUnmount(() => {
    lock()
    channel?.close()
    clearInterval(timer)
    window.removeEventListener('pointerdown', activity)
    window.removeEventListener('keydown', activity)
    window.removeEventListener('pagehide', lock)
    window.removeEventListener('pagehide', clearRecent)
  })
  return {
    recent: readonly(recent),
    recentVersion: readonly(recentVersion),
    remember,
    rememberBatch,
    clearRecent,
    records: readonly(records),
    busy: readonly(busy),
    issue: readonly(issue),
    ready: readonly(ready),
    unlocked,
    passwordProtected,
    enabled,
    exists,
    status,
    pending,
    lock,
    enable,
    setPassword,
    unlock,
    save,
    edit,
    editRecent,
    remove,
    toggle,
    disable,
    erase,
    backup,
    inspectBackup,
    merge
  }
}
export const vaultKey: InjectionKey<ReturnType<typeof createVault>> = Symbol.for('2fa-hot.vault')
export function useVault() {
  const v = inject(vaultKey)
  if (!v) throw new Error('Vault provider missing')
  return v
}
