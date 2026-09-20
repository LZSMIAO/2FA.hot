<script setup lang="ts">
import { parseSmartBatch } from '~/utils/smart-paste'
import { unlocalizedPath } from '~~/shared/seo/routes'
definePageMeta({ viewTransition: false })
const route = useRoute()
const localePath = useLocalePath()
const { tx } = useMessages()
const source = shallowRef('')
const issue = shallowRef('')
const version = shallowRef(0)
const transfer = useState<string>('smart-batch-transfer', () => '')
function load() {
  source.value = ''
  issue.value = ''
  try {
    if (route.hash.length > 300001) throw new Error('文本超过 100KB，请分批处理。')
    const value = route.hash.slice(1)
    const rows = parseSmartBatch(value)
    if (!rows.length || rows.some((row) => !row.config))
      throw new Error('密钥格式不正确，请检查是否包含多余字符。')
    source.value = value
    version.value++
  } catch (cause) {
    issue.value =
      cause instanceof URIError
        ? '密钥格式不正确，请检查是否包含多余字符。'
        : (cause as Error).message
  }
}
onMounted(load)
watch(
  () => route.hash,
  () => {
    load()
  }
)
onBeforeRouteLeave((to) => {
  if (unlocalizedPath(to.path) === '/' && source.value) transfer.value = source.value
})
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })
</script>
<template>
  <div class="batch-direct-page">
    <BatchWorkspace
      v-if="source"
      :initial="source"
      :import-version="version"
      replace
      standalone
      @collapse="navigateTo(localePath('/'))"
    />
    <section v-else class="batch-direct-empty">
      <h1 class="workspace-title">{{ tx('批量获取验证码') }}</h1>
      <p v-if="issue" class="inline-error" role="alert">{{ tx(issue) }}</p>
      <UButton :to="localePath('/')">{{ tx('返回工具首页') }}</UButton>
    </section>
  </div>
</template>
<style scoped>
.batch-direct-page {
  max-width: 76rem;
  margin: 3rem auto;
  padding-inline: 1.5rem;
}
.batch-direct-empty {
  display: grid;
  gap: 1rem;
  justify-items: start;
  padding: clamp(1.25rem, 2.5vw, 2rem);
  border-radius: var(--ui-radius);
  background: var(--panel);
  color: var(--ui-text);
}
@media (max-width: 600px) {
  .batch-direct-page {
    margin-block: 1.5rem;
    padding-inline: 1rem;
  }
}
</style>
