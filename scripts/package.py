from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
import json
import re
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
if not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', version):
    raise SystemExit('Expected a numeric major.minor.patch version in package.json.')
# Validate every build before writing any release archives.
for browser in ('chromium','edge','firefox','safari'):
    manifest=root/'dist'/browser/'manifest.json'
    if not manifest.exists() or json.loads(manifest.read_text())['version'] != version:
        raise SystemExit(f'Stale or missing {browser} build. Run make build first.')
out=root/'releases';out.mkdir(exist_ok=True)
for browser in ('chromium','edge','firefox','safari'):
    folder=root/'dist'/browser
    if not folder.exists():raise SystemExit('Run npm run build first.')
    with ZipFile(out/f'gosu-json-{browser}-{version}.zip','w',ZIP_DEFLATED) as z:
        for p in sorted(folder.rglob('*')):
            if p.is_file():z.write(p,p.relative_to(folder))
with ZipFile(out/f'gosu-json-source-{version}.zip','w',ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file() and not any(x in p.relative_to(root).parts for x in ('releases','.git','node_modules','artifacts','build','.venv','__pycache__')):
            z.write(p,Path('gosu-json')/p.relative_to(root))
print('Packaged source and all browser builds in releases/')

with (out/'SHA256SUMS.txt').open('w') as checksums:
    for p in sorted(out.glob(f'gosu-json-*-{version}.zip')):
        checksums.write(f"{sha256(p.read_bytes()).hexdigest()}  {p.name}\n")
