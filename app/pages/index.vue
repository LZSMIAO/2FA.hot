<script setup lang="ts">
definePageMeta({ viewTransition: false })
import BatchWorkspace from '~/components/BatchWorkspace.vue'
import UsageGuide from '~/components/UsageGuide.vue'
import { toolHeadings } from '~~/shared/seo/copy'
const { tx, locale } = useMessages()
const localePath = useLocalePath()
const mode = shallowRef('single')
const singleWorkspace = useTemplateRef<{ paste: (value: string) => void }>('singleWorkspace')
async function importSingle(value: string) {
  mode.value = 'single'
  await nextTick()
  singleWorkspace.value?.paste(value)
}
const batchInput = shallowRef('')
const batchReplace = shallowRef(false)
const batchImportVersion = shallowRef(0)
const guideOpen = shallowRef(false)
const mobileGuide = shallowRef(false)
let mobileQuery: MediaQueryList | undefined
function updateMobileGuide() {
  mobileGuide.value = mobileQuery?.matches || false
}
const guideTrigger = useTemplateRef<HTMLButtonElement>('guideTrigger')
const guideTop = shallowRef('7rem')
const guideRight = shallowRef('1.5rem')
const workspace = useTemplateRef<HTMLElement>('workspace')
function alignGuide() {
  if (!guideOpen.value) return
  const work = workspace.value
  const drawer = document.getElementById('usage-guide')
  if (work && drawer && window.innerWidth > 1000) {
    const gap =
      document.documentElement.clientWidth -
      24 -
      drawer.offsetWidth -
      work.getBoundingClientRect().right
    guideRight.value = `${24 + Math.max(0, gap) / 2}px`
  }
  const trigger = guideTrigger.value
  if (trigger) guideTop.value = `${Math.max(16, trigger.getBoundingClientRect().top)}px`
}
let guideReturnFocus: HTMLButtonElement | null = null
const guideStep = shallowRef<number | undefined>()
const guideCode = shallowRef('')
const batchDemo = shallowRef({ input: 0, results: 0, copied: '' })
function openGuide() {
  batchDemo.value = { input: 0, results: 0, copied: '' }
  guideStep.value = 0
  guideOpen.value = true
  alignGuide()
  nextTick(() => {
    alignGuide()
    if (mobileGuide.value)
      document
        .getElementById('usage-guide')
        ?.scrollIntoView({ block: 'start', behavior: 'instant' })
  })
}
function toggleGuide(event: MouseEvent) {
  guideReturnFocus = event.currentTarget as HTMLButtonElement
  if (guideOpen.value) closeGuide()
  else openGuide()
}
function closeGuide(restoreFocus = true) {
  if (!guideOpen.value) return
  guideOpen.value = false
  guideStep.value = undefined
  guideCode.value = ''
  if (restoreFocus)
    nextTick(() => (guideReturnFocus || guideTrigger.value)?.focus({ preventScroll: true }))
}
function handleGuideEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && guideOpen.value) {
    event.preventDefault()
    closeGuide()
  }
}
onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 700px), (max-height: 500px) and (pointer: coarse)')
  updateMobileGuide()
  mobileQuery.addEventListener('change', updateMobileGuide)
  window.addEventListener('keydown', handleGuideEscape)
  window.addEventListener('resize', alignGuide)
  window.addEventListener('scroll', alignGuide, { passive: true })
})
onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', updateMobileGuide)
  window.removeEventListener('keydown', handleGuideEscape)
  window.removeEventListener('resize', alignGuide)
  window.removeEventListener('scroll', alignGuide)
})
const tabItems = computed(() => [
  { label: tx('单条取码'), value: 'single', slot: 'single' },
  { label: tx('批量取码'), value: 'batch', slot: 'batch' }
])
watch(
  mode,
  () => {
    if (!guideOpen.value) return
    batchDemo.value = { input: 0, results: 0, copied: '' }
    guideStep.value = 0
    guideCode.value = ''
    nextTick(() => {
      if (mobileGuide.value)
        document
          .getElementById('usage-guide')
          ?.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
  },
  { flush: 'sync' }
)
function importBatch(value: string, replace = false) {
  batchReplace.value = replace
  batchInput.value = value
  batchImportVersion.value++
  mode.value = 'batch'
}
const batchTransfer = useState<string>('smart-batch-transfer', () => '')
watch(
  batchTransfer,
  (value) => {
    if (!value) return
    importBatch(value)
    batchTransfer.value = ''
  },
  { immediate: true }
)
</script>

<template>
  <div class="home" :class="{ 'guide-mode': guideOpen }">
    <div class="page-intro">
      <h1 class="tool-wordmark">
        <GameTitle /><span class="sr-only">{{ toolHeadings[locale] || toolHeadings.en }}</span>
      </h1>
    </div>

    <div class="guided-layout">
      <Teleport to="body" :disabled="mobileGuide">
        <div
          class="guide-layer"
          :class="{ 'guide-inline': mobileGuide }"
          :style="{ '--guide-top': guideTop, '--guide-right': guideRight }"
        >
          <Transition name="guide-drawer">
            <div v-if="guideOpen" id="usage-guide" class="guide-drawer ore-theme">
              <BatchUsageGuide
                v-if="mode === 'batch'"
                @switch-mode="mode = 'single'"
                @demo="batchDemo = $event"
                @step="guideStep = $event"
                @close="closeGuide"
              />
              <UsageGuide
                v-else
                :code="guideCode"
                @switch-mode="mode = 'batch'"
                @step="guideOpen && (guideStep = $event)"
                @close="closeGuide"
              />
            </div>
          </Transition>
        </div>
      </Teleport>
      <div ref="workspace" class="guided-workspace">
        <UTabs
          v-model="mode"
          :items="tabItems"
          :unmount-on-hide="false"
          variant="link"
          color="neutral"
          size="lg"
          class="mode-tabs"
          :ui="{
            list: 'w-fit gap-6 border-0 p-0',
            trigger: 'px-0 pb-3 min-h-11',
            indicator: 'hidden',
            content: 'mt-5 outline-none',
            root: 'gap-0'
          }"
        >
          <template #list-trailing>
            <button
              ref="guideTrigger"
              class="guide-trigger guide-trigger-inline"
              :aria-expanded="guideOpen"
              :aria-controls="guideOpen ? 'usage-guide' : undefined"
              @click="toggleGuide"
            >
              <UIcon :name="guideOpen ? 'i-lucide-x' : 'i-lucide-accessibility'" />
              {{ tx(guideOpen ? '关闭教学' : '不会用？') }}
            </button>
          </template>
          <template #single
            ><SingleWorkspace
              ref="singleWorkspace"
              :guide-step="mode === 'single' ? guideStep : undefined"
              @batch="importBatch"
              @guide-code="guideCode = $event"
          /></template>
          <template #batch
            ><BatchWorkspace
              @single="importSingle"
              :initial="batchInput"
              :import-version="batchImportVersion"
              :replace="batchReplace"
              :demo="batchDemo"
              :guide-step="mode === 'batch' ? guideStep : undefined"
          /></template>
        </UTabs>

        <div class="workspace-foot workspace-summary">
          <div class="workspace-summary-copy">
            <span>
              <UIcon name="i-lucide-monitor" />
              <span class="local-processing-label">
                {{ tx('所有数据由本地浏览器处理') }}
                <UTooltip
                  :text="tx('隐私说明')"
                  :delay-duration="0"
                  :content="{ side: 'top', align: 'center', sideOffset: 2 }"
                  arrow
                  :ui="{ content: 'parameter-help-tooltip', arrow: 'parameter-help-arrow' }"
                >
                  <NuxtLink
                    :to="localePath('/privacy')"
                    class="local-processing-help"
                    :aria-label="tx('隐私说明')"
                    ><UIcon name="i-lucide-info"
                  /></NuxtLink>
                </UTooltip>
              </span>
            </span>
          </div>
          <div class="workspace-summary-links">
            <HistoryToggle />
          </div>
          <SessionHistory @select="mode = 'single'" @batch="(value) => importBatch(value, true)" />
        </div>
      </div>
    </div>
  </div>
</template>
