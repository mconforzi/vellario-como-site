#!/usr/bin/env python3
"""VELLARIO mobile content foundation: static HTML generator, zero dependencies.

Usage: python mobile/build_site.py --out /tmp/vellario-out
Reads mobile/site-content.json and mobile/catalog.json; creates 13 static pages
with content rendered in HTML, not injected at runtime. No internet required.
"""
import argparse
import html
import json
from pathlib import Path
from urllib.parse import quote

def esc(v):
    return html.escape(str(v if v is not None else ''), quote=True)

def asset(name, depth, directory='vario'):
    return '../' * (depth + 1) + 'assets/' + directory + '/' + quote(name, safe='.-_')

def site_path(slug, depth):
    return ('../' * depth or './') + (slug + '/' if slug else '')

def root_file(filename, depth):
    return ('../' * depth or './') + filename

def section_media(media, depth, model_lookup, lakes, caption=''):
    if not media:
        return ''
    if media.startswith('model:'):
        mid = media.split(':',1)[1]
        m = model_lookup[mid]
        poster = asset(m['poster'], depth)
        video = asset(m['video'], depth) if m.get('video') else ''
        text = 'Original design-archive material for ' + m['name'] + '. Not evidence of production.'
        film = (f'<video data-film data-src="{esc(video)}" muted playsinline loop preload="none" poster="{esc(poster)}" aria-label="Original design-study film for {esc(m["name"])}"></video>' if video else '')
        return (
            f'<figure class="film-frame" data-media-frame><img class="media-poster" src="{esc(poster)}" '
            f'alt="{esc(m["name"])} original design rendering" loading="lazy">{film}'
            + ('<button type="button" class="play-film" aria-label="Play or pause film">Play film</button>' if film else '')
            + f'<figcaption>{esc(text)}</figcaption></figure>'
        )
    item=lakes[media]
    poster=asset(item['poster'],depth,'lake-placeholders')
    video=asset(item['video'],depth,'lake-placeholders')
    return (
        f'<figure class="film-frame" data-media-frame><img class="media-poster" src="{esc(poster)}" '
        f'alt="{esc(item["place"])} visual footage placeholder" loading="lazy">'
        f'<video data-film data-src="{esc(video)}" muted playsinline loop preload="none" poster="{esc(poster)}" '
        f'aria-label="Temporary lake landscape video: {esc(item["place"])}"></video>'
        f'<button type="button" class="play-film" aria-label="Play or pause lake video">Play film</button>'
        f'<figcaption><span class="chip">Temporary footage / not product media</span> {esc(item["place"])} · '
        f'<a href="{esc(item["source"])}" target="_blank" rel="noopener noreferrer">{esc(item["author"])}</a> · '
        f'<a href="{esc(item["licenseUrl"])}" target="_blank" rel="noopener noreferrer">{esc(item["license"])}</a>. '
        f'Original {esc(item["originalPixels"])}. Preview optimised for mobile.</figcaption></figure>'
    )

def header(current_id, depth, data):
    links=[]
    for nav in data['nav']:
        href=site_path(nav['slug'],depth)
        flag=' aria-current="page"' if nav['id']==current_id else ''
        links.append(f'<a href="{esc(href)}"{flag}>{esc(nav["label"])}</a>')
    return (
        '<header class="site-header"><a class="wordmark" href="'+esc(site_path('',depth))+'">'
        '<strong>VELLARIO</strong><small>COMO</small></a>'
        '<a class="header-como" href="'+esc(site_path('como',depth))+'">Como</a>'
        '<details class="menu"><summary aria-label="Apri il menu del sito">Menu</summary>'
        '<nav class="menu-items" aria-label="Navigazione principale">'+''.join(links)+'</nav></details></header>'
    )

def footer(depth, data):
    foot = data.get('footer', {})
    return (
        '<footer class="site-footer">'
        '<div class="footer-mark">VELLARIO · COMO</div>'
        '<p>'+esc(foot.get('statement','A new Italian nautical maison.'))+'</p>'
        '<p>'+esc(foot.get('disclosure','Design concept preview.'))+'</p>'
        '<p><a href="'+esc(site_path('contact',depth))+'">Contact</a> · '
        '<a href="'+esc(site_path('collection',depth))+'">The Collection</a> · '
        '<a href="'+esc(site_path('',depth))+'">Home</a></p>'
        '</footer>'
    )

def hero(page, depth, model_lookup, lakes, opening, content_model=None):
    key=page.get('hero')
    if not key:
        return ('<div class="hero-text-only"><p class="eyebrow">'+esc(page['kicker'])+'</p>'
            '<h1>'+esc(page['title'])+'</h1><p class="lede">'+esc(page['lead'])+'</p></div>')
    if key=='opening':
        poster=asset(opening['poster'],depth)
        segments='|'.join(asset(segment,depth) for segment in opening['segments'])
        media=(
            '<div class="hero-visual film-frame" data-media-frame>'
            f'<img class="media-poster" src="{esc(poster)}" alt="MAS 46 original yacht design study" fetchpriority="high">'
            f'<video data-film data-opening data-segments="{esc(segments)}" data-src="{esc(asset(opening["segments"][0],depth))}" muted playsinline preload="none" poster="{esc(poster)}" aria-label="MAS 46 FULL original opening film"></video>'
            '<button type="button" class="play-film" aria-label="Play or pause MAS 46 film">Play film</button>'
            '<span class="media-identifier">MAS 46 FULL · design archive opening film</span></div>'
        )
    else:
        media=section_media(key,depth,model_lookup,lakes)
    return (
        '<div class="hero-intro"><p class="eyebrow">'+esc(page['kicker'])+'</p>'
        '<h1>'+esc(page['title'])+'</h1><p class="lede">'+esc(page['lead'])+'</p></div>'
        +'<div class="hero-block">'+media+'</div>'
    )

def model_cards(depth,models,copy_lookup):
    items=[]
    for m in models:
        href=site_path('collection/'+m['id'],depth)
        poster=asset(m['poster'],depth)
        items.append(
            '<a class="model-card" href="'+esc(href)+'">'
            '<img src="'+esc(poster)+'" alt="'+esc(m['name'])+' original yacht design rendering" loading="lazy">'
            '<span class="model-card-copy"><strong>'+esc(m['name'])+'</strong>'
            '<small>'+esc(copy_lookup[m['id']]['tagline'])+' <span aria-hidden="true">→</span></small></span></a>'
        )
    return '<div class="model-card-grid">'+''.join(items)+'</div>'

def editorial_page(page, depth, data, model_lookup, models):
    out=[hero(page,depth,model_lookup,data['lakeSources'],data_opening(data,models))]
    for i,s in enumerate(page['sections'],1):
        out.append('<section class="editorial-section" id="'+esc(s['id'])+'">'
                   '<div class="section-index">'+str(i).zfill(2)+'</div>'
                   '<div class="section-copy"><h2>'+esc(s['title'])+'</h2><p>'+esc(s['body'])+'</p>')
        if s.get('source'):
            src=s['source']
            out.append('<p class="verified-source">Source: <a href="'+esc(src['url'])+
                       '" target="_blank" rel="noopener noreferrer">'+esc(src['label'])+'</a></p>')
        if s.get('link'):
            n=next(x for x in data['nav'] if x['id']==s['link'])
            out.append('<a class="section-link" href="'+esc(site_path(n['slug'],depth))+
                       '">Explore '+esc(n['label'])+' <span aria-hidden="true">→</span></a>')
        out.append('</div>')
        if s.get('media'):
            out.append('<div class="section-visual">'+section_media(s['media'],depth,model_lookup,data['lakeSources'])+'</div>')
        if s.get('kind')=='collection':
            out.append('<div class="section-collection">'+model_cards(depth,models,data['modelCopy'])+'</div>')
        out.append('</section>')
    return ''.join(out)

def data_opening(data,models):
    return data.get('_opening',{})

def model_page(model, copy, depth, data, models):
    medium=section_media('model:'+model['id'],depth,{x['id']:x for x in models},data['lakeSources'])
    out=['<div class="hero-intro"><p class="eyebrow">'+esc(copy['kicker'])+
         ' / original design archive</p><h1>'+esc(model['name'])+
         '</h1><p class="lede">'+esc(copy['tagline'])+'</p><p class="working-note">'+
         esc(copy['lead'])+'</p></div><div class="hero-block">'+medium+'</div>']
    parts=[
       ('The Concept',copy['concept']),
       ('Exterior Design',copy['exterior']),
       ('Life on Board',copy['aboard']),
       ('Details & Materials',copy['details']),
       ('Specifications',copy.get('specifications','Final technical specification under review.')),
    ]
    for i,(heading,text) in enumerate(parts,1):
        out.append('<section class="editorial-section"><div class="section-index">'+str(i).zfill(2)+'</div>'
                   '<div class="section-copy"><h2>'+esc(heading)+'</h2><p>'+esc(text)+'</p></div></section>')
    photos=[]
    for i,name in enumerate(model['images']):
        photos.append('<figure><img src="'+esc(asset(name,depth))+'" alt="'+esc(model['name'])+
                     ' archive rendering '+str(i+1)+'" loading="lazy"><figcaption>Original design archive · '+esc(model['name'])+'</figcaption></figure>')
    out.append('<section class="editorial-section image-section"><div class="section-index">06</div>'
               '<div class="section-copy"><h2>Gallery</h2><p>'+esc(copy.get('gallery','Original project imagery.'))+'</p></div>'
               '<div class="image-gallery">'+''.join(photos)+'</div></section>')
    out.append('<section class="editorial-section"><div class="section-index">07</div>'
               '<div class="section-copy"><h2>Enquiries</h2><p>'+esc(copy.get('enquiries','Dedicated enquiry channel forthcoming.'))+'</p>'
               '<a class="section-link" href="'+esc(site_path('contact',depth))+'">Contact information →</a></div></section>')
    out.append('<nav class="model-next" aria-label="Altri modelli">'+model_cards(depth,models,data['modelCopy'])+'</nav>')
    return ''.join(out)

def generate(data,catalog,where):
    models=catalog['models']
    if len(data['nav'])!=7 or data['nav'][0]['id']!='como':
        raise ValueError('Sitemap main navigation differs from approved Como-first contract')
    if len(models)!=5 or [x['name'] for x in models]!=[
        'Quantum 999','MAS 36','MAS 56','GranTender 72','Gran Marlin']:
        raise ValueError('Original model registry differs from approved collection')
    if len(data['pages'])!=8 or len(data['modelCopy'])!=5:
        raise ValueError('Expected home + seven pillars + five model pages')
    data['_opening']=catalog['opening']
    model_lookup={m['id']:m for m in models}
    paths=[]
    entries=[(p['slug'],p,None) for p in data['pages']]
    entries += [('collection/'+m['id'],None,m) for m in models]
    root=Path(where)
    for slug,page,model in entries:
        depth=slug.count('/')+1 if slug else 0
        outdir=root/slug
        outdir.mkdir(parents=True,exist_ok=True)
        title=page['title'] if page else model['name']
        pid=page['id'] if page else 'collection'
        desc=(page['lead'] if page else data['modelCopy'][model['id']]['lead'])
        body=(editorial_page(page,depth,data,model_lookup,models)
              if page else model_page(model,data['modelCopy'][model['id']],depth,data,models))
        source_css=root_file('site.css',depth)
        source_js=root_file('site.js',depth)
        html_doc=(
          '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
          '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
          '<meta name="theme-color" content="#102018"><meta name="robots" content="noindex,nofollow,noarchive">'
          '<meta name="description" content="'+esc(desc)+'">'
          '<title>'+esc(title)+' | VELLARIO · COMO</title>'
          '<link rel="stylesheet" href="'+esc(source_css)+'"><script src="'+esc(source_js)+'" defer></script>'
          '</head><body data-page="'+esc(pid)+'">'
          +header(pid,depth,data)+'<main id="main-content">'+body+'</main>'
          +footer(depth,data)+'</body></html>\n'
        )
        dest=outdir/'index.html'
        dest.write_text(html_doc,encoding='utf-8')
        if '<h1>' not in html_doc or '<main' not in html_doc:
            raise ValueError('Generated route missing static core content: '+slug)
        paths.append({'slug':slug,'path':str(dest.relative_to(root)),'name':title,'bytes':len(html_doc.encode('utf-8'))})
    (root/'route-manifest.json').write_text(json.dumps({
        'schemaVersion':1,'routes':paths,'count':len(paths),
        'note':'All HTML is server-readable with no JS dependency. Media are progressive enhancements.'
    },indent=2)+'\n',encoding='utf-8')
    if len(paths)!=13 or len({x['slug'] for x in paths})!=13:
        raise ValueError('Must generate 13 unique sitemap routes')
    return paths

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--out',required=True)
    parser.add_argument('--site-data',default='mobile/site-content.json')
    parser.add_argument('--catalog',default='mobile/catalog.json')
    args=parser.parse_args()
    d=json.loads(Path(args.site_data).read_text(encoding='utf-8'))
    m=json.loads(Path(args.catalog).read_text(encoding='utf-8'))
    made=generate(d,m,args.out)
    print(json.dumps({'generated':len(made),'routes':made},indent=2))
