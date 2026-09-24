import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

const bootstrap = readFileSync(new URL('../public/panorama-preference.js', import.meta.url), 'utf8')
function visit(cookie: string, stored: Record<string, string>, cookiesWork = true) {
  const styles = new Map<string, string>()
  const attributes = new Set<string>()
  const jar = new Map(
    cookie
      .split('; ')
      .filter(Boolean)
      .map((pair) => [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)])
  )
  const data = new Map(Object.entries(stored))
  vm.runInNewContext(bootstrap, {
    document: {
      get cookie() {
        return [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
      },
      set cookie(value: string) {
        const pair = value.split(';')[0]!
        if (cookiesWork)
          jar.set(pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1))
      },
      documentElement: {
        style: { setProperty: (key: string, value: string) => styles.set(key, value) },
        setAttribute: (name: string) => void attributes.add(name)
      }
    },
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, String(value))
    }
  })
  return { styles, attributes, jar, data }
}
// A returning browser, as first-visit.js marks one, with a kept angle.
const restore = (cookie: string, angle: string | null) =>
  visit(cookie, {
    '2fa-first-visit': '0',
    ...(angle === null ? {} : { '2fa-panorama-angle': angle })
  }).styles

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

test('a new visitor opens on the 26.1 cherry grove at its chosen angle, kept as a setting', () => {
  // With no cookie yet, or with the default the server wrote along with the first page.
  for (const cookie of ['', '2fa-panorama=1.20.1']) {
    const { styles, jar, data } = visit(cookie, { '2fa-first-visit': String(Date.now()) })
    assert.equal(styles.get('--panorama-face-0'), 'url(/panorama/26.1/panorama_0.webp)')
    assert.equal(styles.get('--panorama-angle'), '90deg')
    // Quoted as Nuxt writes it, so the page reads the scene back as a string.
    assert.equal(jar.get('2fa-panorama'), '%2226.1%22')
    assert.equal(data.get('2fa-panorama-angle'), '90')
  }
})

test('returning visitors and new visitors with settings keep what they had', () => {
  // Marked returning by first-visit.js: the old default stays, nothing is written.
  const returning = visit('2fa-panorama=1.20.1', { '2fa-first-visit': '0' })
  assert.equal(returning.styles.get('--panorama-face-0'), 'url(/panorama/panorama_0.webp)')
  assert.equal(returning.jar.get('2fa-panorama'), '1.20.1')
  assert.equal(returning.data.has('2fa-panorama-angle'), false)
  // A new visitor who already turned the scene or picked another one.
  const turned = visit('', { '2fa-first-visit': '1700000000000', '2fa-panorama-angle': '12' })
  assert.equal(turned.styles.has('--panorama-face-0'), false)
  assert.equal(turned.styles.get('--panorama-angle'), '12deg')
  const picked = visit('2fa-panorama=%221.21%22', { '2fa-first-visit': '1700000000000' })
  assert.equal(picked.styles.get('--panorama-face-0'), 'url(/panorama/1.21/panorama_0.webp)')
  assert.equal(picked.data.has('2fa-panorama-angle'), false)
  // Blocked cookies cannot keep the scene, so no angle is kept for it either.
  const blocked = visit('', { '2fa-first-visit': String(Date.now()) }, false)
  assert.equal(blocked.styles.has('--panorama-face-0'), false)
  assert.equal(blocked.data.has('2fa-panorama-angle'), false)
})

test('a still scene is laid out before first paint, cropped around its subject', () => {
  const { styles, attributes } = visit('2fa-panorama=senren%2Fyoshino-kagura', {
    '2fa-first-visit': '0'
  })
  assert.ok(attributes.has('data-panorama-flat'))
  assert.equal(styles.get('--panorama-flat'), 'url(/panorama/senren/yoshino-kagura.webp)')
  assert.equal(styles.get('--panorama-flat-position'), '52% 15%')
  // The cube's faces are not fetched for a still scene.
  assert.equal(styles.get('--panorama-face-0'), 'none')
  // A name outside the list is not treated as a still scene.
  assert.equal(
    visit('2fa-panorama=senren%2F..%2Fsecret', { '2fa-first-visit': '0' }).attributes.size,
    0
  )
})
