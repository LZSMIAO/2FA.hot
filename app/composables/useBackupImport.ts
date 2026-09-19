import { onScopeDispose, shallowRef } from 'vue'
import type { VaultRecord } from './useVault.ts'

/** File reads, decrypted previews and merges belong to one active import session. */
export function useBackupImport(options: {
  active: () => boolean
  inspect: (text: string, password: string) => Promise<VaultRecord[]>
  merge: (records: VaultRecord[]) => Promise<unknown>
}) {
  const text = shallowRef('')
  const password = shallowRef('')
  const records = shallowRef<VaultRecord[] | null>(null)
  const error = shallowRef('')
  const reading = shallowRef(false)
  const inspecting = shallowRef(false)
  const merging = shallowRef(false)
  let generation = 0
  let disposed = false
  const current = (id: number) => !disposed && id === generation && options.active()
  function reset() {
    generation++
    text.value = ''
    password.value = ''
    records.value = null
    error.value = ''
    reading.value = inspecting.value = merging.value = false
  }
  async function read(file?: Pick<File, 'size' | 'text'>) {
    reset()
    const id = generation
    if (!file || !current(id)) return
    if (file.size > 10_000_000) {
      error.value = '备份不能超过 10MB。'
      return
    }
    reading.value = true
    try {
      const value = await file.text()
      if (current(id)) text.value = value
    } catch {
      if (current(id)) error.value = '无法完成操作，请重试。'
    } finally {
      if (current(id)) reading.value = false
    }
  }
  async function inspect() {
    if (!options.active() || disposed || reading.value || inspecting.value || !text.value) return
    const id = ++generation
    records.value = null
    error.value = ''
    inspecting.value = true
    try {
      const value = await options.inspect(text.value, password.value)
      if (current(id)) {
        records.value = value
        password.value = ''
      }
    } catch (cause) {
      if (current(id)) error.value = (cause as Error).message
    } finally {
      if (current(id)) inspecting.value = false
    }
  }
  async function merge() {
    if (
      !current(generation) ||
      !records.value ||
      reading.value ||
      inspecting.value ||
      merging.value
    )
      return false
    const id = generation
    const value = records.value
    merging.value = true
    error.value = ''
    try {
      await options.merge(value)
      return current(id)
    } catch (cause) {
      if (current(id)) error.value = (cause as Error).message
      return false
    } finally {
      if (current(id)) merging.value = false
    }
  }
  onScopeDispose(() => {
    disposed = true
    reset()
  })
  return {
    text,
    password,
    records,
    error,
    reading,
    inspecting,
    merging,
    reset,
    read,
    inspect,
    merge
  }
}
