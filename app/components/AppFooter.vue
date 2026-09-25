<script setup lang="ts">
const localePath = useLocalePath()
const { tx } = useMessages()
</script>
<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <NuxtLink class="footer-brand" :to="localePath('/')"
        ><span class="footer-wordmark">2fa.hot</span
        ><span class="footer-tagline"
          ><span class="footer-dash"> - </span>{{ tx('多功能 TOTP 验证码生成器') }}</span
        ></NuxtLink
      >
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
}
/* The brand reads as one line; on a narrow footer the description gives way first. */
.footer-inner .footer-brand {
  width: auto;
  min-width: 0;
  max-width: 100%;
  justify-content: flex-start;
  gap: 0;
  white-space: nowrap;
}
.footer-wordmark {
  flex-shrink: 0;
}
/*
 * Chinese, Japanese and Korean glyphs fill more of the em than Latin letters,
 * so at the same font size the name looked smaller than the words after it.
 * This brings the height of its letters level with theirs.
 */
.footer-wordmark:lang(zh),
.footer-wordmark:lang(ja),
.footer-wordmark:lang(ko) {
  font-size: 1.12em;
}
.footer-tagline {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
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
