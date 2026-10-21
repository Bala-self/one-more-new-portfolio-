"""Set real canonical/share URLs and write sitemap.xml, without a build tool.
Run from any directory: python scripts/configure_domain.py https://your-real-domain.in
The site must be served from the domain root (Cloudflare Pages/Netlify recommended).
"""
import sys, re, json
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape
root = Path(__file__).resolve().parent.parent
if len(sys.argv) != 2:
    raise SystemExit('Usage: python scripts/configure_domain.py https://your-real-domain.in')
origin = sys.argv[1].rstrip('/')
u = urlparse(origin)
if u.scheme != 'https' or not u.netloc or u.path or u.query or u.fragment:
    raise SystemExit('Supply an HTTPS domain origin, without a path/query/fragment.')
for relative, route in [('index.html','/'),('work/billpro/index.html','/work/billpro/')]:
    path = root / relative
    html = path.read_text()
    html = re.sub(r'<link[^>]*rel="canonical"[^>]*>', '', html)
    html = re.sub(r'<meta[^>]*property="og:url"[^>]*>', '', html)
    html = re.sub(r'<meta[^>]*property="og:image"[^>]*>', '', html)
    html = re.sub(r'<meta[^>]*content="[^"]*"[^>]*property="og:image"[^>]*>', '', html)
    html = html.replace('</head>', f'<link rel="canonical" href="{origin}{route}"><meta property="og:url" content="{origin}{route}"><meta property="og:image" content="{origin}/assets/og.png"></head>')
    def person(m):
        data=json.loads(m.group(1));data['url']=origin+'/'
        return '<script type="application/ld+json">'+json.dumps(data)+'</script>'
    html=re.sub(r'<script type="application/ld\+json">(.*?)</script>',person,html,flags=re.S)
    path.write_text(html)
(root/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join(f'<url><loc>{escape(origin+route)}</loc></url>' for route in ['/','/work/billpro/'])+'</urlset>\n')
(root/'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {origin}/sitemap.xml\n')
print('Updated canonical URLs, Person URL, social image URLs, robots.txt and sitemap.xml.')
