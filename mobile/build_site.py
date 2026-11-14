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

def section_media(media, depth, model_lookup, lakes, caption='', hero=False):
    if not media:
        return ''
    eager = 'eager' if hero else 'lazy'
    priority = ' fetchpriority="high"' if hero else ''
    if media.startswith('model:'):
        mid = media.split(':', 1)[1]
        m = model_lookup[mid]
        poster = asset(m['poster'], depth)
        video = asset(m['video'], depth) if m.get('video') else ''
        portrait = ' film-frame--portrait' if m.get('videoResolution') and m['videoResolution'].startswith('720×1280') else ''
        film = (f'<video data-film data-src="{esc(video)}" muted playsinline loop preload="none" '
                f'poster="{esc(poster)}" aria-label="Original study film for {esc(m["name"])}"></video>') if video else ''
        return (
            f'<figure class="film-frame film-frame--yacht{portrait}" data-media-frame>'
            f'<img class="media-poster" src="{esc(poster)}" alt="{esc(m["name"])} original yacht design rendering" '
            f'loading="{eager}" decoding="async"{priority}>'
            + film +
            ('<button type="button" class="play-film" aria-label="Avvia o ferma il filmato"><span class="play-icon">▶</span><span class="play-label">PLAY FILM</span></button>' if film else '')
            + f'<figcaption><span class="source-label">ARCHIVIO PROGETTUALE</span><span>{esc(m["name"])} · Original design study</span></figcaption></figure>'
        )
    item = lakes[media]
    poster = asset(item['poster'], depth, 'lake-placeholders')
    video = asset(item['video'], depth, 'lake-placeholders')
    return (
        f'<figure class="film-frame film-frame--lake" data-media-frame>'
        f'<img class="media-poster" src="{esc(poster)}" alt="{esc(item["place"])} landscape footage placeholder" loading="{eager}" decoding="async"{priority}>'
        f'<video data-film data-src="{esc(video)}" muted playsinline loop preload="none" poster="{esc(poster)}" '
        f'aria-label="{esc(item["place"])} lake footage"></video>'
        '<button type="button" class="play-film" aria-label="Avvia o ferma il filmato"><span class="play-icon">▶</span><span class="play-label">PLAY FILM</span></button>'
        f'<figcaption><span class="source-label">PAESAGGIO · PLACEHOLDER</span><span>{esc(item["place"])} · '
        f'<a href="{esc(item["source"])}" target="_blank" rel="noopener noreferrer">{esc(item["author"])}</a> / '
        f'<a href="{esc(item["licenseUrl"])}" target="_blank" rel="noopener noreferrer">{esc(item["license"])}</a>'
        '</span></figcaption></figure>'
    )

def header(current_id, depth, data):
    menu_items = []
    for i, item in enumerate(data['nav'], 1):
        is_current = ' aria-current="page"' if current_id == item['id'] else ''
        menu_items.append(
            f'<a class="menu-link" href="{esc(site_path(item["slug"], depth))}"{is_current}>'
            f'<span class="menu-number">{i:02d}</span>'
            f'<span class="menu-name">{esc(item["label"])}</span>'
            '<span class="menu-arrow" aria-hidden="true">↗</span></a>'
        )
    return (
        '<header class="site-header">'
        '<details class="site-menu">'
        '<summary class="menu-toggle" aria-label="Apri il menu principale">'
        '<span class="menu-lines" aria-hidden="true"><i></i><i></i></span><span class="menu-toggle-word">MENU</span></summary>'
        '<div class="menu-panel"><div class="menu-panel-inner">'
        '<div class="menu-title">L’ARTE DI VIVERE</div>'
        '<nav class="menu-items" aria-label="Navigazione principale">'
        + ''.join(menu_items) +
        '</nav><div class="menu-footer"><span>VELLARIO · COMO</span><span>ITALIAN NAUTICAL ELEGANCE</span></div>'
        '</div></div></details>'
        '<a class="wordmark" href="' + esc(site_path('', depth)) + '" aria-label="VELLARIO COMO, homepage">'
        '<strong>VELLARIO</strong><small>COMO</small></a>'
        '<a class="header-side" href="' + esc(site_path('collezione', depth)) + '">LA COLLEZIONE <span aria-hidden="true">↗</span></a>'
        '</header>'
    )

def footer(depth, data):
    foot = data.get('footer', {})
    return (
        '<footer class="site-footer">'
        '<div class="footer-mark">VELLARIO · COMO</div>'
        '<p>'+esc(foot.get('statement','Una nuova casa italiana della nautica.'))+'</p>'
        '<p>'+esc(foot.get('disclosure','Design concept preview.'))+'</p>'
        '<p><a href="'+esc(site_path('contatti',depth))+'">Contatti</a> · '
        '<a href="'+esc(site_path('collezione',depth))+'">La Collezione</a> · '
        '<a href="'+esc(site_path('',depth))+'">Inizio</a></p>'
        '</footer>'
    )

def hero(page, depth, model_lookup, lakes, opening, content_model=None):
    key = page.get('hero')
    home = page['id'] == 'home'
    if key == 'opening':
        poster = asset(opening['poster'], depth)
        parts = '|'.join(asset(segment, depth) for segment in opening['segments'])
        media = (
            '<figure class="film-frame film-frame--opening" data-media-frame>'
            f'<img class="media-poster" src="{esc(poster)}" alt="MAS 46 original nautical design film" loading="eager" decoding="async" fetchpriority="high">'
            f'<video data-film data-opening data-segments="{esc(parts)}" data-src="{esc(asset(opening["segments"][0],depth))}" '
            f'muted playsinline preload="none" poster="{esc(poster)}" aria-label="MAS 46 FULL cinematic original design archive film"></video>'
            '<button type="button" class="play-film" aria-label="Avvia o ferma il filmato">'
            '<span class="play-icon">▶</span><span class="play-label">PLAY FILM</span></button>'
            '<figcaption><span class="source-label">ORIGINAL DESIGN ARCHIVE</span>'
            '<span>MAS 46 FULL · Opening film</span></figcaption></figure>'
        )
    elif key:
        media = section_media(key, depth, model_lookup, lakes, hero=True)
    else:
        media = '<div class="hero-artwork"><span class="hero-artwork-ring"></span></div>'
    title = 'VELLARIO' if home else page['title']
    italy = ('<p class="hero-signature">La Dolce Vita, sull’Acqua.</p>' if home else '')
    lead = page['lead']
    if home and lead.startswith("La Dolce Vita, sull'Acqua. "):
        lead = lead.split("La Dolce Vita, sull'Acqua. ", 1)[1]
    next_id = page['sections'][0]['id'] if page['sections'] else ''
    hint = ('<a class="hero-scroll" href="#' + esc(next_id) +
            '"><span>SCOPRI IL MONDO VELLARIO</span><span class="scroll-line" aria-hidden="true"></span><span aria-hidden="true">↓</span></a>') if next_id else ''
    return (
        '<section class="cinema-hero' + (' cinema-hero--home' if home else '') + (' cinema-hero--text' if not key else '') + '">'
        '<div class="cinema-backdrop">' + media + '</div><div class="cinema-shade"></div>'
        '<div class="cinema-copy"><p class="cinema-overline">' + esc(page['kicker']) + '</p>'
        '<h1>' + esc(title) + '</h1>' + italy +
        ('<p class="cinema-english">' + esc(page['englishTagline']) + '</p>' if page.get('englishTagline') else '') +
        '<p class="cinema-lead">' + esc(lead) + '</p></div>'
        + hint + '<div class="hero-counter">VELLARIO / COMO <span>✳</span> ITALIA</div></section>'
    )

def model_cards(depth, models, copy_lookup):
    cards = []
    for i, m in enumerate(models, 1):
        href = site_path('collezione/' + m['id'], depth)
        image = asset(m['poster'], depth)
        film_markup = (
            '<video class="model-card-film" data-model-film data-src="' + esc(asset(m['video'], depth)) +
            '" muted playsinline autoplay loop preload="none" poster="' + esc(image) +
            '" aria-label="Video del modello ' + esc(m['name']) + '"></video>'
        ) if m.get('video') else ''
        tag = copy_lookup[m['id']]['tagline']
        cards.append(
            '<a class="model-card' + (' model-card--featured' if i == 1 else '') + (' model-card--portrait' if (m.get('videoResolution') or '').startswith('720×1280') else '') + '" href="' + esc(href) + '">'
            '<img src="' + esc(image) + '" alt="' + esc(m['name']) + ' original design rendering" loading="lazy" decoding="async">'
            + film_markup +
            '<span class="model-card-overlay"></span>'
            '<span class="model-card-index">LA COLLEZIONE <b>' + str(i).zfill(2) + ' / 05</b></span>'
            '<span class="model-card-copy"><span><strong>' + esc(m['name']) + '</strong>'
            '<small>' + esc(tag) + '</small></span>'
            '<span class="card-explore" aria-label="Scopri il modello">↗</span></span>'
            '</a>'
        )
    return (
        '<section class="yacht-rail" data-yacht-rail aria-label="La collezione VELLARIO: cinque barche da esplorare in orizzontale">'
        '<div class="model-card-grid yacht-rail-track" data-yacht-track tabindex="0" aria-label="Scorri orizzontalmente fra i cinque modelli">'
        + ''.join(cards) +
        '</div><div class="yacht-rail-controls">'
        '<div class="yacht-rail-legend"><span>LA COLLEZIONE</span><small>SCORRI PER ESPLORARE</small></div>'
        '<span class="yacht-rail-progress" aria-hidden="true"><i data-yacht-progress></i></span>'
        '<span class="yacht-rail-count" aria-live="off"><strong data-yacht-current>01</strong><span> / 05</span></span>'
        '<div class="yacht-rail-buttons">'
        '<button class="yacht-rail-btn" type="button" data-yacht-prev aria-label="Modello precedente" disabled>←</button>'
        '<button class="yacht-rail-btn" type="button" data-yacht-next aria-label="Modello successivo">→</button>'
        '</div></div></section>'
    )

def editorial_page(page, depth, data, model_lookup, models):
    out = [hero(page, depth, model_lookup, data['lakeSources'], data_opening(data, models))]
    for i, section in enumerate(page['sections'], 1):
        has_media = bool(section.get('media'))
        is_collection = section.get('kind') == 'collection'
        classes = ['editorial-section', 'chapter', 'chapter--' + str(i % 3)]
        if has_media:
            classes.append('chapter--visual')
        if is_collection:
            classes.append('chapter--collection')
        out.append(
            '<section class="' + ' '.join(classes) + '" id="' + esc(section['id']) + '">'
            '<div class="chapter-shell"><div class="chapter-number"><span>' + str(i).zfill(2) +
            '</span><i></i><span>' + str(len(page['sections'])).zfill(2) + '</span></div>'
            '<div class="chapter-content"><p class="chapter-eyebrow">' + esc(page['title']) + ' / ' +
            esc(str(i).zfill(2)) + '</p><h2>' + esc(section['title']) + '</h2>' +
            ('<p class="english-subtitle">' + esc(section['englishLine']) + '</p>' if section.get('englishLine') else '') +
            '<p class="chapter-description">' + esc(section.get('shortIntro') or section['body']) + '</p>'
        )
        if section.get('source'):
            src = section['source']
            out.append('<a class="source-link" href="' + esc(src['url']) +
                       '" target="_blank" rel="noopener noreferrer">FONTE STORICA <span>↗</span> ' +
                       esc(src['label']) + '</a>')
        if section.get('link'):
            destination = next(n for n in data['nav'] if n['id'] == section['link'])
            out.append('<a class="text-link" href="' + esc(site_path(destination['slug'], depth)) +
                       '">ESPLORA ' + esc(destination['label']) + '<span aria-hidden="true">↗</span></a>')
        if section.get('shortIntro'):
            out.append(
                '<details class="chapter-depth"><summary>LEGGI TUTTO <span aria-hidden="true">＋</span></summary>'
                '<div class="chapter-depth-panel"><p>' + esc(section['body']) + '</p></div></details>'
            )
        out.append('</div></div>')
        if has_media:
            out.append('<div class="chapter-media">' +
                       section_media(section['media'], depth, model_lookup, data['lakeSources']) + '</div>')
        if is_collection:
            out.append('<div class="chapter-collection">' + model_cards(depth, models, data['modelCopy']) + '</div>')
        out.append('</section>')
    if page['id'] not in ('home','contact'):
        nav = data['nav']
        pos = next(i for i, n in enumerate(nav) if n['id'] == page['id'])
        nex = nav[(pos + 1) % len(nav)]
        out.append('<div class="next-chapter"><span>CONTINUA IL VIAGGIO</span>'
                   '<a href="' + esc(site_path(nex['slug'], depth)) + '">' + esc(nex['label']) +
                   ' <span aria-hidden="true">↗</span></a></div>')
    return ''.join(out)

def data_opening(data,models):
    return data.get('_opening',{})

def model_page(model, copy, depth, data, models):
    key = 'model:' + model['id']
    media = section_media(key, depth, {m['id']:m for m in models}, data['lakeSources'], hero=True)
    out = [
        '<section class="cinema-hero cinema-hero--model"><div class="cinema-backdrop">' + media +
        '</div><div class="cinema-shade"></div><div class="cinema-copy">'
        '<p class="cinema-overline">' + esc(copy['kicker']) + '</p>'
        '<h1>' + esc(model['name']) + '</h1>'
        '<p class="hero-signature">' + esc(copy['tagline']) + '</p>'
        + ('<p class="cinema-english">' + esc(copy['englishTagline']) + '</p>' if copy.get('englishTagline') else '') +
        '<p class="cinema-lead">' + esc(copy['lead']) + '</p></div>'
        '<a class="hero-scroll" href="#concept"><span>SCOPRI IL PROGETTO</span><span class="scroll-line" aria-hidden="true"></span><span aria-hidden="true">↓</span></a>'
        '<div class="hero-counter">VELLARIO / LA COLLEZIONE <span>✳</span> ITALIA</div></section>'
    ]
    parts = [
        ('concept','Il Concept',copy['concept']),
        ('linee','Le Linee',copy['exterior']),
        ('bordo','La Vita a Bordo',copy['aboard']),
        ('dettagli','Dettagli & Materiali',copy['details']),
        ('specifiche','Dati Tecnici',copy.get('specifications','Final technical specification under review.')),
    ]
    for i, (slug, label, paragraph) in enumerate(parts, 1):
        out.append(
            '<section class="editorial-section chapter chapter--' + str(i % 3) + '" id="' + slug + '">'
            '<div class="chapter-shell"><div class="chapter-number"><span>' + str(i).zfill(2) + '</span><i></i><span>07</span></div>'
            '<div class="chapter-content"><p class="chapter-eyebrow">LA COLLEZIONE / ' + esc(model['name']) +
            '</p><h2>' + esc(label) + '</h2><p class="chapter-description">' + esc(paragraph) +
            '</p></div></div></section>'
        )
    photos = []
    for i, name in enumerate(model['images']):
        photos.append(
            '<figure class="gallery-image gallery-image--' + str(i%3) + '"><img src="' +
            esc(asset(name, depth)) + '" alt="' + esc(model['name']) + ' archival rendering ' + str(i+1) +
            '" loading="lazy" decoding="async"><figcaption>' + esc(model['name']) +
            ' / ARCHIVIO PROGETTUALE <span>' + str(i+1).zfill(2) + '</span></figcaption></figure>'
        )
    out.append(
        '<section class="gallery-chapter" id="galleria"><div class="gallery-title"><span>06 / 07 · LA COLLEZIONE</span>'
        '<h2>Galleria</h2><p>' + esc(copy.get('gallery','Original project imagery.')) +
        '</p></div><div class="image-gallery">' + ''.join(photos) + '</div></section>'
    )
    out.append(
        '<section class="editorial-section chapter chapter--closing" id="contatti">'
        '<div class="chapter-shell"><div class="chapter-number"><span>07</span><i></i><span>07</span></div>'
        '<div class="chapter-content"><p class="chapter-eyebrow">UN INVITO PERSONALE</p><h2>Contatti</h2>'
        '<p class="chapter-description">' + esc(copy.get('enquiries','Contact channel forthcoming.')) +
        '</p><a class="text-link" href="' + esc(site_path('contatti',depth)) +
        '">CONTATTI <span aria-hidden="true">↗</span></a></div></div></section>'
    )
    out.append(
        '<section class="collection-after"><div class="collection-after-title"><span>LA COLLEZIONE</span>'
        '<h2>Discover the Collection.</h2></div>' + model_cards(depth, models, data['modelCopy']) + '</section>'
    )
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
    if any(not x.get('video') for x in models):
        raise ValueError('Video-first collection: all five models need a matching film')
    data['_opening']=catalog['opening']
    model_lookup={m['id']:m for m in models}
    paths=[]
    entries=[(p['slug'],p,None) for p in data['pages']]
    entries += [('collezione/'+m['id'],None,m) for m in models]
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
          '<meta name="theme-color" content="#0b1712"><meta name="robots" content="noindex,nofollow,noarchive">'
          '<meta name="description" content="'+esc(desc)+'">'
          '<title>'+esc(title)+' | VELLARIO · COMO</title>'
          '<link rel="preconnect" href="https://fonts.googleapis.com">'
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
          '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">'
          '<link rel="stylesheet" href="'+esc(source_css)+'?v=v15-media-max"><script src="'+esc(source_js)+'?v=v15-media-max" defer></script>'
          '</head><body data-page="'+esc(pid)+'">'
          +header(pid,depth,data)+'<main id="main-content">'+body+'</main>'
          +footer(depth,data)+'</body></html>\n'
        )
        dest=outdir/'index.html'
        dest.write_text(html_doc,encoding='utf-8')
        if '<h1>' not in html_doc or '<main' not in html_doc:
            raise ValueError('Generated route missing static core content: '+slug)
        paths.append({'slug':slug,'path':str(dest.relative_to(root)),'name':title,'bytes':len(html_doc.encode('utf-8'))})
    # Preserve old English/French URLs so previously shared site links keep working.
    legacy_redirects = {
        'collection': 'collezione',
        'history-legacy': 'storia-tradizione',
        'design-craftsmanship': 'design-saper-fare',
        'maison': 'casa-vellario',
        'contact': 'contatti',
    }
    legacy_redirects.update({
        'collection/' + m['id']: 'collezione/' + m['id'] for m in models
    })
    legacy=[]
    for old_slug,new_slug in legacy_redirects.items():
        old_depth=old_slug.count('/')+1
        new_url=site_path(new_slug,old_depth)
        old_dir=root/old_slug
        old_dir.mkdir(parents=True,exist_ok=True)
        redirect_html=(
            '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="robots" content="noindex,nofollow">'
            '<meta http-equiv="refresh" content="0; url='+esc(new_url)+'">'
            '<title>VELLARIO · COMO — Nuovo Indirizzo</title></head>'
            '<body><p>La pagina è stata aggiornata: <a href="'+esc(new_url)+'">'
            'Apri la nuova pagina</a>.</p></body></html>\n'
        )
        old_file=old_dir/'index.html'
        old_file.write_text(redirect_html,encoding='utf-8')
        legacy.append({'old':old_slug,'new':new_slug,'path':str(old_file.relative_to(root))})
    (root/'route-manifest.json').write_text(json.dumps({
        'schemaVersion':2,'routes':paths,'count':len(paths),'redirects':legacy,'redirectCount':len(legacy),
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
