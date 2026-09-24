/**
 * Notices come from ANNOUNCEMENTS.md, which is edited by hand on GitHub. The
 * parser is forgiving: an entry it cannot read is skipped, never an error.
 */
export interface Announcement {
  id: string
  /** Start of the day it goes live, local time. */
  date: number
  /** End of its last day, if it has one. */
  until?: number
  /** Only people who used the site before `date` see it. */
  returning: boolean
  icon: string
  text: Record<string, string>
}

const fields: Record<string, 'date' | 'audience' | 'until' | 'icon'> = {
  date: 'date',
  日期: 'date',
  audience: 'audience',
  对象: 'audience',
  對象: 'audience',
  until: 'until',
  截止: 'until',
  icon: 'icon',
  图标: 'icon',
  圖標: 'icon'
}
// Field names and values written in the file itself, not interface text.
const returningNames: Record<string, true> = { returning: true, 老用户: true, 老用戶: true }

function day(value: string, end = false) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return NaN
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  return end ? new Date(y, m - 1, d, 23, 59, 59, 999).getTime() : new Date(y, m - 1, d).getTime()
}

export function parseAnnouncements(markdown: string): Announcement[] {
  const seen = new Set<string>()
  return markdown
    .replace(/<!--[\s\S]*?-->/g, '')
    .split(/^## /m)
    .slice(1)
    .flatMap((section) => {
      const [heading = '', ...lines] = section.split('\n')
      const id = heading.trim()
      if (!/^[\w-]{1,64}$/.test(id) || seen.has(id)) return []
      const entry: Announcement = { id, date: NaN, returning: false, icon: '', text: {} }
      for (const raw of lines) {
        const line = raw.replace(/^\s*[-*]\s+/, '').trim()
        const match = line.match(/^([^:：]+)[:：]\s*(.+)$/)
        if (!match) continue
        const name = match[1]!.trim(),
          value = match[2]!.trim()
        const field = fields[name.toLowerCase()] ?? fields[name]
        if (field === 'date') entry.date = day(value)
        else if (field === 'until') entry.until = day(value, true)
        else if (field === 'audience')
          entry.returning = Object.hasOwn(returningNames, value.toLowerCase())
        else if (field === 'icon') entry.icon = /^[a-z0-9-]+$/.test(value) ? value : ''
        else if (/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(name))
          entry.text[name] = value.replace(/\\n/g, '\n').slice(0, 600)
      }
      if (!Number.isFinite(entry.date) || !Object.keys(entry.text).length) return []
      if (entry.until !== undefined && !Number.isFinite(entry.until)) delete entry.until
      seen.add(id)
      return [entry]
    })
}

/** Chinese scripts stand in for each other before English does. */
export function announcementText(entry: Announcement, locale: string) {
  const text = entry.text
  return (
    text[locale] ||
    (locale.startsWith('zh') ? text['zh-TW'] || text['zh-CN'] : '') ||
    text.en ||
    Object.values(text)[0] ||
    ''
  )
}

/**
 * The newest notice this visitor has not seen, and every notice to mark as
 * seen with it, so older ones never queue up behind it.
 */
export function pickAnnouncement(
  entries: readonly Announcement[],
  visitor: { now: number; firstVisit: number; seen: ReadonlySet<string> }
): { entry: Announcement; seen: string[] } | null {
  const due = entries
    .filter(
      (entry) =>
        !visitor.seen.has(entry.id) &&
        entry.date <= visitor.now &&
        (entry.until === undefined || visitor.now <= entry.until) &&
        (!entry.returning || visitor.firstVisit < entry.date)
    )
    .sort((a, b) => b.date - a.date)
  return due.length ? { entry: due[0]!, seen: due.map((entry) => entry.id) } : null
}
