<script setup lang="ts">
import TitlePanorama from '~/components/TitlePanorama.vue'
import MinecraftError from '~/components/MinecraftError.vue'

const props = defineProps<{ error: { statusCode?: number } }>()
const localePath = useLocalePath()
const { tx } = useMessages()
const uiLocale = useInterfaceLocale()
const statusCode = computed(() => props.error.statusCode || 500)
const title = computed(() => tx(statusCode.value === 404 ? '这个页面不存在' : '页面暂时无法打开'))
const description = computed(() =>
  tx(
    statusCode.value === 404
      ? '别挖了，这里连基岩都没有。回首页重新开局吧。'
      : '回到工具首页，继续获取验证码。'
  )
)
const homePath = computed(() => localePath('/'))

useSeoMeta({
  title: () => `${statusCode.value} · ${title.value} | 2FA.HOT`,
  robots: 'noindex, nofollow'
})

function returnHome() {
  return clearError({ redirect: homePath.value })
}
</script>

<template>
  <UApp :locale="uiLocale" :toaster="null">
    <TitlePanorama />
    <MinecraftError
      :status-code="statusCode"
      :title="title"
      :description="description"
      :home-path="homePath"
      :home-label="tx('返回首页')"
      @return-home="returnHome"
    />
  </UApp>
</template>
