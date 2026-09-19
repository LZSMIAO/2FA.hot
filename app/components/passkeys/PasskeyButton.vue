<script setup lang="ts">
import PasskeyInstall from './PasskeyInstall.vue'
import PasskeyGuide from './PasskeyGuide.vue'
import { passkeyCopy } from '~~/shared/passkeys-copy'
import { passkeyLocale, passkeyNames } from '~~/shared/passkeys'

defineProps<{ disabled?: boolean }>()
const { locale } = useMessages()
const route = useRoute()
const router = useRouter()
const open = shallowRef(false)
const language = computed(() => passkeyLocale(locale.value))
const copy = computed(() => passkeyCopy[language.value])

onMounted(() => {
  watch(
    () => route.query.passkeys,
    (value) => {
      if (value === '1') open.value = true
    },
    { immediate: true }
  )
})
watch(open, (value) => {
  if (value || route.query.passkeys !== '1') return
  const { passkeys: _passkeys, ...query } = route.query
  void router.replace({ query, hash: route.hash })
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="passkeyNames[language]"
    :description="copy.description"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <UButton
      data-passkey-trigger
      color="neutral"
      variant="outline"
      icon="i-lucide-key-round"
      :disabled="disabled"
      >{{ passkeyNames[language] }}</UButton
    >
    <template #body>
      <div class="passkey-dialog">
        <PasskeyInstall :copy="copy" />
        <details class="passkey-help">
          <summary>{{ copy.instructions }}</summary>
          <PasskeyGuide :copy="copy" />
        </details>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.passkey-dialog {
  overflow-wrap: anywhere;
  line-height: 1.7;
}
.passkey-help {
  border-top: 1px solid var(--ui-border);
  margin-top: 1.5rem;
  padding-top: 0.75rem;
}
.passkey-help summary {
  cursor: pointer;
  font-weight: 600;
  min-height: 2.75rem;
  align-content: center;
}
.passkey-help summary:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 4px;
}
</style>
