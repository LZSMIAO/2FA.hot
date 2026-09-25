import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../public/theme-favicon.js', import.meta.url), 'utf8')
function iconFor(theme: string | null | Error) {
  const icon = {
    href: '/favicon.svg',
    setAttribute: (_: string, value: string) => (icon.href = value)
  }
  const localStorage = {
    getItem: () => {
      if (theme instanceof Error) throw theme
      return theme
    }
  }
  const document = {
    querySelector: (selector: string) => (selector === 'link[rel="icon"]' ? icon : null)
  }
  vm.runInNewContext(code, { localStorage, document })
  return icon.href
}

test('a chosen theme gets its sun or moon before the first paint', () => {
  assert.equal(iconFor('light'), '/favicon-light.svg')
  assert.equal(iconFor('dark'), '/favicon-dark.svg')
})

test('following the system, or no readable choice, keeps the grass-block key', () => {
  assert.equal(iconFor('system'), '/favicon.svg')
  assert.equal(iconFor(null), '/favicon.svg')
  assert.equal(iconFor('sepia'), '/favicon.svg')
  assert.equal(iconFor(new Error('blocked')), '/favicon.svg')
})

test('the icon link is placed ahead of the script that rewrites it', () => {
  const config = readFileSync(new URL('../nuxt.config.ts', import.meta.url), 'utf8')
  assert.match(config, /'theme-favicon\.js'/)
  // Blocking scripts weigh 50 in unhead's head order; the icon must come first.
  const priority = Number(/key: 'site-favicon'[\s\S]*?tagPriority: (\d+)/.exec(config)?.[1])
  assert.ok(priority < 50)
})
