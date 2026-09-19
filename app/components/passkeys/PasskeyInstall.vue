<script setup lang="ts">
import type { PasskeyCopy } from '~~/shared/passkeys-copy'
import { passkeyStoreIds, passkeyStoreUrl } from '~~/shared/passkeys'

const props = defineProps<{ copy: PasskeyCopy }>()
const { status, version, browser, opening, openResult, check, open } = usePasskeyExtension()
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
      <UButton
        v-if="status === 'installed'"
        data-passkey-open
        :loading="opening"
        :disabled="opening"
        class="primary-button"
        icon="i-lucide-key-round"
        @click="open"
        >{{ copy.open }}</UButton
      >
      <template v-else-if="published && status !== 'unsupported' && status !== 'checking'">
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
        color="neutral"
        variant="outline"
        :disabled="status === 'checking' || opening"
        icon="i-lucide-refresh-cw"
        @click="check"
        >{{ copy.recheck }}</UButton
      >
    </div>
    <p v-if="openResult" :role="openResult === 'failed' ? 'alert' : 'status'">
      {{ copy[openResult] }}
    </p>
    <p class="install-note">{{ published ? copy.storeHint : copy.notPublished }}</p>
    <details class="developer-guide">
      <summary>{{ copy.developer }}</summary>
      <p>{{ copy.developerIntro }}</p>
      <a
        href="https://github.com/LZSMIAO/2fa-hot/tree/main/extensions/passkeys"
        target="_blank"
        rel="noopener noreferrer"
        >{{ copy.source }} ↗</a
      >
      <ol>
        <li v-for="step in copy.steps" :key="step">{{ step }}</li>
      </ol>
      <pre dir="ltr"><code>pnpm --dir extensions/passkeys install --frozen-lockfile
pnpm --dir extensions/passkeys build</code></pre>
      <p>{{ copy.extensionsPage }}</p>
      <div class="browser-addresses" dir="ltr">
        <code>chrome://extensions</code><code>edge://extensions</code>
      </div>
    </details>
  </section>
</template>

<style scoped>
.passkey-install {
  padding: 1.5rem;
  margin-block: 2rem;
  border: 2px solid var(--ore-outline);
  background: var(--wash);
}
.passkey-install h2 {
  margin-top: 0;
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
.developer-guide {
  border-top: 1px solid var(--ui-border);
  margin-top: 1.5rem;
  padding-top: 1rem;
}
.developer-guide summary {
  cursor: pointer;
  font-weight: 600;
  min-height: 2.75rem;
  align-content: center;
}
.developer-guide summary:focus-visible {
  outline: 2px solid var(--accent-ink);
  outline-offset: 4px;
}
.developer-guide li {
  margin-block: 0.75rem;
  overflow-wrap: anywhere;
}
.developer-guide pre {
  max-width: 100%;
  overflow-x: auto;
  padding: 1rem;
  background: var(--ore-input);
  font-size: 0.8rem;
  line-height: 1.8;
}
.browser-addresses {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  font-size: 0.875rem;
  overflow-wrap: anywhere;
}
@media (max-width: 480px) {
  .passkey-install {
    padding: 1rem;
  }
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
