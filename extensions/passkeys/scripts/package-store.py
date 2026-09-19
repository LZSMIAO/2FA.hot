"""Package only built extension files, and a separate source archive for AGPL compliance."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json
import shutil

root = Path(__file__).resolve().parents[1]
dist = root / 'dist-store'
manifest = json.loads((dist / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert all('localhost' not in match for script in manifest['content_scripts'] for match in script['matches'])
for icon in manifest['icons'].values(): assert (dist / icon).is_file()
for file in ('background.js', 'content.js', 'page.js', 'site-bridge.js', 'ui.js', 'ui.html', 'privacy.html'):
    assert (dist / file).is_file(), file

output = root / 'output'
output.mkdir(exist_ok=True)
version = manifest['version']

def archive(path, entries):
    with ZipFile(path, 'w', ZIP_DEFLATED) as z:
        for name, file in sorted(entries):
            info = ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, file.read_bytes())
    with ZipFile(path) as z: assert z.testzip() is None

package = output / f'2fa-hot-passkeys-{version}-store.zip'
archive(package, [(str(p.relative_to(dist)), p) for p in dist.rglob('*') if p.is_file()])
preview_dist = root / 'dist-preview'
preview_manifest = json.loads((preview_dist / 'manifest.json').read_text())
assert preview_manifest['version'] == version
for script in preview_manifest['content_scripts']:
    if any('localhost' in match for match in script['matches']):
        assert script['js'] == ['site-bridge.js']
assert any('http://localhost/*' in script['matches'] for script in preview_manifest['content_scripts'])
preview_package = output / f'2fa-hot-passkeys-{version}-preview.zip'
archive(preview_package, [(str(p.relative_to(preview_dist)), p) for p in preview_dist.rglob('*') if p.is_file()])
source = []
for name in ('src', 'static', 'scripts', 'tests'):
    source.extend((f'extensions/passkeys/{p.relative_to(root)}', p) for p in (root / name).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ('package.json', 'pnpm-lock.yaml', 'build.mjs', 'README.md'):
    source.append((f'extensions/passkeys/{name}', root / name))
source.extend([('LICENSE', root.parents[1] / 'LICENSE'), ('public/passkeys-privacy.html', root.parents[1] / 'public/passkeys-privacy.html')])
source_package = output / f'2fa-hot-passkeys-{version}-source.zip'
archive(source_package, source)
for path in (package, preview_package, source_package):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    path.with_suffix('.zip.sha256').write_text(f'{digest}  {path.name}\n')
    print(f'{path.name}: {path.stat().st_size} bytes, SHA-256 {digest}')

# Ship ready-to-load binaries with the website; visitors never need a build toolchain.
downloads = root.parents[1] / 'public/downloads/passkeys'
downloads.mkdir(parents=True, exist_ok=True)
download = downloads / f'2fa-hot-passkeys-{version}.zip'
source_download = downloads / source_package.name
preview_download = downloads / preview_package.name
shutil.copyfile(package, download)
shutil.copyfile(preview_package, preview_download)
shutil.copyfile(source_package, source_download)
(root.parents[1] / 'shared/passkeys-release.json').write_text(json.dumps({
    'version': version,
    'download': f'/downloads/passkeys/{download.name}',
    'localDownload': f'/downloads/passkeys/{preview_download.name}',
    'source': f'/downloads/passkeys/{source_download.name}',
    'sha256': hashlib.sha256(download.read_bytes()).hexdigest(),
    'localSha256': hashlib.sha256(preview_download.read_bytes()).hexdigest(),
    'sourceSha256': hashlib.sha256(source_download.read_bytes()).hexdigest(),
}, indent=2) + '\n')
