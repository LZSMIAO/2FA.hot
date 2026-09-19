<script setup lang="ts">
import type { PasskeyCopy } from '~~/shared/passkeys-copy'
defineProps<{ copy: PasskeyCopy }>()
</script>

<template>
  <section aria-labelledby="passkey-guide-heading">
    <h2 id="passkey-guide-heading">{{ copy.instructions }}</h2>
    <dl class="passkey-flows">
      <div v-for="flow in copy.flows" :key="flow.title" class="passkey-flow">
        <dt>{{ flow.title }}</dt>
        <dd>{{ flow.text }}</dd>
      </div>
    </dl>
    <p>{{ copy.migrationNote }}</p>
    <h2>{{ copy.storage }}</h2>
    <p>{{ copy.privacy }}</p>
    <h2>{{ copy.protocol }}</h2>
    <p>{{ copy.protocolText }}</p>
    <h2>{{ copy.limits }}</h2>
    <p>{{ copy.limitation }}</p>
  </section>
</template>

<style scoped>
.passkey-flow {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 1.5rem;
  border-bottom: 1px solid var(--ui-border);
  padding-block: 1.25rem;
}
.passkey-flow dt {
  font-weight: 600;
  color: var(--ui-text-highlighted);
}
.passkey-flow dd {
  margin: 0;
  line-height: 1.8;
}
@media (max-width: 600px) {
  .passkey-flow {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }
}
</style>
