<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
const protect = shallowRef(true)
const vault = useVault()
const open = shallowRef(false)
const password = shallowRef('')
const confirmation = shallowRef('')
const error = shallowRef('')
const desired = shallowRef(true)
async function change(value: boolean) {
  desired.value = value
  error.value = ''
  if (!value) {
    try {
      await vault.disable()
    } catch (cause) {
      error.value = (cause as Error).message
    }
    return
  }
  if (!vault.unlocked.value) {
    open.value = true
    return
  }
  try {
    if (vault.enabled.value !== value) await vault.toggle()
  } catch (cause) {
    error.value = (cause as Error).message
  }
}
async function submit() {
  error.value = ''
  if (!vault.exists.value && protect.value && password.value !== confirmation.value) {
    error.value = '两次口令不一致。'
    return
  }
  try {
    if (vault.exists.value) {
      await vault.unlock(password.value)
    } else await vault.enable(protect.value ? password.value : undefined)
    if (vault.enabled.value !== desired.value) await vault.toggle()
    open.value = false
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    password.value = ''
    confirmation.value = ''
  }
}
watch(open, (visible) => {
  if (visible) protect.value = vault.exists.value ? vault.passwordProtected.value : true
  password.value = ''
  confirmation.value = ''
})
</script>
<template>
  <div class="history-toggle">
    <div class="history-toggle-control">
      <AppHint :text="tx(vault.enabled.value ? '关闭自动保存' : '开启自动保存')"
        ><button
          type="button"
          role="switch"
          class="history-switch"
          :aria-checked="vault.enabled.value"
          :aria-label="tx(vault.enabled.value ? '关闭自动保存' : '开启自动保存')"
          :disabled="!vault.ready.value || vault.busy.value"
          @click="change(!vault.enabled.value)"
        >
          <span class="history-switch-thumb" /></button
      ></AppHint>
      <AppHint :text="tx('查看历史')"
        ><NuxtLink class="history-view-link" :to="localePath('/history')">
          {{ tx('历史记录') }}
        </NuxtLink></AppHint
      >
    </div>
    <span v-if="error && !open" class="inline-error" role="alert">{{ tx(error) }}</span>
    <UModal
      v-model:open="open"
      :title="tx(vault.exists.value ? '解锁本地历史' : '开启本地历史')"
      :description="
        tx(
          vault.exists.value
            ? '输入本地口令，查看这台设备保存的记录。'
            : '记录保存在当前浏览器，可选择密码保护。'
        )
      "
    >
      <template #body>
        <form class="history-enable-form" @submit.prevent="submit">
          <UCheckbox
            v-if="!vault.exists.value"
            v-model="protect"
            :label="tx('使用密码保护')"
            :disabled="vault.busy.value"
          />
          <p v-if="!vault.exists.value && !protect" class="field-hint">
            {{ tx('不设密码，记录将直接保存在此浏览器，打开即可查看。') }}
          </p>
          <UFormField v-if="vault.exists.value || protect" :label="tx('本地解锁密码')"
            ><UInput
              v-model="password"
              type="password"
              class="w-full"
              :autocomplete="vault.exists.value ? 'current-password' : 'new-password'"
              :minlength="vault.exists.value ? undefined : 4"
              required
          /></UFormField>
          <UFormField v-if="!vault.exists.value && protect" :label="tx('再次输入密码')"
            ><UInput
              v-model="confirmation"
              type="password"
              class="w-full"
              autocomplete="new-password"
              required
          /></UFormField>
          <p>{{ tx('开启并解锁后，有效输入会自动保存。关闭后停止新增，已有记录保留。') }}</p>
          <p v-if="error" class="inline-error" role="alert">{{ tx(error) }}</p>
          <UButton type="submit" :loading="vault.busy.value">{{
            tx(vault.exists.value ? '解锁历史' : '开启本地历史')
          }}</UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>
<style scoped>
.history-toggle {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.history-view-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  min-height: 2.75rem;
}
.history-toggle-control {
  display: grid;
  justify-items: center;
  gap: 0.375rem;
}
.history-toggle-control .history-view-link {
  min-height: 0;
  font-size: var(--text-label);
  line-height: 1.5;
}
.history-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
}
.history-view-link:hover {
  text-decoration: none;
  color: var(--accent-ink);
}
.history-switch {
  position: relative;
  flex: 0 0 3rem;
  width: 3rem;
  height: 1.625rem;
  padding: 0;
  border: 2px solid var(--ore-outline);
  border-radius: 0;
  background: var(--wash);
  box-shadow:
    var(--ore-inset),
    0 2px 0 var(--ore-outline);
  cursor: pointer;
}
.history-switch[aria-checked='true'] {
  background: #3c8527;
}
.history-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 1.125rem;
  height: 1.125rem;
  background: #c6c6c6;
  box-shadow:
    var(--ore-bevel),
    1px 1px 0 var(--ore-outline);
}
.history-switch[aria-checked='true'] .history-switch-thumb {
  left: calc(100% - 1.125rem - 2px);
}
.history-switch:hover:not(:disabled) .history-switch-thumb {
  background: #eee;
}
.history-switch:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 4px;
}
.history-switch:disabled {
  cursor: default;
}
.history-enable-form {
  display: grid;
  gap: 1rem;
}
</style>
