<script setup lang="ts">
import { waitlistLinks } from '~~/shared/waitlist'
const { tx } = useMessages()
</script>

<template>
  <section class="waitlist-sharing" aria-labelledby="sharing-title">
    <p class="sharing-status">{{ tx('尚未上线') }}</p>
    <h2 id="sharing-title">{{ tx('临时分享验证码') }}</h2>
    <p>{{ tx('计划支持临时分享验证码，密钥留在自己的设备上。') }}</p>
    <p>
      {{ tx('分享时需要保持在线，可以随时停止。对方已收到的验证码无法收回。') }}
    </p>
    <a :href="waitlistLinks.sharing" target="_blank" rel="noopener noreferrer">{{
      tx('查看方案（GitHub）')
    }}</a>
  </section>
</template>

<style scoped>
.waitlist-sharing {
  border-block: 1px solid var(--ui-border);
  padding-block: 1.75rem;
  margin-block: 2rem;
}
.waitlist-sharing .sharing-status {
  width: fit-content;
  margin: 0 0 0.75rem;
  padding: 0.25rem 0.625rem;
  border: 1px solid var(--ui-border);
  background: var(--wash);
  color: var(--ui-text-highlighted);
  font-size: var(--text-label);
}
.waitlist-sharing h2 {
  margin-top: 0;
}
</style>
