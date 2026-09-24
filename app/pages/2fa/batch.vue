<script setup lang="ts">
/*
 * Batches now share the single-key link, /2fa#KEY1#KEY2. Links from before
 * kept encoded lines here; read them once, carry their names across as the
 * workspace does, and move on without keeping the old link in history.
 */
import { parseSmartBatch } from '~/utils/smart-paste'
import { accessPath, type OtpConfig } from '~/utils/otp'
definePageMeta({ viewTransition: false })
const route = useRoute()
const localePath = useLocalePath()
const expandedConfig = useState<OtpConfig | null>('expanded-otp-config', () => null)
const expandedHistoryPreview = useState('expanded-history-preview', () => false)
const expandedBatch = useState<OtpConfig[] | null>('expanded-batch-configs', () => null)
onMounted(() => {
  let configs: OtpConfig[] = []
  try {
    if (route.hash.length <= 300001)
      configs = parseSmartBatch(route.hash.slice(1)).flatMap((row) =>
        row.config ? [row.config] : []
      )
  } catch {
    // An unreadable link opens the empty key form instead.
  }
  if (configs.length === 1) {
    expandedConfig.value = configs[0]!
    expandedHistoryPreview.value = false
  } else if (configs.length) expandedBatch.value = configs
  void navigateTo(localePath(configs.length ? accessPath(configs) : '/2fa'), { replace: true })
})
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })
</script>
<template><div /></template>
