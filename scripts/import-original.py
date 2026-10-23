"""One-time migration of Mingyang's public portfolio and its original assets."""
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import html, json, re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://www.myangsun.com'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Element:
    def __init__(self, tag, attrs=(), parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []
    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk()
    def has(self, name):
        return name in self.attrs.get('class','').split()
    def text(self):
        return ''.join(c.text() if isinstance(c,Element) else c for c in self.children)

class Parser(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Element('root')
        self.feed(source)
    def handle_starttag(self, tag, attrs):
        child = Element(tag, attrs, self.current)
        self.current.children.append(child)
        if tag not in VOID:
            self.current = child
    def handle_endtag(self, tag):
        cur = self.current
        while cur.parent:
            if cur.tag == tag:
                self.current = cur.parent
                return
            cur = cur.parent
    def handle_data(self, data):
        self.current.children.append(data)

def fetch(url):
    with urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (portfolio migration)'}), timeout=40) as response:
        return response.read()

def clean(text):
    return re.sub(r'\s+',' ',text).strip()

def safe_url(url):
    return urljoin(ORIGIN,url) if url.startswith(('/', 'https://', 'http://')) else url

def inline(el):
    if isinstance(el,str):
        return html.escape(el)
    inside=''.join(inline(c) for c in el.children)
    if el.tag=='a':
        url=safe_url(el.attrs.get('href',''))
        return f'<a href="{html.escape(url,quote=True)}" rel="noopener noreferrer">{inside}</a>' if url.startswith(('https://','http://','mailto:','/','#')) else inside
    if el.tag in {'em','strong','b','i','code','br','sup','sub'}:
        return f'<{el.tag}>{inside}</{el.tag}>' if el.tag!='br' else '<br>'
    return inside

def text_blocks(node):
    result=[]
    for el in node.walk():
        if el.tag in {'h1','h2','h3','h4','p','li'} and clean(el.text()):
            tag='p' if el.tag=='li' else el.tag
            result.append(f'<{tag}>{inline(el)}</{tag}>')
    return '\n'.join(result)

jobs=[]
assets={}
def asset(url, stem, width='1500w'):
    url=safe_url(url)
    if url in assets:
        return assets[url]
    ext=Path(urlparse(url).path).suffix.lower()
    if ext not in {'.jpg','.jpeg','.png','.gif','.webp','.svg'}:
        ext='.jpg'
    local=f'/assets/{stem}{ext}'
    assets[url]=local
    request_url=url
    if 'squarespace-cdn.com' in url and ext!='.gif':
        request_url=url.split('?')[0]+'?format='+width
    jobs.append((request_url, ROOT/'public'/local.lstrip('/')))
    return local

def grid(name, category):
    tree=Parser((ROOT/'reference'/f'{name}.html').read_text()).root
    items=[]
    for a in tree.walk():
        if a.tag!='a' or not a.has('grid-item'):
            continue
        image=next((x for x in a.walk() if x.tag=='img'),None)
        title=next((clean(x.text()) for x in a.walk() if x.has('portfolio-title')), '')
        if not title:
            title=clean(a.text()) or (image.attrs.get('alt','') if image else '')
        path=a.attrs['href']
        slug=path.strip('/').split('/')[-1]
        items.append({'title':title,'slug':slug,'category':category,'originalPath':path,'sourceUrl':ORIGIN+path,'cover':asset(image.attrs.get('data-src') or image.attrs['src'],slug+'-cover','1000w') if image else ''})
    return items

def main():
    items=grid('home','projects')+grid('design','design')
    
    def detail(item):
        raw=fetch(item['sourceUrl']).decode()
        (ROOT/'reference'/f"{item['slug']}.html").write_text(raw)
        tree=Parser(raw).root
        main=next((x for x in tree.walk() if x.tag=='main'),tree)
        blocks=[]
        img_index=0
        for el in main.walk():
            if el.has('sqs-html-content'):
                content=text_blocks(el)
                if content:
                    blocks.append({'type':'text','html':content})
            elif el.tag=='img':
                url=el.attrs.get('data-src') or el.attrs.get('src','')
                if not url or 'logo.gif' in url:
                    continue
                ancestor=el.parent
                if any(x in ancestor.attrs.get('class','') for x in ['pagination','header','footer']):
                    continue
                alt=el.attrs.get('alt','')
                blocks.append({'type':'image','src':asset(url,f"{item['slug']}-{img_index}"),'alt':alt or item['title']})
                img_index+=1
            elif el.tag=='iframe':
                url=safe_url(el.attrs.get('src',''))
                if url.startswith('https://'):
                    blocks.append({'type':'embed','src':url,'title':el.attrs.get('title') or item['title']+' video'})
            elif el.has('sqs-block-button-element'):
                url=safe_url(el.attrs.get('href',''))
                if url.startswith(('https://','http://')):
                    blocks.append({'type':'link','href':url,'label':clean(el.text()) or 'Project link'})
        text_nodes=[x for x in main.walk() if x.tag=='p' and len(clean(x.text()))>90]
        subtitles=[clean(x.text()) for x in main.walk() if x.tag in {'h3','h4'} and 20<len(clean(x.text()))<200]
        item['summary']=subtitles[0] if subtitles else (clean(text_nodes[0].text()) if text_nodes else '')
        if len(item['summary'])>300:
            short=item['summary'][:300]
            stop=short.rfind('. ')
            item['summary']=short[:stop+1] if stop>90 else short.rsplit(' ',1)[0]+'…'
        item['blocks']=blocks
        return item
    
    with ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(detail,items))
    
    tree=Parser((ROOT/'reference'/'home.html').read_text()).root
    logo=next(x for x in tree.walk() if x.tag=='img' and x.attrs.get('alt')=='Mingyang Sun')
    asset(logo.attrs['src'],'logo')
    
    def download(job):
        url,path=job
        path.parent.mkdir(parents=True,exist_ok=True)
        if not path.exists():
            path.write_bytes(fetch(url))
        return path.stat().st_size
    
    with ThreadPoolExecutor(max_workers=8) as pool:
        total=sum(pool.map(download,jobs))
    
    (ROOT/'src'/'data').mkdir(parents=True,exist_ok=True)
    (ROOT/'src'/'data'/'portfolio.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print(json.dumps({'projects':sum(x['category']=='projects' for x in results),'design':sum(x['category']=='design' for x in results),'assets':len(jobs),'megabytes':round(total/1024/1024,1)}))
    
    # Keep a small copy of source theme data for faithful local implementation.
    raw=(ROOT/'reference'/'home.html').read_text()
    css_urls=re.findall(r'<link[^>]+href="([^"]+site\.css[^" ]*)"',raw)
    if css_urls:
        css=fetch(safe_url(css_urls[-1])).decode()
        (ROOT/'reference'/'original.css').write_text(css)
        print('THEME:',re.findall(r'--(?:heading|body)-font-font-family:[^;]+|--(?:siteBackgroundColor|paragraphMediumColor):[^;]+',css)[:12])

if __name__ == '__main__':
    main()
