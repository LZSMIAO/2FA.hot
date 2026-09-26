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
        --><span class="footer-copyright"
          ><span>© 2026 2fa.hot.</span> <span>All rights reserved.</span></span
        >
      </p>
      <nav :aria-label="tx('页脚导航')">
        <div class="footer-pages">
          <NuxtLink :to="localePath('/guides')">{{ tx('指南') }}</NuxtLink>
          <NuxtLink :to="localePath('/waitlist')">{{ tx('功能') }}</NuxtLink>
          <NuxtLink class="footer-privacy" :to="localePath('/privacy')">{{ tx('隐私') }}</NuxtLink>
          <NuxtLink :to="localePath('/about')">{{ tx('关于') }}</NuxtLink>
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
            href="https://t.me/TwoFAhot"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="tx('2fa.hot 的 Telegram（新窗口）')"
            title="Telegram"
            ><UIcon name="i-brand-telegram"
          /></a>
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
}
/* The description and the notice on one line, level with the links; where the
   window is too narrow for both, the notice moves under the description. */
.footer-brand {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem 1.25rem;
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
/* Where the notice has to wrap (a narrow phone, beside the contact icons), it
   breaks between its two sentences rather than inside one. */
.footer-copyright > span {
  white-space: nowrap;
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
