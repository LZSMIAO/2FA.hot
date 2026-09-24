<script setup lang="ts">
/*
 * Shows the newest notice from ANNOUNCEMENTS.md once per visitor, as the same
 * MC tip the shortcut hints use. The file is bundled with the site: editing
 * it on GitHub redeploys, and nothing is fetched from anywhere at runtime.
 */
import source from '~~/ANNOUNCEMENTS.md?raw'
import {
  announcementText,
  parseAnnouncements,
  pickAnnouncement,
  type Announcement
} from '~/utils/announcements'
const props = defineProps<{ paused?: boolean }>()
const { locale } = useMessages()
const seenKey = '2fa-announcements-seen',
  firstKey = '2fa-first-visit'
const current = shallowRef<Announcement | null>(null)
const open = shallowRef(false)
let seenWith: string[] = []
let shown = false
let timer: ReturnType<typeof setTimeout> | undefined
const text = computed(() => (current.value ? announcementText(current.value, locale.value) : ''))
/*
 * When this browser first came, noted by /first-visit.js before the page could
 * write storage of its own. Missing, it counts as new: a notice for returning
 * visitors then stays away rather than greeting a newcomer as one.
 */
function firstVisit() {
  const stored = Number(localStorage.getItem(firstKey) ?? NaN)
  return Number.isFinite(stored) ? stored : Date.now()
}
function show() {
  clearTimeout(timer)
  if (shown || !current.value || props.paused) return
  try {
    const seen = JSON.parse(localStorage.getItem(seenKey) || '[]') as string[]
    localStorage.setItem(seenKey, JSON.stringify([...new Set([...seen, ...seenWith])].slice(-200)))
  } catch {
    return
  }
  shown = true
  open.value = true
  timer = setTimeout(close, 12000)
}
function close() {
  clearTimeout(timer)
  open.value = false
}
onMounted(() => {
  try {
    const seen = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]') as string[])
    const pick = pickAnnouncement(parseAnnouncements(source), {
      now: Date.now(),
      firstVisit: firstVisit(),
      seen
    })
    if (!pick) return
    current.value = pick.entry
    seenWith = pick.seen
    // Let the page settle first; it is marked as seen only once it is on screen.
    timer = setTimeout(show, 1500)
  } catch {
    // Without storage it could not stay "once", so it stays quiet.
  }
})
watch(
  () => props.paused,
  (paused) => {
    if (paused) close()
    else if (current.value && !shown) timer = setTimeout(show, 800)
  }
)
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <ActionHint
    :open="open && !!text"
    :message="text"
    :icon="`i-lucide-${current?.icon || 'megaphone'}`"
    @close="close"
  />
</template>
