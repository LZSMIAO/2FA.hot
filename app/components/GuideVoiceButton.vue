<script setup lang="ts">
import { narrationLanguage } from '~/utils/guide-narration'
defineProps<{ enabled: boolean }>()
defineEmits<{ toggle: [] }>()
const { tx, locale } = useMessages()
</script>
<template>
  <AppHint v-if="narrationLanguage(locale)" :text="tx(enabled ? '关闭语音解说' : '播放语音解说')"
    ><UButton
      size="sm"
      color="neutral"
      variant="ghost"
      :icon="enabled ? 'i-lucide-volume-2' : 'i-lucide-volume-x'"
      :aria-label="tx(enabled ? '关闭语音解说' : '播放语音解说')"
      :aria-pressed="enabled"
      :class="{ 'text-[var(--accent-ink)]': enabled }"
      data-sound-custom
      @click="$emit('toggle')"
  /></AppHint>
</template>
