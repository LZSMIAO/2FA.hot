<script setup lang="ts">
import { waitlistLinks } from '~~/shared/waitlist'

definePageMeta({ viewTransition: false })
const localePath = useLocalePath()
const { tx } = useMessages()
</script>

<template>
  <article class="content-page waitlist-page">
    <NuxtLink :to="localePath('/')" class="back-link"
      ><UIcon name="i-mc-arrow-left" />{{ tx('返回工具') }}</NuxtLink
    >
    <h1>{{ tx('功能建议') }}</h1>
    <p class="article-lead">{{ tx('想加什么功能，或哪里不好用？在这里提建议。') }}</p>
    <div class="waitlist-actions">
      <UButton
        :to="waitlistLinks.submit"
        external
        target="_blank"
        rel="noopener noreferrer"
        icon="i-lucide-plus"
        class="waitlist-action waitlist-submit primary-button"
        >{{ tx('提建议') }}</UButton
      >
      <UButton
        :to="waitlistLinks.browse"
        external
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        variant="outline"
        class="waitlist-action"
        >{{ tx('查看已有建议') }}</UButton
      >
    </div>
    <p class="waitlist-note">
      {{ tx('将在 GitHub 打开，提交需登录。内容公开，请勿填写密钥或密码。') }}
    </p>
    <WaitlistSharing />
    <p>
      {{ tx('先看看有没有相同建议。提交时说清遇到的问题和想要的改进就好。') }}
    </p>
    <p>{{ tx('列出的功能还没做好，暂无上线时间。') }}</p>
    <p>
      <a :href="waitlistLinks.markdown" target="_blank" rel="noopener noreferrer">{{
        tx('查看功能清单')
      }}</a>
    </p>
  </article>
</template>

<style scoped>
.waitlist-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block: 1.5rem;
}
.waitlist-page .waitlist-action {
  justify-content: center;
  min-height: 3rem;
  white-space: normal;
  text-align: center;
  text-decoration: none;
  color: var(--ui-text-highlighted);
}
.waitlist-page .waitlist-note {
  font-size: var(--text-label);
}
@media (max-width: 480px) {
  .waitlist-actions {
    flex-direction: column;
  }
}
</style>
