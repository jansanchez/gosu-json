from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from hashlib import sha256
root=Path(__file__).resolve().parents[1]
out=root/'releases';out.mkdir(exist_ok=True)
for browser in ('chromium','edge','firefox','safari'):
    folder=root/'dist'/browser
    if not folder.exists():raise SystemExit('Run npm run build first.')
    with ZipFile(out/f'gosu-json-{browser}-0.4.2.zip','w',ZIP_DEFLATED) as z:
        for p in sorted(folder.rglob('*')):
            if p.is_file():z.write(p,p.relative_to(folder))
with ZipFile(out/'gosu-json-source-0.4.2.zip','w',ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file() and not any(x in p.relative_to(root).parts for x in ('releases','.git','node_modules','artifacts','build')):
            z.write(p,Path('gosu-json')/p.relative_to(root))
print('Packaged source and all browser builds in releases/')

with (out/'SHA256SUMS.txt').open('w') as checksums:
    for p in sorted(out.glob('gosu-json-*-0.4.2.zip')):
        checksums.write(f"{sha256(p.read_bytes()).hexdigest()}  {p.name}\n")
