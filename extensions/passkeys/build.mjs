import { build } from 'esbuild'
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
const storeBuild = process.argv.includes('--store')
const outdir = storeBuild ? 'dist-store' : 'dist'
const output = new URL(`./${outdir}/`, import.meta.url)
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(new URL('./static/', import.meta.url), output, {
  recursive: true
})
if (storeBuild) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'))
  for (const script of manifest.content_scripts)
    script.matches = script.matches.filter((match) => !match.includes('localhost'))
  await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n')
}
await cp(
  new URL('../../public/passkeys-privacy.html', import.meta.url),
  new URL('privacy.html', output)
)
await mkdir(new URL('licenses/', output), { recursive: true })
await cp(new URL('../../LICENSE', import.meta.url), new URL('licenses/2fa-hot-LICENSE', output))
await cp(
  new URL('./node_modules/tldts/LICENSE', import.meta.url),
  new URL('licenses/tldts-LICENSE', output)
)
const require = createRequire(import.meta.url)
const tldtsRequire = createRequire(require.resolve('tldts/package.json'))
await cp(
  join(dirname(tldtsRequire.resolve('tldts-core/package.json')), 'LICENSE'),
  new URL('licenses/tldts-core-LICENSE', output)
)
await build({
  entryPoints: [
    'src/background.js',
    'src/content.js',
    'src/page.js',
    'src/ui.js',
    'src/site-bridge.js'
  ],
  outdir,
  define: { __PASSKEYS_STORE_BUILD__: JSON.stringify(storeBuild) },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  legalComments: 'eof',
  sourcemap: false
})
