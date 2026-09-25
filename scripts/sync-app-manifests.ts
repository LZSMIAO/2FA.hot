/*
 * Writes public/app-manifest/<locale>.webmanifest from shared/app-manifest.ts
 * and the translations. Run after changing either:
 *   node --experimental-strip-types scripts/sync-app-manifests.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { supportedLocales } from '../shared/locales.ts'
import { sourceKeys } from '../shared/message-keys.ts'
import { appManifest, manifestCopy, type ManifestCopy } from '../shared/app-manifest.ts'

const root = new URL('../', import.meta.url)
mkdirSync(new URL('public/app-manifest/', root), { recursive: true })
for (const { code } of supportedLocales) {
  const messages = JSON.parse(
    readFileSync(new URL(`i18n/locales/${code}.json`, root), 'utf8')
  ) as Record<string, string>
  const copy: ManifestCopy = manifestCopy((source) => messages[sourceKeys.get(source)!]!)
  writeFileSync(
    new URL(`public/app-manifest/${code}.webmanifest`, root),
    JSON.stringify(appManifest(code, copy), null, 2) + '\n'
  )
}
console.log(`Wrote ${supportedLocales.length} app manifests.`)
