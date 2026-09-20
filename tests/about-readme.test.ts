import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseAboutReadme, inlineTokens } from '../app/utils/about-readme.ts'

test('all three README files provide live website content without repository chrome', () => {
  for (const name of ['README.md', 'docs/readme/README.zh-CN.md', 'docs/readme/README.en.md']) {
    const source = readFileSync(name, 'utf8')
    const result = parseAboutReadme(source)
    assert.equal(result.sections.length, 4)
    assert.ok(result.introduction[0]?.includes('Minecraft'))
    assert.ok(!JSON.stringify(result).includes('img.shields.io'))
    assert.ok(JSON.stringify(result).includes('https://github.com/LZSMIAO'))
    const stories = result.sections.flatMap((section) => section.blocks).filter((b) => b.spoiler)
    assert.equal(stories.length, 0)
    assert.ok(!JSON.stringify(result).includes('BOOM'))
    assert.ok(
      JSON.stringify(parseAboutReadme(source.replace('HTTP', 'SYNC_TEST'))).includes('SYNC_TEST')
    )
  }
})
test('inline formatting preserves safe links, never renders arbitrary HTML', () => {
  assert.equal(inlineTokens('[Privacy](https://2fa.hot/privacy)')[0]?.kind, 'link')
  assert.equal(inlineTokens('[bad](javascript:alert)')[0]?.kind, 'text')
  assert.equal(inlineTokens('<script>bad</script>')[0]?.kind, 'text')
  assert.equal(inlineTokens('**2FA®**')[0]?.kind, 'strong')
})

test('Markdown hard breaks stay within one paragraph while soft breaks remain text', () => {
  assert.deepEqual(inlineTokens('first  \nsecond'), [
    { kind: 'text', text: 'first' },
    { kind: 'break', text: '' },
    { kind: 'text', text: 'second' }
  ])
  assert.deepEqual(inlineTokens('first\nsecond'), [{ kind: 'text', text: 'first\nsecond' }])
  for (const name of ['README.md', 'docs/readme/README.zh-CN.md', 'docs/readme/README.en.md']) {
    const result = parseAboutReadme(readFileSync(name, 'utf8'))
    const domain = result.sections[2]!
    assert.equal(domain.blocks.length, 1)
    assert.equal(
      inlineTokens(domain.blocks[0]!.lines[0]!).filter((t) => t.kind === 'break').length,
      2
    )
    assert.ok(result.sections[0]!.blocks.at(-1)!.lines[0]!.includes('/waitlist'))
  }
})
