<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
</script>
<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <p class="footer-brand">
        <span class="footer-tagline">{{ tx('多功能 TOTP 验证码生成器') }}</span
        ><!-- Not translated: the notice reads the same on every language's page.
        --><span class="footer-copyright">© 2026 2fa.hot. All rights reserved.</span>
      </p>
      <nav :aria-label="tx('页脚导航')">
        <div class="footer-pages">
          <NuxtLink :to="localePath('/guides')">{{ tx('指南') }}</NuxtLink>
          <NuxtLink :to="localePath('/about')">{{ tx('关于') }}</NuxtLink>
          <NuxtLink class="footer-privacy" :to="localePath('/privacy')">{{ tx('隐私') }}</NuxtLink>
          <NuxtLink :to="localePath('/waitlist')">{{ tx('功能建议') }}</NuxtLink>
        </div>
        <div class="footer-contacts">
          <a
            class="footer-icon"
            href="mailto:admin@2fa.hot"
            aria-label="admin@2fa.hot"
            title="admin@2fa.hot"
          >
            <UIcon name="i-lucide-mail" />
          </a>
          <a
            class="footer-icon"
            href="https://github.com/LZSMIAO/2FA.hot"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="tx('2fa.hot 的 GitHub 项目（新窗口）')"
            title="GitHub"
            ><UIcon name="i-lucide-github"
          /></a>
        </div>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.footer-inner nav {
  gap: 1.75rem;
  /* Level with the notice's line, not centred on both: the description's line
     and the gap under it are left above the links. */
  margin-block-start: 1.375rem;
}
/* The description over the notice, both cut short rather than pushing the links. */
.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  margin: 0;
  line-height: 1.25rem;
  white-space: nowrap;
}
.footer-copyright,
.footer-tagline {
  overflow: hidden;
  text-overflow: ellipsis;
}
.footer-pages,
.footer-contacts {
  display: flex;
  align-items: center;
}
.footer-pages {
  flex-wrap: wrap;
  gap: 1.25rem;
}
.footer-pages a {
  width: auto;
  white-space: nowrap;
}
.footer-contacts {
  gap: 0;
}
.footer-inner .footer-contacts a {
  width: 2.25rem;
}
</style>
