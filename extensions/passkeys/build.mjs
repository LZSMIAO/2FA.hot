import { build } from 'esbuild'
import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
const firefoxBuild = process.argv.includes('--firefox')
// A Firefox build ships like a store build: no localhost access.
const storeBuild = process.argv.includes('--store') || firefoxBuild
const previewBuild = process.argv.includes('--preview')
const outdir = firefoxBuild
  ? 'dist-firefox'
  : storeBuild
    ? 'dist-store'
    : previewBuild
      ? 'dist-preview'
      : 'dist'
const output = new URL(`./${outdir}/`, import.meta.url)
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(new URL('./static/', import.meta.url), output, {
  recursive: true
})
if (storeBuild || previewBuild) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'))
  for (const script of manifest.content_scripts) {
    // Local preview adds only status/open-UI bridging, not localhost credential interception.
    if (previewBuild && script.js.includes('site-bridge.js')) continue
    script.matches = script.matches.filter((match) => !match.includes('localhost'))
  }
  // The in-page prompt is loadable only where the credential scripts run.
  for (const entry of manifest.web_accessible_resources ?? [])
    entry.matches = entry.matches.filter((match) => !match.includes('localhost'))
  await writeFile(new URL('manifest.json', output), JSON.stringify(manifest, null, 2) + '\n')
}
/*
 * Firefox takes the same MV3 code with an event-page background, its own add-on
 * ID, and no Chrome-only keys. It is built and linted here but not yet tested in
 * a running Firefox; see README.
 */
if (firefoxBuild) {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'))
  delete manifest.minimum_chrome_version
  manifest.background = { scripts: ['background.js'] }
  manifest.browser_specific_settings = {
    gecko: {
      id: 'passkeys@2fa.hot',
      strict_min_version: '128.0',
      // Nothing leaves the device: no telemetry, no vault upload.
      data_collection_permissions: { required: ['none'] }
    }
  }
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
    'src/prompt.js',
    'src/site-bridge.js'
  ],
  outdir,
  define: {
    __PASSKEYS_STORE_BUILD__: JSON.stringify(storeBuild),
    __PASSKEYS_FIREFOX__: JSON.stringify(firefoxBuild)
  },
  bundle: true,
  format: 'iife',
  target: firefoxBuild ? 'firefox128' : 'chrome120',
  legalComments: 'eof',
  sourcemap: false
})
