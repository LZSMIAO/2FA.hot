<script setup lang="ts">
import type { PasskeyCopy } from '~~/shared/passkeys-copy'
import { sameSite, type PasskeyOperation, type PasskeySummary } from '~~/shared/passkey-manager'
const props = defineProps<{
  copy: PasskeyCopy['manager']
  records: PasskeySummary[] | null
  canRename?: boolean
  busy: boolean
  outcome: 'failed' | 'cancelled' | 'completed' | ''
}>()
const emit = defineEmits<{
  manage: [operation: PasskeyOperation, ids?: string[], label?: string]
  lock: []
  cancel: []
}>()
const { locale } = useMessages()
const localePath = useLocalePath()
const vault = useVault()
const query = shallowRef('')
const selected = ref<string[]>([])
const identity = (r: PasskeySummary) => `${r.rpId}:${r.credentialId}`
const visible = computed(() => {
  const term = query.value.trim().toLocaleLowerCase(locale.value)
  return (props.records ?? []).filter((r) =>
    `${r.rpId} ${r.userName} ${r.userDisplayName} ${r.label ?? ''}`
      .toLocaleLowerCase(locale.value)
      .includes(term)
  )
})
const allSelected = computed(
  () => !!visible.value.length && visible.value.every((r) => selected.value.includes(identity(r)))
)
const someSelected = computed(() => visible.value.some((r) => selected.value.includes(identity(r))))
function selectVisible(value: boolean | 'indeterminate') {
  const ids = new Set(selected.value)
  for (const r of visible.value) value === true ? ids.add(identity(r)) : ids.delete(identity(r))
  selected.value = [...ids]
}
const selectionIds = computed(() => visible.value.map(identity))
const {
  surface,
  start: startSelection,
  click: clickSelection,
  cancelSelection
} = useHistorySelection(selectionIds, selected)
/*
 * A passkey and a 2FA code for the same website, side by side: the history
 * below this tool may already hold GitHub's code when a github.com passkey
 * is listed here. Only an open history is consulted; a locked one stays shut.
 */
function sameSiteCode(record: PasskeySummary) {
  if (!vault.unlocked.value) return ''
  return vault.records.value.find((code) => sameSite(record.rpId, code.issuer))?.issuer ?? ''
}
const renaming = shallowRef(''),
  draft = shallowRef('')
function startRename(record: PasskeySummary) {
  renaming.value = identity(record)
  draft.value = record.label ?? ''
}
function saveRename(record: PasskeySummary) {
  emit('manage', 'rename', [identity(record)], draft.value.trim())
  renaming.value = ''
}
function lastUsed(value: number | null) {
  return value
    ? `${props.copy.lastUsed} ${new Date(value).toLocaleDateString(locale.value)}`
    : props.copy.neverUsed
}
watch(
  () => props.records,
  () => {
    selected.value = []
    renaming.value = ''
    if (!props.records) query.value = ''
  }
)
</script>

<template>
  <section
    @keydown="!busy && cancelSelection($event)"
    class="passkey-manager"
    aria-labelledby="passkey-manager-heading"
  >
    <template v-if="records === null">
      <h3 id="passkey-manager-heading">{{ copy.locked }}</h3>
      <p>{{ copy.lockedHint }}</p>
      <div class="manager-actions">
        <UButton
          data-passkey-unlock
          icon="i-lucide-lock-keyhole"
          :disabled="busy"
          @click="emit('manage', 'list')"
          >{{ copy.unlock }}</UButton
        >
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-import"
          :disabled="busy"
          @click="emit('manage', 'import')"
          >{{ copy.import }}</UButton
        >
      </div>
    </template>
    <template v-else>
      <div class="manager-heading">
        <h3 id="passkey-manager-heading">{{ records.length }} {{ copy.count }}</h3>
        <UButton color="neutral" variant="ghost" icon="i-lucide-eye-off" @click="emit('lock')">{{
          copy.lock
        }}</UButton>
      </div>
      <div class="manager-toolbar">
        <UInput
          v-model="query"
          :aria-label="copy.search"
          :placeholder="copy.search"
          icon="i-lucide-search"
          class="manager-search"
        />
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-import"
          :disabled="busy"
          @click="emit('manage', 'import')"
          >{{ copy.import }}</UButton
        >
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          :disabled="busy"
          :aria-label="copy.refresh"
          @click="emit('manage', 'list')"
        />
      </div>
      <div v-if="!records.length" class="manager-empty">
        <strong>{{ copy.empty }}</strong>
        <p>{{ copy.emptyHint }}</p>
      </div>
      <template v-else>
        <UCheckbox
          :model-value="allSelected ? true : someSelected ? 'indeterminate' : false"
          :disabled="busy || !visible.length"
          :label="copy.selectAll"
          @update:model-value="selectVisible"
        />
        <ul ref="surface" class="manager-records" aria-labelledby="passkey-manager-heading">
          <li
            v-for="record in visible"
            :key="identity(record)"
            class="manager-record"
            :data-selection-id="identity(record)"
          >
            <SelectionCheck
              :checked="selected.includes(identity(record))"
              :disabled="busy"
              :label="`${record.rpId} · ${record.userName || record.userDisplayName || copy.unnamed}`"
              @pointerdown="!busy && startSelection($event, identity(record))"
              @click="!busy && clickSelection($event, identity(record))"
            />
            <div class="record-details">
              <strong dir="auto">{{ record.label || record.rpId }}</strong>
              <span
                dir="auto"
                :class="{ 'record-placeholder': !record.userName && !record.userDisplayName }"
                ><template v-if="record.label">{{ record.rpId }} · </template
                >{{ record.userName || record.userDisplayName || copy.unnamed }}</span
              >
              <small>{{ lastUsed(record.lastUsedAt) }}</small>
              <NuxtLink
                v-if="sameSiteCode(record)"
                class="record-code"
                :to="localePath({ path: '/history', query: { q: sameSiteCode(record) } })"
                ><UIcon name="i-lucide-shield-check" aria-hidden="true" />{{
                  copy.sameSiteCode
                }}</NuxtLink
              >
              <form
                v-if="renaming === identity(record)"
                class="record-rename"
                @submit.prevent="saveRename(record)"
              >
                <UInput
                  v-model="draft"
                  :aria-label="copy.renameField"
                  :placeholder="record.rpId"
                  maxlength="256"
                  autofocus
                />
                <UButton type="submit" :disabled="busy">{{ copy.renameSave }}</UButton>
                <UButton color="neutral" variant="ghost" @click="renaming = ''">{{
                  copy.cancel
                }}</UButton>
              </form>
            </div>
            <UButton
              v-if="canRename && renaming !== identity(record)"
              class="record-rename-button"
              color="neutral"
              variant="ghost"
              icon="i-lucide-pencil"
              :aria-label="`${copy.rename} · ${record.label || record.rpId}`"
              :disabled="busy"
              @click="startRename(record)"
            />
          </li>
        </ul>
        <p v-if="!visible.length">{{ copy.noMatches }}</p>
        <div class="manager-actions">
          <span aria-live="polite">{{ selected.length }} {{ copy.selected }}</span>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-download"
            :disabled="busy || !selected.length"
            @click="emit('manage', 'export', selected)"
            >{{ copy.export }}</UButton
          >
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :disabled="busy || !selected.length"
            @click="emit('manage', 'remove', selected)"
            >{{ copy.remove }}</UButton
          >
        </div>
      </template>
    </template>
    <div v-if="busy" class="manager-pending" role="status">
      <p>{{ copy.pending }}</p>
      <UButton color="neutral" variant="outline" @click="emit('cancel')">{{ copy.cancel }}</UButton>
    </div>
    <p v-else-if="outcome" :role="outcome === 'failed' ? 'alert' : 'status'">{{ copy[outcome] }}</p>
    <p class="manager-privacy">{{ copy.privacy }}</p>
  </section>
</template>

<style scoped>
.passkey-manager {
  border-top: 1px solid var(--ui-border);
  margin-top: 1rem;
  padding-top: 1rem;
}
h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.manager-heading,
.manager-toolbar,
.manager-actions,
.manager-pending {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.manager-heading {
  justify-content: space-between;
}
.manager-toolbar,
.manager-actions {
  margin-block: 1rem;
}
.manager-search {
  flex: 1 1 12rem;
  min-width: 0;
}
.manager-records {
  list-style: none;
  padding: 0;
  margin-block: 0.75rem;
  max-height: 20rem;
  overflow-y: auto;
}
.manager-record {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  padding-block: 0.875rem;
}
.record-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-wrap: anywhere;
}
.record-details {
  flex: 1;
}
.record-details strong {
  color: var(--ui-text-highlighted);
}
.record-code {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  width: fit-content;
  margin-top: 0.25rem;
  font-size: var(--text-caption);
  color: var(--ui-text-highlighted);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.record-rename {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.record-rename > :first-child {
  flex: 1 1 10rem;
}
.record-rename-button {
  flex: none;
  min-width: 2.75rem;
  min-height: 2.75rem;
  justify-content: center;
}
.record-details small,
.manager-privacy {
  font-size: var(--text-caption);
  color: var(--ui-text);
}
.manager-empty {
  padding-block: 1rem;
}
.manager-pending {
  border: 1px solid var(--ui-border);
  padding: 0.75rem;
}
.manager-pending p {
  flex: 1 1 15rem;
  margin: 0;
}
.manager-actions :deep(button),
.manager-heading :deep(button),
.manager-toolbar :deep(button) {
  min-height: 2.75rem;
}
</style>
