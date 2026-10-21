"""Check local HTML/CSS/module references and measure shipped native JavaScript."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re, json, gzip
ROOT = Path(__file__).resolve().parents[1]
references, errors = [], []
def check(value, source):
    u = urlsplit(value)
    if u.scheme or u.netloc or not u.path:
        return
    path = (ROOT / unquote(u.path).lstrip('/')) if u.path.startswith('/') else source.parent / unquote(u.path)
    if path.is_dir(): path = path / 'index.html'
    entry = {'source': str(source.relative_to(ROOT)), 'path': u.path}
    references.append(entry)
    if not path.is_file(): errors.append(entry)
class Parser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href') and value: check(value, self.source)
            elif key == 'srcset' and value:
                for item in value.split(','): check(item.strip().split()[0], self.source)
for source in ROOT.rglob('*.html'):
    parser = Parser(); parser.source = source; parser.feed(source.read_text())
for source in (ROOT / 'css').glob('*.css'):
    for groups in re.findall(r'''url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)''', source.read_text()):
        check(next((x for x in groups if x), '').strip(), source)
for source in (ROOT / 'js').glob('*.js'):
    for value in re.findall(r'''(?:from|import)\s*["']([^"']+)''', source.read_text()):
        if value.startswith('.'): check(value, source)
modules = list((ROOT / 'js').glob('*.js'))
report = {'static_references': len(references), 'broken_local_references': errors,
          'javascript': {'files': len(modules), 'raw_bytes': sum(p.stat().st_size for p in modules),
                         'gzip_bytes_summed_per_file': sum(len(gzip.compress(p.read_bytes(), mtime=0)) for p in modules)}}
print(json.dumps(report, indent=2))
assert not errors, 'Broken local references'
