import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const bootstrap = readFileSync(new URL('../public/panorama-preference.js', import.meta.url), 'utf8')
function restore(cookie: string, angle: string | null) {
  const styles = new Map<string, string>()
  vm.runInNewContext(bootstrap, {
    document: {
      cookie,
      documentElement: {
        style: { setProperty: (key: string, value: string) => styles.set(key, value) }
      }
    },
    localStorage: { getItem: () => angle }
  })
  return styles
}

test('first paint restores both Nuxt-quoted and plain scene cookies', () => {
  for (const value of ['%221.21%22', '1.21']) {
    const styles = restore(`2fa-panorama=${value}`, '127.5')
    assert.equal(styles.get('--panorama-face-0'), 'url(/panorama/1.21/panorama_0.webp)')
    assert.equal(styles.get('--panorama-angle'), '127.5deg')
  }
  assert.equal(
    restore('2fa-panorama=1.20.1', '0').get('--panorama-face-5'),
    'url(/panorama/panorama_5.webp)'
  )
})

test('invalid scene does not discard a saved angle; malformed angles never enter CSS', () => {
  assert.equal(restore('2fa-panorama=invalid', '90').get('--panorama-angle'), '90deg')
  for (const angle of ['NaN', '-1', '360', '1; color:red'])
    assert.equal(restore('', angle).has('--panorama-angle'), false)
})
