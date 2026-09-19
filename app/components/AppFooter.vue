<script setup lang="ts">
const localePath = useLocalePath()
const { tx, locale } = useMessages()
</script>
<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <a class="footer-brand" href="https://2fa.hot">2fa.hot</a>
      <nav :aria-label="tx('页脚导航')">
        <div class="footer-pages">
          <a
            :href="
              '/lite?lang=' +
              (locale === 'zh-TW' ? 'zh-TW' : locale.startsWith('zh') ? 'zh-CN' : 'en')
            "
            >Lite</a
          >
          <NuxtLink :to="localePath('/guides', locale.startsWith('zh') ? 'zh-CN' : 'en')"
            >2FA / TOTP</NuxtLink
          >
          <NuxtLink
            :to="
              localePath(
                '/about',
                locale === 'zh-TW' ? 'zh-TW' : locale.startsWith('zh') ? 'zh-CN' : 'en'
              )
            "
            >{{ tx('关于') }}</NuxtLink
          >
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
            href="https://github.com/LZSMIAO/2fa-hot"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="tx('2FA hot 的 GitHub 项目（新窗口）')"
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
@media (max-width: 480px) {
  .footer-inner {
    flex-wrap: wrap;
  }
  .footer-inner nav {
    margin-inline-start: auto;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .footer-inner .footer-contacts a {
    width: 2.75rem;
  }
  .footer-inner nav {
    gap: 1rem;
  }
  .footer-pages {
    gap: 0.75rem;
  }
}
</style>
