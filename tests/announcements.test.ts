import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  announcementText,
  parseAnnouncements,
  pickAnnouncement
} from '../app/utils/announcements.ts'

const sample = `# Notices
<!--
## ignored-example
日期: 2026-01-01
en: never shown
-->
## old-news
date: 2026-08-01
audience: everyone
en: Old

## custom-background
日期: 2026-09-25
對象: 老用戶
圖標: image-up
zh-TW: 第一行\\n第二行
en: New

## expired
日期: 2026-07-01
截止: 2026-07-31
en: Gone

## bad id!
日期: 2026-09-25
en: Skipped

## no-date
en: Skipped too
`
const at = (date: string) => new Date(`${date}T12:00:00`).getTime()

test('entries are read from the hand-edited file, skipping what cannot be read', () => {
  const entries = parseAnnouncements(sample)
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ['old-news', 'custom-background', 'expired']
  )
  const feature = entries[1]!
  assert.equal(feature.returning, true)
  assert.equal(feature.icon, 'image-up')
  assert.equal(announcementText(feature, 'zh-TW'), '第一行\n第二行')
  // Simplified Chinese falls back to Traditional before English; others to English.
  assert.equal(announcementText(feature, 'zh-CN'), '第一行\n第二行')
  assert.equal(announcementText(feature, 'de'), 'New')
})

test('each visitor sees the newest due notice once, and returning-only ones need a past visit', () => {
  const entries = parseAnnouncements(sample)
  const returning = pickAnnouncement(entries, {
    now: at('2026-09-26'),
    firstVisit: 0,
    seen: new Set()
  })
  assert.equal(returning?.entry.id, 'custom-background')
  // The older unread notice is marked too, so it never pops up afterwards.
  assert.deepEqual(returning?.seen.sort(), ['custom-background', 'old-news'])
  assert.equal(
    pickAnnouncement(entries, {
      now: at('2026-09-26'),
      firstVisit: 0,
      seen: new Set(returning!.seen)
    }),
    null
  )
  // Someone whose first visit came after the launch is new to it.
  const newcomer = pickAnnouncement(entries, {
    now: at('2026-09-26'),
    firstVisit: at('2026-09-25'),
    seen: new Set()
  })
  assert.equal(newcomer?.entry.id, 'old-news')
  // Not yet due, and past its end date.
  assert.equal(
    pickAnnouncement(entries, { now: at('2026-07-15'), firstVisit: 0, seen: new Set() })?.entry.id,
    'expired'
  )
  assert.equal(
    pickAnnouncement(entries, {
      now: at('2026-07-15') - 40 * 86_400_000,
      firstVisit: 0,
      seen: new Set()
    }),
    null
  )
})

test('the published ANNOUNCEMENTS.md reads cleanly with unique ids', () => {
  const markdown = readFileSync(new URL('../ANNOUNCEMENTS.md', import.meta.url), 'utf8')
  const headings = [...markdown.replace(/<!--[\s\S]*?-->/g, '').matchAll(/^## (.+)$/gm)].map(
    (match) => match[1]!.trim()
  )
  const entries = parseAnnouncements(markdown)
  // Every heading outside the guide comment became an entry: none was skipped by mistake.
  assert.deepEqual(
    entries.map((entry) => entry.id),
    headings
  )
  for (const entry of entries) assert.ok(announcementText(entry, 'en'), entry.id)
})
