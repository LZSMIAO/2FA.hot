export function readmeRegion(source: string, name: string): string {
  const start = `<!-- website:${name}:start -->`
  const end = `<!-- website:${name}:end -->`
  const offset = source.indexOf(start)
  const boundary = source.indexOf(end, offset + start.length)
  if (offset < 0 || boundary < 0) throw new Error(`Missing README region: ${name}`)
  return source.slice(offset + start.length, boundary).trim()
}

export function parseAboutReadme(source: string) {
  return {
    introduction: readmeRegion(source, 'intro').split(/\n\s*\n/),
    sections: readmeRegion(source, 'body')
      .split(/^## /m)
      .filter(Boolean)
      .map((section) => {
        const [title = '', ...body] = section.trim().split('\n')
        return {
          title,
          blocks: body
            .join('\n')
            .trim()
            .split(/(<details>[\s\S]*?<\/details>)/)
            .flatMap((block) => (block.startsWith('<details>') ? [block] : block.split(/\n\s*\n/)))
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block) => {
              const spoiler =
                /^<details>\s*<summary>([^<]+)<\/summary>\s*([\s\S]*?)\s*<\/details>$/.exec(block)
              const ordered = /^\d+\. /.test(block)
              const list = ordered || block.startsWith('- ')
              return {
                spoiler: spoiler ? { label: spoiler[1]!, text: spoiler[2]! } : null,
                divider: /^-{3,}$/.test(block),
                ordered,
                list,
                lines: spoiler
                  ? []
                  : list
                    ? block.split('\n').map((line) => line.replace(/^(?:- |\d+\. )/, ''))
                    : [block]
              }
            })
        }
      })
  }
}

export function inlineTokens(text: string) {
  return text
    .split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`| {2,}\r?\n)/g)
    .filter(Boolean)
    .map((value) => {
      if (/^ {2,}\r?\n$/.test(value)) return { kind: 'break', text: '' }
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(value)
      if (link)
        return {
          kind: /^https?:\/\//.test(link[2]!) ? 'link' : 'text',
          text: link[1]!,
          href: link[2]
        }
      if (value.startsWith('**')) return { kind: 'strong', text: value.slice(2, -2) }
      if (value.startsWith('`')) return { kind: 'code', text: value.slice(1, -1) }
      return { kind: 'text', text: value }
    })
}
