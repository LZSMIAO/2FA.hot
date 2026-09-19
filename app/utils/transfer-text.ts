/** Office clipboards can include a bitmap alongside the actual cell contents. */
export function transferText(data: Pick<DataTransfer, 'getData'>): string {
  const plain = data.getData('text/plain')
  if (plain.trim()) return plain
  const html = data.getData('text/html')
  if (!html || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, noscript, template').forEach((node) => node.remove())
  doc.querySelectorAll('br').forEach((node) => node.replaceWith('\n'))
  const rows = [...doc.querySelectorAll('tr')]
  if (rows.length)
    return rows
      .map((row) =>
        [...row.children]
          .filter((cell) => /^(TD|TH)$/.test(cell.tagName))
          .map((cell) => {
            const value = cell.textContent?.trim() || ''
            return /[\t\r\n"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value
          })
          .join('\t')
      )
      .join('\n')
  doc.querySelectorAll('br').forEach((node) => node.replaceWith('\n'))
  doc.querySelectorAll('p, div, li').forEach((node) => node.append('\n'))
  return doc.body.textContent?.trim() || ''
}

export async function clipboardText(items: ClipboardItem[]): Promise<string> {
  for (const type of ['text/plain', 'text/html']) {
    const values: string[] = []
    for (const item of items) {
      if (!item.types.includes(type)) continue
      const value = await (await item.getType(type)).text()
      const text =
        type === 'text/plain'
          ? value
          : transferText({ getData: (mime) => (mime === 'text/html' ? value : '') })
      if (text.trim()) values.push(text)
    }
    if (values.length) return values.join('\n')
  }
  return ''
}
