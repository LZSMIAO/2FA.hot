import 'fake-indexeddb/auto'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { panoramaScenes } from '../app/composables/usePanoramaPreference.ts'
import {
  customPanoramaFromFiles,
  loadCustomPanorama,
  removeCustomPanorama,
  saveCustomPanorama
} from '../app/utils/custom-panorama.ts'

const root = new URL('../', import.meta.url)
const facePath = (scene: string, face: number) =>
  `public/panorama/${scene === '1.20.1' ? '' : `${scene}/`}panorama_${face}.png`

test('every scene ships six credited faces and a preview, listed in the pre-paint script', () => {
  const script = readFileSync(new URL('public/panorama-preference.js', root), 'utf8')
  const listed = [...script.matchAll(/^\s+'([\d.]+)',?$/gm)].map((match) => match[1])
  assert.deepEqual(listed, [...panoramaScenes])
  const credits = readFileSync(new URL('credits/PANORAMA-SOURCE.md', root), 'utf8')
  for (const scene of panoramaScenes) {
    assert.ok(existsSync(new URL(`public/panorama/previews/${scene}.png`, root)), scene)
    for (let face = 0; face < 6; face++) {
      const path = facePath(scene, face)
      const hash = createHash('sha1')
        .update(readFileSync(new URL(path, root)))
        .digest('hex')
      // Credits name each file with its official SHA-1, so a swapped file shows up here.
      const name = path.replace('public/panorama/', '')
      assert.match(
        credits,
        new RegExp(
          '`' + name.replaceAll('.', '\\.') + '`: \\d+ bytes; (verified )?SHA-1 `' + hash + '`'
        ),
        path
      )
    }
  }
})

test('a custom background is one still image or six faces in panorama order', () => {
  const file = (name: string, type = 'image/png', size = 1000) => ({ name, type, size })
  assert.deepEqual(customPanoramaFromFiles([file('photo.jpg', 'image/jpeg')]).layout, 'flat')
  const faces = [
    'panorama_3.png',
    'panorama_0.png',
    'panorama_5.png',
    'panorama_1.png',
    'panorama_4.png',
    'panorama_2.png'
  ].map((name) => file(name))
  const cube = customPanoramaFromFiles(faces)
  assert.equal(cube.layout, 'cube')
  assert.deepEqual(
    cube.images.map((image) => image.name),
    [
      'panorama_0.png',
      'panorama_1.png',
      'panorama_2.png',
      'panorama_3.png',
      'panorama_4.png',
      'panorama_5.png'
    ]
  )
  // Without a 0-5 index in every name, the faces keep their natural name order.
  const named = ['b10.png', 'b2.png', 'b1.png', 'b3.png', 'b4.png', 'b5.png'].map((name) =>
    file(name)
  )
  assert.deepEqual(
    customPanoramaFromFiles(named).images.map((image) => image.name),
    ['b1.png', 'b2.png', 'b3.png', 'b4.png', 'b5.png', 'b10.png']
  )
  assert.throws(() => customPanoramaFromFiles(faces.slice(0, 2)), /6 张全景面/)
  assert.throws(
    () => customPanoramaFromFiles([file('scene.gif', 'image/gif')]),
    /PNG、JPEG 或 WebP/
  )
  assert.throws(() => customPanoramaFromFiles([file('huge.png', 'image/png', 10_000_001)]), /10MB/)
})

test('a custom background persists locally until it is removed', async () => {
  assert.equal(await loadCustomPanorama(), null)
  const image = new Blob(['pixels'], { type: 'image/png' })
  await saveCustomPanorama({ layout: 'flat', images: [image] })
  const stored = await loadCustomPanorama()
  assert.equal(stored?.layout, 'flat')
  assert.equal(await stored?.images[0]?.text(), 'pixels')
  await removeCustomPanorama()
  assert.equal(await loadCustomPanorama(), null)
})
