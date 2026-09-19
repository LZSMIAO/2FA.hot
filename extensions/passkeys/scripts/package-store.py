"""Package only built extension files, and a separate source archive for AGPL compliance."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json

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
source = []
for name in ('src', 'static', 'scripts', 'tests'):
    source.extend((f'extensions/passkeys/{p.relative_to(root)}', p) for p in (root / name).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
for name in ('package.json', 'pnpm-lock.yaml', 'build.mjs', 'README.md'):
    source.append((f'extensions/passkeys/{name}', root / name))
source.extend([('LICENSE', root.parents[1] / 'LICENSE'), ('public/passkeys-privacy.html', root.parents[1] / 'public/passkeys-privacy.html')])
source_package = output / f'2fa-hot-passkeys-{version}-source.zip'
archive(source_package, source)
for path in (package, source_package):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    path.with_suffix('.zip.sha256').write_text(f'{digest}  {path.name}\n')
    print(f'{path.name}: {path.stat().st_size} bytes, SHA-256 {digest}')
