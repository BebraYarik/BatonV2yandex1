"""Build an allowlisted, dependency-free Yandex Games archive."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import re
import shutil
root = Path(__file__).resolve().parents[1]
out = root / 'dist'
out.mkdir(exist_ok=True)
files = [root / 'index.html']
for directory in ['css', 'js', 'assets']:
    files.extend(sorted(p for p in (root / directory).rglob('*') if p.is_file()))
assert all(re.fullmatch(r'[a-zA-Z0-9_./-]+', p.relative_to(root).as_posix()) for p in files)
assert sum(p.stat().st_size for p in files) <= 100 * 1024 * 1024
archive = out / 'baton-yandex-release.zip'
with ZipFile(archive, 'w', ZIP_DEFLATED) as z:
    for p in files:
        info = ZipInfo(p.relative_to(root).as_posix(), (2026, 11, 5, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, p.read_bytes())
with ZipFile(archive) as z:
    assert 'index.html' in z.namelist()
    assert 'sdk.js' not in z.namelist()
    assert not any(n.startswith(('tests/', 'node_modules/', 'reference/')) for n in z.namelist())
    assert z.testzip() is None
    build = out / 'game'
    if build.exists(): shutil.rmtree(build)
    z.extractall(build)
# Local references and ES module imports must resolve inside the unpacked build.
for p in build.rglob('*'):
    if p.suffix not in ['.html', '.js', '.css']: continue
    source = p.read_text()
    refs = re.findall(r'(?:src|href)=[\'\"]([^\'\"]+)[\'\"]', source) if p.suffix == '.html' else []
    if p.suffix == '.js': refs += re.findall(r'from\s+[\'\"](\.[^\'\"]+)[\'\"]', source)
    for ref in refs:
        if ref.startswith(('/', 'data:', 'http:', 'https:', '#')): continue
        assert (p.parent / ref).is_file(), f'Missing {ref} in {p.name}'
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(out / 'sha256.txt').write_text(digest + '  baton-yandex-release.zip\n')
release = root / 'releases'
release.mkdir(exist_ok=True)
shutil.copy2(archive, release / archive.name)
shutil.copy2(out / 'sha256.txt', release / 'sha256.txt')
print(f'{archive}: {archive.stat().st_size:,} bytes; {len(files)} files; SHA256 {digest}')
