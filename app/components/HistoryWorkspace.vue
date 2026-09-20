<script setup lang="ts">
import type { VaultRecord } from '~/composables/useVault'
import { downloadFile } from '~/utils/download'

const localePath = useLocalePath()
const { tx, locale } = useMessages()
const protect = shallowRef(true)
const vault = useVault(),
  search = shallowRef(''),
  password = shallowRef(''),
  confirmation = shallowRef(''),
  error = shallowRef(''),
  note = shallowRef(''),
  selected = shallowRef<string[]>([])
const {
  protectionOpen,
  changingPassword,
  needsNewPassword,
  protectionChanged,
  nextProtection,
  newPassword,
  newConfirmation,
  openProtection,
  saveProtection
} = useHistoryProtection(vault, error, run)
const editor = shallowRef<VaultRecord | null>(null),
  groupEditor = shallowRef(''),
  label = shallowRef(''),
  remark = shallowRef(''),
  removing = shallowRef<string[] | null>(null),
  eraseOpen = shallowRef(false)
const importOpen = shallowRef(false)
const { copy: copySecretValue, copied: secretCopied, message: secretCopyError } = useCopy()
const copiedSecretId = shallowRef('')
const copyingSecret = shallowRef(false)
async function copySecret(id: string) {
  if (!vault.unlocked.value || copyingSecret.value) return
  const record = vault.records.value.find((item) => item.id === id)
  if (!record) return
  copyingSecret.value = true
  copiedSecretId.value = id
  error.value = ''
  note.value = ''
  try {
    if (await copySecretValue(record.secret)) note.value = '密钥已复制'
    else error.value = secretCopyError.value
  } finally {
    copyingSecret.value = false
  }
}
const backupImport = useBackupImport({
  active: () => importOpen.value && vault.unlocked.value,
  inspect: vault.inspectBackup,
  merge: vault.merge
})
const {
  text: backupText,
  password: backupPassword,
  records: imported,
  error: importError,
  reading,
  inspecting: importing,
  inspect
} = backupImport
const rows = computed(() =>
  [...vault.records.value]
    .filter((r) =>
      `${r.label} ${r.issuer} ${r.note} ${r.batchLabel || ''}`
        .toLocaleLowerCase(locale.value)
        .includes(search.value.toLocaleLowerCase(locale.value))
    )
    .sort((a, b) => b.usedAt - a.usedAt)
)
const expandedBatches = ref(new Set<string>())
const collapsedSearchBatches = ref(new Set<string>())
const batchExpanded = (id: string) =>
  search.value ? !collapsedSearchBatches.value.has(id) : expandedBatches.value.has(id)
watch(search, () => collapsedSearchBatches.value.clear())
const groups = computed(() => {
  const grouped = new Map<
    string,
    { id: string; batch: boolean; batchId: string; label: string; rows: typeof rows.value }
  >()
  for (const row of rows.value) {
    const id = row.batchId ? 'batch:' + row.batchId : row.id
    const group = grouped.get(id)
    if (group) {
      group.rows.push(row)
      // A key added to the batch after it was named carries no name of its own.
      if (!group.label) group.label = row.batchLabel || ''
    } else
      grouped.set(id, {
        id,
        batch: !!row.batchId,
        batchId: row.batchId || '',
        label: row.batchLabel || '',
        rows: [row]
      })
  }
  return [...grouped.values()]
})
/*
 * Past this many rows the reveal fills the screen anyway, and sliding that
 * many live codes open costs more than the motion adds.
 */
const ANIMATED_BATCH_ROWS = 10
const selectionUnits = computed(() =>
  groups.value.flatMap((group) => {
    const rowUnits = group.rows.map((row) => ({ id: row.id, members: [row.id] }))
    if (!group.batch) return rowUnits
    const heading = { id: group.id, members: group.rows.map((row) => row.id) }
    return batchExpanded(group.id) ? [heading, ...rowUnits] : [heading]
  })
)
async function toggleBatch(id: string, event: MouseEvent) {
  if (search.value) {
    if (collapsedSearchBatches.value.has(id)) collapsedSearchBatches.value.delete(id)
    else collapsedSearchBatches.value.add(id)
    return
  }
  if (expandedBatches.value.has(id)) expandedBatches.value.delete(id)
  else {
    const group = (event.currentTarget as HTMLElement).closest('.history-group')
    expandedBatches.value.add(id)
    await nextTick()
    // The rows sit inside a wrapper now: scrolling that into view would drag a
    // whole batch's height through the screen. Aim at the first row instead.
    const firstRow = group?.querySelector<HTMLElement>('.history-row') ?? null
    if (firstRow && firstRow.getBoundingClientRect().bottom > window.innerHeight)
      firstRow.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
}
const {
  surface,
  selectedSet,
  allSelected,
  start: startSelection,
  click: clickSelection,
  toggleAll,
  cancelSelection
} = useHistorySelection(
  computed(() => rows.value.map((row) => row.id)),
  selected,
  computed(() => selectionUnits.value.map((unit) => unit.id)),
  (unit) => selectionUnits.value.find((entry) => entry.id === unit)?.members ?? [unit]
)
watch(
  importOpen,
  (open) => {
    if (!open) backupImport.reset()
  },
  { flush: 'sync' }
)
watch(
  () => vault.unlocked.value,
  () => {
    editor.value = null
    groupEditor.value = ''
    label.value = ''
    remark.value = ''
    search.value = ''
    selected.value = []
    backupImport.reset()
    importOpen.value = false
  },
  { flush: 'sync' }
)
function leaveImport() {
  importOpen.value = false
  backupImport.reset()
}
onMounted(() => window.addEventListener('pagehide', leaveImport))
onBeforeUnmount(() => window.removeEventListener('pagehide', leaveImport))
async function run(action: () => Promise<unknown>, success = '') {
  error.value = ''
  note.value = ''
  try {
    await action()
    note.value = success
  } catch (e) {
    error.value = (e as Error).message
  }
}
async function unlock() {
  if (!vault.exists.value && protect.value && password.value !== confirmation.value) {
    error.value = '两次口令不一致。'
    return
  }
  const p = password.value
  password.value = ''
  confirmation.value = ''
  await run(() =>
    vault.exists.value ? vault.unlock(p) : vault.enable(protect.value ? p : undefined)
  )
}
function edit(row: VaultRecord) {
  editor.value = { ...row }
  label.value = row.label
  remark.value = row.note
}
function editGroup(group: { batchId: string; label: string }) {
  groupEditor.value = group.batchId
  label.value = group.label
}
function closeEditor() {
  editor.value = null
  groupEditor.value = ''
}
async function saveEdit() {
  if (groupEditor.value)
    return run(async () => {
      await vault.editBatch(groupEditor.value, label.value.trim())
      groupEditor.value = ''
    }, '名称已保存。')
  if (!editor.value) return
  await run(async () => {
    await vault.edit(editor.value!.id, label.value, remark.value)
    editor.value = null
  }, '备注已保存。')
}
async function remove() {
  if (!removing.value) return
  await run(async () => {
    await vault.remove(removing.value!)
    removing.value = null
    selected.value = []
  }, '记录已删除。')
}
async function backup() {
  await run(async () => {
    const data = await vault.backup()
    downloadFile(
      new Blob([data], { type: 'application/json' }),
      `2fa-backup-${new Date().toISOString().slice(0, 10)}.2fahot`
    )
  }, '备份已导出，请妥善保管。')
}
const backupFile = useTemplateRef<HTMLInputElement>('backupFile')
const backupFileName = shallowRef('')
function file(event: Event) {
  const chosen = (event.target as HTMLInputElement).files?.[0]
  backupFileName.value = chosen?.name ?? ''
  return backupImport.read(chosen)
}
async function merge() {
  if (await backupImport.merge()) {
    importOpen.value = false
    note.value = '已合并备份，现有记录优先保留。'
  }
}
const date = (v: number) =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(v)
</script>
<template>
  <div ref="surface" class="history-surface ore-workspace-frame" @keydown="cancelSelection">
    <div v-if="!vault.ready.value" class="empty-state">
      <UIcon name="i-lucide-loader-circle" class="animate-spin" />
      <p>{{ tx('正在读取本地存储…') }}</p>
    </div>
    <div v-else-if="!vault.unlocked.value" class="vault-gate">
      <div class="vault-title">
        <McChest />
        <h2>{{ tx(vault.exists.value ? '解锁本地历史' : '开启本地历史') }}</h2>
      </div>
      <p>
        {{
          tx(
            vault.exists.value
              ? '输入本地口令，查看这台设备保存的记录。'
              : '记录保存在当前浏览器，可选择密码保护。'
          )
        }}
      </p>
      <form class="unlock-form" @submit.prevent="unlock">
        <UCheckbox v-if="!vault.exists.value" v-model="protect" :label="tx('使用密码保护')" />
        <p v-if="!vault.exists.value && !protect" class="field-hint">
          {{ tx('不设密码，记录将直接保存在此浏览器，打开即可查看。') }}
        </p>
        <UFormField v-if="vault.exists.value || protect" :label="tx('本地解锁密码')"
          ><UInput
            v-model="password"
            type="password"
            class="w-full"
            size="xl"
            :autocomplete="vault.exists.value ? 'current-password' : 'new-password'"
            :placeholder="tx('至少 4 个字符')"
            :minlength="vault.exists.value ? undefined : 4"
            required /></UFormField
        ><UFormField v-if="!vault.exists.value && protect" :label="tx('再次输入密码')"
          ><UInput
            v-model="confirmation"
            type="password"
            class="w-full"
            size="xl"
            autocomplete="new-password"
            :placeholder="tx('确认你的解锁口令')"
            required /></UFormField
        ><UButton
          type="submit"
          class="primary-button w-full"
          :loading="vault.busy.value"
          :disabled="!!vault.issue.value"
          :icon="vault.exists.value ? 'i-lucide-unlock' : 'i-lucide-shield-check'"
          >{{ tx(vault.exists.value ? '解锁历史' : '开启本地历史') }}</UButton
        >
      </form>
      <p class="vault-note">
        {{ tx('无需网站账户') }}<br />{{ tx('清理浏览器数据会删除记录，请定期备份。') }}
      </p>
      <button v-if="vault.exists.value" class="text-action" @click="eraseOpen = true">
        {{ tx('忘记口令？清除本地历史') }}
      </button>
    </div>
    <template v-else
      ><div class="history-toolbar">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          :placeholder="tx('搜索标签或备注')"
          :aria-label="tx('搜索本地历史')"
          class="history-search"
          size="xl"
        />
        <div class="history-actions">
          <UButton
            class="history-autosave"
            color="neutral"
            variant="outline"
            :icon="vault.enabled.value ? 'i-lucide-save-off' : 'i-lucide-save'"
            :aria-pressed="vault.enabled.value"
            :disabled="vault.busy.value"
            @click="run(vault.toggle)"
            >{{ tx(vault.enabled.value ? '关闭自动保存' : '开启自动保存') }}</UButton
          >
          <div class="history-action-buttons">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-shield-check"
              @click="openProtection"
              >{{ tx(vault.passwordProtected.value ? '密码保护已开启' : '使用密码保护') }}</UButton
            >
            <UButton
              v-if="vault.passwordProtected.value"
              color="neutral"
              variant="ghost"
              icon="i-lucide-lock"
              @click="vault.lock"
              >{{ tx('锁定') }}</UButton
            ><UButton color="neutral" variant="outline" icon="i-lucide-download" @click="backup">{{
              tx('备份')
            }}</UButton
            ><UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-upload"
              @click="importOpen = true"
              >{{ tx('导入') }}</UButton
            >
          </div>
        </div>
      </div>
      <div class="history-status">
        <SelectionCheck
          v-if="rows.length"
          class="history-select-all"
          :checked="allSelected ? true : selected.length ? 'mixed' : false"
          :label="tx(allSelected ? '取消全选' : '全选')"
          @click="toggleAll"
        >
          <span>{{ tx(allSelected ? '取消全选' : '全选') }}</span>
          <span v-if="selected.length" class="selection-count" aria-live="polite"
            >{{ selected.length }} {{ tx('条已选') }}</span
          >
        </SelectionCheck>
        <span
          >{{ tx('记录：{count}', { count: vault.records.value.length }) }} ·
          {{ tx(vault.enabled.value ? '自动保存已开启' : '自动保存已关闭') }}</span
        >
      </div>
      <div v-if="!rows.length" class="empty-state">
        <UIcon :name="search ? 'i-lucide-search-x' : 'i-lucide-history'" />
        <h2>{{ tx(search ? '没有找到匹配记录' : '还没有保存记录') }}</h2>
        <p>
          {{
            tx(
              search
                ? '换一个标签或备注关键词试试。'
                : '返回工具取码并复制后，记录会保存在这里。演示数据不会保存。'
            )
          }}
        </p>
        <UButton v-if="!search" :to="localePath('/')" class="primary-button"
          >{{ tx('开始取码') }}<UIcon name="i-lucide-arrow-right"
        /></UButton>
      </div>
      <div
        v-for="group in groups"
        :key="group.id"
        class="history-group"
        :class="{ 'is-batch': group.batch, 'is-expanded': group.batch && batchExpanded(group.id) }"
      >
        <div
          v-if="group.batch"
          class="history-batch-heading"
          :class="{ 'is-selected': group.rows.some((row) => selectedSet.has(row.id)) }"
          :data-selection-id="group.id"
        >
          <SelectionCheck
            :checked="
              group.rows.every((row) => selectedSet.has(row.id))
                ? true
                : group.rows.some((row) => selectedSet.has(row.id))
                  ? 'mixed'
                  : false
            "
            :label="tx('选择 {label}', { label: group.label || tx('批量取码') })"
            @pointerdown="startSelection($event, group.id)"
            @click="clickSelection($event, group.id)"
          />
          <button
            type="button"
            class="history-batch-toggle"
            :aria-expanded="batchExpanded(group.id)"
            @click="toggleBatch(group.id, $event)"
          >
            <span class="record-icon" aria-hidden="true"
              ><img src="/textures/trial-key.png" alt="" width="32" height="32"
            /></span>
            <span class="record-name">
              <span class="record-title"
                ><strong>{{ group.label || tx('批量取码') }}</strong></span
              >
              <span class="record-meta">
                <span>{{ tx('记录：{count}', { count: group.rows.length }) }}</span>
                <time>{{ date(group.rows[0]!.usedAt) }}</time>
              </span>
            </span>
            <UIcon
              :name="batchExpanded(group.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            />
          </button>
          <button
            type="button"
            class="record-edit"
            :aria-label="tx('重命名分组')"
            @click="editGroup(group)"
          >
            <UIcon name="i-lucide-pencil" />
          </button>
        </div>
        <div
          class="history-group-rows"
          :class="{
            'is-open': !group.batch || batchExpanded(group.id),
            'is-instant': group.rows.length > ANIMATED_BATCH_ROWS
          }"
        >
          <div class="history-group-rows-clip">
            <div
              v-for="row in group.rows"
              :key="row.id"
              class="history-row"
              :class="{ 'is-selected': selectedSet.has(row.id) }"
              :data-selection-id="row.id"
            >
              <SelectionCheck
                class="history-select-cell"
                :checked="selectedSet.has(row.id)"
                :label="tx('选择 {label}', { label: row.label || tx('未命名记录') })"
                @pointerdown="startSelection($event, row.id)"
                @click="clickSelection($event, row.id)"
              />
              <AppHint
                :text="tx(secretCopied && copiedSecretId === row.id ? '密钥已复制' : '复制密钥')"
              >
                <button
                  type="button"
                  class="record-icon record-copy-secret"
                  :aria-label="tx('复制密钥')"
                  :disabled="copyingSecret || !vault.unlocked.value"
                  @click="copySecret(row.id)"
                >
                  <UIcon
                    v-if="secretCopied && copiedSecretId === row.id"
                    name="i-mc-check"
                    class="text-primary"
                  />
                  <img v-else src="/textures/trial-key.png" alt="" width="32" height="32" />
                </button>
              </AppHint>
              <div class="record-name">
                <div class="record-title">
                  <UPopover
                    mode="hover"
                    :open-delay="150"
                    :close-delay="150"
                    enable-touch
                    :content="{ side: 'bottom', align: 'start', collisionPadding: 12 }"
                  >
                    <button type="button" class="record-secret-trigger">
                      <strong :class="{ 'record-placeholder': !row.label && !row.issuer }">{{
                        row.label || row.issuer || tx('未命名记录')
                      }}</strong>
                    </button>
                    <template #content>
                      <pre class="record-secret-preview">{{ row.secret }}</pre>
                    </template>
                  </UPopover>
                  <button
                    type="button"
                    class="record-edit"
                    :aria-label="tx('编辑备注')"
                    @click="edit(row)"
                  >
                    <UIcon name="i-lucide-pencil" />
                  </button>
                </div>
                <div class="record-meta">
                  <span>
                    {{
                      row.note ||
                      tx('{algorithm} · {digits} 位 · {period} 秒', {
                        algorithm: row.algorithm,
                        digits: row.digits,
                        period: row.period
                      })
                    }}
                  </span>
                  <time :datetime="new Date(row.usedAt).toISOString()">{{ date(row.usedAt) }}</time>
                </div>
              </div>
              <HistoryCode :config="row" />
              <button
                type="button"
                class="record-delete"
                :aria-label="tx('删除记录')"
                @click="removing = [row.id]"
              >
                <UIcon name="i-lucide-trash-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="history-danger">
        <UButton
          v-if="selected.length"
          color="error"
          variant="soft"
          size="sm"
          @click="removing = [...selected]"
          >{{ tx('删除所选：{count}', { count: selected.length }) }}</UButton
        ><button class="text-action ms-auto" @click="eraseOpen = true">
          {{ tx('清空全部本地历史') }}
        </button>
      </div></template
    >
    <p v-if="error || vault.issue.value" class="inline-error history-feedback" role="alert">
      {{ tx(error || vault.issue.value) }}
    </p>
    <p v-if="note" class="inline-notice history-feedback" role="status">{{ tx(note) }}</p>
  </div>
  <UModal
    :open="!!editor || !!groupEditor"
    :title="tx(groupEditor ? '重命名分组' : '编辑记录')"
    :description="
      tx(
        groupEditor ? '分组名称只保存在本机，用来区分多次批量取码。' : '标签和备注随密钥一起保存。'
      )
    "
    @update:open="
      (v) => {
        if (!v) closeEditor()
      }
    "
    ><template #body
      ><div class="modal-stack">
        <UFormField :label="tx('标签')"
          ><UInput
            v-model="label"
            name="history-record-label"
            autocomplete="off"
            data-1p-ignore
            maxlength="120"
            class="w-full" /></UFormField
        ><UFormField v-if="!groupEditor" :label="tx('备注')"
          ><UTextarea
            v-model="remark"
            name="history-record-note"
            autocomplete="off"
            data-1p-ignore
            maxlength="1000"
            :rows="4"
            class="w-full"
        /></UFormField>
        <p v-if="error" class="inline-error">{{ tx(error) }}</p>
      </div></template
    ><template #footer
      ><UButton class="primary-button" :loading="vault.busy.value" @click="saveEdit">{{
        tx(groupEditor ? '保存' : '保存备注')
      }}</UButton></template
    ></UModal
  >
  <UModal
    :open="!!removing"
    :title="tx('删除所选记录？')"
    :description="
      tx('将永久删除本地记录：{count}。此操作不可撤销。', { count: removing?.length || 0 })
    "
    @update:open="
      (v) => {
        if (!v) removing = null
      }
    "
    ><template #footer
      ><UButton color="neutral" variant="outline" @click="removing = null">{{ tx('取消') }}</UButton
      ><UButton color="error" :loading="vault.busy.value" @click="remove">{{
        tx('删除记录')
      }}</UButton></template
    ></UModal
  >
  <UModal
    v-model:open="eraseOpen"
    :title="tx('清空全部本地历史？')"
    :description="tx('所有记录和本地保存设置将永久删除，无法撤销。已有导出备份不会受影响。')"
    ><template #footer
      ><UButton color="neutral" variant="outline" @click="eraseOpen = false">{{
        tx('取消')
      }}</UButton
      ><UButton
        color="error"
        :loading="vault.busy.value"
        @click="
          run(async () => {
            await vault.erase()
            eraseOpen = false
          })
        "
        >{{ tx('永久清空') }}</UButton
      ></template
    ></UModal
  >
  <UModal
    v-model:open="importOpen"
    :title="tx('导入备份')"
    :description="tx('重复记录保留现有版本。')"
    ><template #body
      ><div class="modal-stack">
        <div class="backup-file">
          <input
            ref="backupFile"
            type="file"
            accept=".2fahot,application/json"
            class="sr-only"
            :aria-label="tx('导入备份')"
            @change="file"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-file-up"
            @click="backupFile?.click()"
            >{{ tx('选择备份文件') }}</UButton
          >
          <span class="backup-file-name" :class="{ 'is-empty': !backupFileName }">{{
            backupFileName || tx('尚未选择文件')
          }}</span>
        </div>
        <template v-if="!imported"
          ><UFormField :label="tx('备份的解锁口令')"
            ><UInput
              v-model="backupPassword"
              :disabled="importing"
              type="password"
              class="w-full"
              autocomplete="off" /></UFormField
          ><UButton
            color="neutral"
            variant="outline"
            :disabled="!backupText || reading"
            :loading="importing || reading"
            @click="inspect"
            >{{ tx('解锁并预览') }}</UButton
          ></template
        >
        <p v-else>
          {{
            tx('已解锁记录：{count}。合并将保留现有记录，并添加新的密钥。', {
              count: imported.length
            })
          }}
        </p>
        <p v-if="importError" class="inline-error">{{ tx(importError) }}</p>
      </div></template
    ><template #footer
      ><UButton
        class="primary-button"
        :disabled="!imported"
        :loading="vault.busy.value"
        @click="merge"
        >{{ tx('合并到本地历史') }}</UButton
      ></template
    ></UModal
  >
  <UModal
    v-model:open="protectionOpen"
    :title="tx(vault.passwordProtected.value ? '密码保护已开启' : '使用密码保护')"
    :description="tx('记录保存在当前浏览器，可选择密码保护。')"
  >
    <template #body
      ><form class="modal-stack" @submit.prevent="saveProtection">
        <UCheckbox v-model="nextProtection" :label="tx('使用密码保护')" />
        <p v-if="!nextProtection">{{ tx('不设密码，记录将直接保存在此浏览器，打开即可查看。') }}</p>
        <UButton
          v-if="vault.passwordProtected.value && nextProtection && !changingPassword"
          type="button"
          color="neutral"
          variant="outline"
          @click="changingPassword = true"
          >{{ tx('修改密码') }}</UButton
        >
        <UFormField v-if="needsNewPassword" :label="tx('本地解锁密码')"
          ><UInput
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :minlength="4"
            required
            class="w-full"
        /></UFormField>
        <UFormField v-if="needsNewPassword" :label="tx('再次输入密码')"
          ><UInput
            v-model="newConfirmation"
            type="password"
            autocomplete="new-password"
            required
            class="w-full"
        /></UFormField>
        <p v-if="error" class="inline-error" role="alert">{{ tx(error) }}</p>
        <UButton type="submit" :loading="vault.busy.value" :disabled="!protectionChanged">{{
          tx('保存')
        }}</UButton>
      </form></template
    >
  </UModal>
</template>
<style scoped>
.history-group {
  margin-inline: calc(-1 * var(--history-inset));
}
.history-batch-heading,
.history-row {
  padding-inline: var(--history-inset);
}
.history-batch-heading {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 28px;
  align-items: center;
  gap: var(--control-gap);
  width: 100%;
  min-height: 4.5rem;
  padding-block: 0.5rem;
  text-align: start;
  border-bottom: 1px solid var(--ui-border);
}
.history-batch-toggle {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  gap: var(--control-gap);
  align-items: center;
  text-align: start;
  min-width: 0;
}
.history-batch-toggle > .iconify {
  justify-self: center;
}
.history-batch-heading.is-selected {
  background: color-mix(in srgb, var(--action) 5%, transparent);
}
/* An opened batch reads as one block through a neutral wash alone - a coloured
   edge competes with the green the selection already uses. */

/* Same 0fr - 1fr reveal the result panel uses, so an opening batch grows into
   place instead of appearing all at once. */
.history-group-rows {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  transition:
    grid-template-rows 240ms var(--ore-enter-ease),
    visibility 0s 240ms;
}
.history-group-rows.is-open {
  grid-template-rows: 1fr;
  visibility: visible;
  transition:
    grid-template-rows 240ms var(--ore-enter-ease),
    visibility 0s;
}
.history-group-rows.is-instant,
.history-group-rows.is-instant.is-open {
  transition: none;
}
.history-group-rows-clip {
  min-height: 0;
  overflow: hidden;
}
/* Only the rows that were revealed carry the wash - the row you opened is not
   part of the block it reveals. */
.history-group.is-batch > .history-group-rows > .history-group-rows-clip {
  background: color-mix(in srgb, var(--ui-text-highlighted) 6%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  .history-group-rows {
    transition: none;
  }
}
.history-group.is-batch .history-row {
  padding-inline-start: calc(var(--history-inset) + 20px + var(--control-gap) + 12px);
}
.history-batch-toggle[aria-expanded='true'] > .iconify {
  color: var(--accent-ink);
}
.history-batch-toggle:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -2px;
}

.history-surface {
  --history-inset: 32px;
  border-radius: var(--ui-radius);
  background: var(--panel);
  padding: 28px var(--history-inset);
}
.vault-gate {
  max-width: 380px;
  margin: 14px auto 24px;
  text-align: center;
}
.vault-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.vault-gate h2 {
  font-size: var(--text-section);
  font-weight: 600;
  margin: 0;
}
.vault-gate p {
  font-size: var(--text-body);
  line-height: 1.9;
  color: var(--ui-text-muted);
}
.unlock-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
  text-align: start;
}
.vault-gate .vault-note {
  font-size: var(--text-caption);
}
.history-toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.history-actions :deep(button) {
  min-height: 44px;
  font-size: var(--text-label);
}
.history-actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-width: 100%;
}
.history-action-buttons {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
.history-search {
  flex: 1 1 16rem;
  min-width: 0;
}
.history-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  align-items: center;
  justify-content: space-between;
  color: var(--ui-text-muted);
  font-size: var(--text-label);
  padding: 1rem 0;
  margin-top: 0.25rem;
  border-bottom: 1px solid var(--ui-border);
}
.history-row {
  position: relative;
  display: grid;
  grid-template-columns: 20px 44px minmax(0, 1fr) auto 44px;
  align-items: center;
  gap: var(--control-gap);
  padding-block: 0.5rem;
  border-bottom: 1px solid var(--ui-border);
  content-visibility: auto;
  contain-intrinsic-size: auto 4.5rem;
}
.history-select-all {
  position: relative;
  display: inline-flex;
  width: auto;
  height: auto;
  margin-inline-start: -12px;
  padding-inline: 12px;
  align-items: center;
  gap: var(--control-gap);
  min-height: 44px;
  cursor: pointer;
  color: var(--ui-text);
}
.selection-count {
  color: var(--accent-ink);
}
.history-select-cell {
  display: grid;
  place-items: center;
  align-self: stretch;
  min-height: 44px;
  width: 44px;
  margin-inline: -12px;
  padding: 0;
  border: 0;
  background: transparent;
  touch-action: none;
  user-select: none;
  cursor: pointer;
}
.history-select-cell:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.history-row.is-selected {
  background: color-mix(in srgb, var(--action) 5%, transparent);
}
.record-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.record-delete {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ui-text-muted);
}
.record-delete .iconify {
  width: 20px;
  height: 20px;
}
.record-delete:hover {
  color: var(--ui-error);
}
.record-delete:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: -4px;
}
.record-icon img {
  image-rendering: pixelated;
}
.record-copy-secret {
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.record-copy-secret:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.record-title {
  display: flex;
  align-items: center;
  gap: var(--control-gap);
}
.record-edit {
  opacity: 0;
  display: inline-grid;
  place-items: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--ui-text-muted);
  cursor: pointer;
}
.history-row:hover .record-edit,
.history-batch-heading:hover .record-edit,
.history-batch-heading:focus-within .record-edit,
.record-title:focus-within .record-edit {
  opacity: 1;
}
.record-edit :deep(.iconify) {
  width: 16px;
  height: 16px;
}
.record-edit:hover,
.record-edit:focus-visible {
  color: var(--accent-ink);
  background: transparent;
}
.record-edit:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 2px;
}
.record-title strong {
  min-width: 0;
  line-height: 1.5;
}
.record-secret-trigger {
  min-width: 0;
  text-align: start;
  text-decoration: underline dotted;
  text-underline-offset: 4px;
}
.record-secret-trigger:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 3px;
}
.record-secret-preview {
  max-width: min(32rem, calc(100vw - 24px));
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--ui-text);
}
.history-batch-heading > :deep(.selection-check),
.history-select-cell {
  width: 44px;
  height: 44px;
  margin-inline-start: -12px;
}
.backup-file {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--control-gap);
}
.backup-file-name {
  min-width: 0;
  font-size: var(--text-label);
  overflow-wrap: anywhere;
}
.backup-file-name.is-empty {
  color: var(--ui-text-muted);
}
.record-name {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.record-name strong {
  font-size: var(--text-body);
  font-weight: 600;
}
.record-meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: var(--text-label);
  line-height: 1.4;
  margin-top: 2px;
  color: var(--ui-text-muted);
}
.record-meta time {
  white-space: nowrap;
  font-size: var(--text-caption);
  color: var(--ui-text-muted);
}
.history-danger {
  display: flex;
  align-items: center;
  margin-top: 14px;
}
.history-feedback {
  padding: 12px 0;
}
@media (max-width: 600px) {
  .history-batch-toggle {
    grid-template-columns: minmax(0, 1fr) 44px;
  }
  .history-batch-heading {
    grid-template-columns: 20px minmax(0, 1fr) 28px;
    gap: 8px;
  }
  .history-batch-toggle > .record-icon {
    display: none;
  }
  .history-group.is-batch .history-row {
    padding-inline-start: calc(var(--history-inset) + 12px);
  }
  .history-surface {
    --history-inset: 20px;
    padding: 24px var(--history-inset);
  }
  .history-row {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 44px;
    gap: 8px;
  }
  .record-name {
    grid-column: 2;
    grid-row: 1;
  }
  .history-row :deep(.history-code) {
    grid-column: 1 / 3;
    grid-row: 2;
    justify-self: start;
  }
  .history-row > button {
    grid-column: 3;
    grid-row: 1;
    align-self: start;
  }
  .history-row > .history-select-cell {
    grid-column: 1;
    grid-row: 1;
    align-self: stretch;
  }
  .history-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }
  .history-action-buttons {
    display: contents;
  }
  .history-actions :deep(button) {
    justify-content: center;
    min-width: 0;
    padding-inline: 0.5rem;
    font-size: var(--text-caption);
    white-space: normal;
  }
  .history-action-buttons > button:first-child :deep(.iconify) {
    display: none;
  }
  .history-toolbar {
    gap: 12px;
  }
  .history-search {
    width: 100%;
  }
  .record-icon {
    display: grid;
  }
  .history-row > .record-copy-secret {
    grid-column: 3;
    grid-row: 2;
    align-self: center;
  }
}
@media (pointer: coarse) {
  .record-edit {
    flex-basis: 44px;
    width: 44px;
    height: 44px;
  }
}
@media (hover: none), (pointer: coarse) {
  .record-edit {
    opacity: 1;
  }
}
</style>
