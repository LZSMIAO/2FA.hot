import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import ts from 'typescript'
import { parse, compileTemplate } from 'vue/compiler-sfc'

const source = new Set(
  Object.values(
    JSON.parse(readFileSync(new URL('../i18n/locales/zh-CN.json', import.meta.url), 'utf8'))
  )
)
function files(path: URL): URL[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), path)
    return entry.isDirectory() ? files(url) : /\.(vue|ts)$/.test(entry.name) ? [url] : []
  })
}

test('application text and error sources are present in the translation catalog', () => {
  const missing: string[] = []
  // These are Chinese pronunciation substitutions, applied only to Chinese narration.
  const spokenTerms = new Set(['本站', '谷歌验证器', '验证器', '双重验证', '应用', '二维'])
  for (const file of files(new URL('../app/', import.meta.url))) {
    let content = readFileSync(file, 'utf8')
    if (file.pathname.endsWith('.vue')) {
      const { descriptor } = parse(content)
      content = [
        descriptor.script?.content,
        descriptor.scriptSetup?.content,
        descriptor.template
          ? compileTemplate({
              source: descriptor.template.content,
              filename: file.pathname,
              id: 'message-audit'
            }).code
          : ''
      ]
        .filter(Boolean)
        .join('\n')
    }
    const ast = ts.createSourceFile(
      file.pathname,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    )
    function visit(node: ts.Node) {
      if (
        ts.isStringLiteral(node) &&
        /[\u3400-\u9fff]/u.test(node.text) &&
        !source.has(node.text)
      ) {
        if (!(file.pathname.endsWith('/guide-narration.ts') && spokenTerms.has(node.text)))
          missing.push(`${file.pathname}: ${node.text}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  assert.deepEqual(missing, [])
})
