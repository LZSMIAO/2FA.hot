<script setup lang="ts">
import PasskeyManager from './PasskeyManager.vue'
import type { PasskeyCopy } from '~~/shared/passkeys-copy'
import { passkeyStoreIds, passkeyStoreUrl } from '~~/shared/passkeys'
import release from '~~/shared/passkeys-release.json'

const props = defineProps<{ copy: PasskeyCopy }>()
const pageUrl = useRequestURL()
const localPreview = pageUrl.hostname === 'localhost'
const downloadUrl = localPreview ? release.localDownload : release.download
const { tx } = useMessages()
const { copied, message: copyError, copy: copyText } = useCopy()
const copiedAddress = shallowRef('')
const {
  status,
  version,
  browser,
  supportedManager,
  records,
  managing,
  outcome,
  check,
  manage,
  lock,
  cancel
} = usePasskeyExtension()
const addresses = computed(() =>
  browser.value === 'edge'
    ? ['edge://extensions']
    : browser.value === 'chrome'
      ? ['chrome://extensions']
      : ['chrome://extensions', 'edge://extensions']
)
async function copyAddress(address: string) {
  if (await copyText(address)) copiedAddress.value = address
}
const stores = computed(() =>
  (browser.value === 'edge' ? (['edge', 'chrome'] as const) : (['chrome', 'edge'] as const)).map(
    (name) => ({ name, url: passkeyStoreUrl(name, passkeyStoreIds[name]) })
  )
)
const published = computed(() => stores.value.some((store) => store.url))
const hint = computed(
  () =>
    props.copy[
      status.value === 'installed'
        ? 'installedHint'
        : status.value === 'unsupported'
          ? 'unsupportedHint'
          : 'missingHint'
    ]
)
</script>

<template>
  <section class="passkey-install" aria-labelledby="extension-heading">
    <h2 id="extension-heading">{{ copy.connection }}</h2>
    <div class="connection-state" role="status" aria-live="polite">
      <UIcon
        :name="status === 'installed' ? 'i-lucide-circle-check' : 'i-lucide-puzzle'"
        aria-hidden="true"
      />
      <strong>{{ copy[status] }}</strong>
      <span v-if="version" class="extension-version" dir="ltr">v{{ version }}</span>
    </div>
    <p>{{ hint }}</p>
    <div class="install-actions">
      <template
        v-if="
          status !== 'installed' && published && status !== 'unsupported' && status !== 'checking'
        "
      >
        <UButton
          v-for="store in stores.filter((entry) => entry.url)"
          :key="store.name"
          :to="store.url"
          external
          target="_blank"
          rel="noopener noreferrer"
          class="primary-button"
          icon="i-lucide-external-link"
          >{{ copy[store.name] }}</UButton
        >
      </template>
      <UButton
        v-else-if="
          !published &&
          status !== 'checking' &&
          status !== 'unsupported' &&
          (status !== 'installed' || !supportedManager)
        "
        :href="downloadUrl"
        external
        download
        data-passkey-download
        class="primary-button"
        icon="i-lucide-download"
        >{{ status === 'installed' ? copy.manager.updateButton : copy.download }}
        <span class="download-format">ZIP · v{{ release.version }}</span></UButton
      >
      <UButton
        color="neutral"
        variant="outline"
        :disabled="status === 'checking' || managing"
        icon="i-lucide-refresh-cw"
        @click="check"
        >{{ copy.recheck }}</UButton
      >
    </div>
    <PasskeyManager
      v-if="status === 'installed' && supportedManager"
      :copy="copy.manager"
      :records="records"
      :busy="managing"
      :outcome="outcome"
      @manage="manage"
      @lock="lock"
      @cancel="cancel"
    />
    <p v-if="status === 'installed' && !supportedManager" role="status">
      {{ copy.manager.update }}
    </p>
    <p v-if="status !== 'installed' && status !== 'unsupported'" class="install-note">
      {{ published ? copy.storeHint : copy.notPublished }}
    </p>
    <section
      v-if="
        !published && status !== 'installed' && status !== 'unsupported' && status !== 'checking'
      "
      class="installation-guide"
    >
      <h3>{{ copy.developer }}</h3>
      <p>{{ copy.developerIntro }}</p>
      <ol>
        <li v-for="(step, index) in copy.steps" :key="step">
          {{ step }}
          <details v-if="index === 1" class="browser-addresses">
            <summary>{{ copy.addressAlternative }}</summary>
            <p>{{ copy.addressHelp }}</p>
            <div v-for="address in addresses" :key="address" class="browser-address">
              <code dir="ltr">{{ address }}</code>
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                :icon="copied && copiedAddress === address ? 'i-mc-check' : 'i-lucide-copy'"
                @click="copyAddress(address)"
                >{{
                  copied && copiedAddress === address ? copy.copiedAddress : copy.copyAddress
                }}</UButton
              >
            </div>
            <p v-if="copyError" role="status">{{ tx(copyError) }}</p>
          </details>
        </li>
      </ol>
      <a :href="release.source" download class="source-download">{{ copy.source }}</a>
    </section>
  </section>
</template>

<style scoped>
.passkey-install {
  min-width: 0;
}
.passkey-install h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}
.connection-state {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--ui-text-highlighted);
}
.connection-state > .iconify {
  width: 1.25rem;
  height: 1.25rem;
}
.extension-version {
  font-size: var(--text-label);
  color: var(--ui-text);
}
.install-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block: 1.25rem;
}
.install-actions :deep(a),
.install-actions :deep(button) {
  min-height: 2.75rem;
  white-space: normal;
  text-decoration: none;
}
.install-actions :deep(.primary-button) {
  color: white;
}
.install-note {
  font-size: var(--text-label);
}
.download-format {
  font-size: var(--text-caption);
}
.installation-guide {
  border-top: 1px solid var(--ui-border);
  margin-top: 1.5rem;
  padding-top: 1rem;
}
.installation-guide h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}
.installation-guide ol {
  list-style: decimal;
  padding-inline-start: 1.5rem;
}
.installation-guide li {
  margin-block: 1rem;
  overflow-wrap: anywhere;
}
.source-download {
  font-size: var(--text-caption);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.browser-addresses {
  margin-top: 0.75rem;
}
.browser-addresses summary {
  cursor: pointer;
  font-size: var(--text-label);
  min-height: 2.75rem;
  align-content: center;
}
.browser-addresses summary:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 4px;
}
.browser-address {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-block: 0.5rem;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
@media (max-width: 480px) {
  .install-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .install-actions :deep(a),
  .install-actions :deep(button) {
    justify-content: center;
  }
}
</style>
