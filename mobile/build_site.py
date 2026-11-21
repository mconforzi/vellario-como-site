#!/usr/bin/env python3
"""VELLARIO mobile content foundation: static HTML generator, zero dependencies.

Usage: python mobile/build_site.py --out /tmp/vellario-out
Reads mobile/site-content.json and mobile/catalog.json; creates 15 canonical static pages
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

def media_priority(entry):
    """Rank owner-selected assets without confusing filenames with model identity."""
    label = entry.get('tier','') if isinstance(entry,dict) else ''
    name = entry.get('video','') if isinstance(entry,dict) else str(entry)
    low = name.lower()
    if not label:
        label = next((tier for tier in ('hero','heroa','herob') if ('-'+tier+'-') in low), 'archive')
    return {'hero':0,'heroa':1,'herob':2,'unranked':3,'archive':4}.get(label,4)


def ranked_images(model):
    return sorted(model.get('images',[]),key=media_priority)


def film_orientation(clip):
    """Determine the actual aspect ratio from ffprobe metadata."""
    if not clip:
        return 'unknown'
    raw = str(clip.get('resolution') or '').lower().replace('x','×')
    try:
        width,height = (int(part) for part in raw.split('×')[:2])
        return 'portrait' if height > width else 'landscape'
    except (ValueError,TypeError):
        return 'unknown'


def model_film_variant(model, variation=0, used=None, prefer=None, allow_reuse=True):
    """Prefer fresh, model-exact videos, respecting aspect and HERO priority."""
    if not model.get('video'):
        return None
    clips = [{'video':model['video'],'poster':model.get('videoPoster') or model['poster'],
              'resolution':model.get('videoResolution') or '', 'tier':model.get('videoTier') or ''}]
    seen_names = {model['video']}
    for extra in sorted(model.get('extraVideos',[]), key=media_priority):
        if extra.get('video') and extra['video'] not in seen_names:
            clips.append(extra)
            seen_names.add(extra['video'])
    if used is None and prefer is None:
        return clips[max(0,variation)%len(clips)]
    available = [(i,c) for i,c in enumerate(clips) if used is None or c['video'] not in used]
    if not available:
        if not allow_reuse:
            return None
        available = list(enumerate(clips))
    if prefer:
        idx,selected = min(available,key=lambda pair:(
            film_orientation(pair[1])!=prefer,media_priority(pair[1]),pair[0]))
    else:
        idx,selected = min(available,key=lambda pair:(media_priority(pair[1]),pair[0]))
    if used is not None:
        used.add(selected['video'])
    return selected


def section_media(media, depth, model_lookup, lakes, caption='', hero=False, mobile_media=None, variation=0, used=None):
    if not media:
        return ''
    eager = 'eager' if hero else 'lazy'
    priority = ' fetchpriority="high"' if hero else ''
    if media.startswith('model:'):
        mid = media.split(':', 1)[1]
        m = model_lookup[mid]
        clip = model_film_variant(m, variation, used=used, prefer='landscape' if used is not None else None)
        poster = asset((clip.get('poster') if clip else None) or m['poster'], depth)
        video = asset(clip['video'], depth) if clip else ''
        portrait = ' film-frame--portrait' if film_orientation(clip)=='portrait' else ''
        mobile_attr = ''
        if mobile_media and mobile_media.startswith('model:'):
            mm = model_lookup[mobile_media.split(':', 1)[1]]
            mobile_clip = model_film_variant(mm, variation, used=used, prefer='portrait' if used is not None else None)
            if mobile_clip:
                mobile_video = asset(mobile_clip['video'], depth)
                mobile_poster = asset(mobile_clip.get('poster') or mm['poster'], depth)
                mobile_attr = f' data-src-mobile="{esc(mobile_video)}" data-poster-mobile="{esc(mobile_poster)}" data-mobile-name="{esc(mm["name"])}"'
        film = (f'<video data-film data-src="{esc(video)}"{mobile_attr} muted playsinline loop preload="none" '
                f'poster="{esc(poster)}" aria-label="Original study film for {esc(m["name"])}"></video>') if video else ''
        return (
            f'<figure class="film-frame film-frame--yacht{portrait}" data-media-frame>'
            f'<img class="media-poster" src="{esc(poster)}" alt="{esc(m["name"])} original design image or archive placeholder" '
            f'loading="{eager}" decoding="async"{priority}>'
            + (f'<img class="portrait-still" src="{esc(poster)}" alt="" loading="{eager}" decoding="async">' if portrait else '')
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

def brand_lockup(variant='', depth=0):
    """Exact owner-approved V and white wordmark, composed with the approved tagline and COMO."""
    if variant != 'footer':
        raise ValueError('The approved composite is for the footer')
    emblem = asset('VELLARIO_V_cutout_TRANSPARENT.svg', depth, 'brand/approved-20261115')
    wordmark = asset('VELLARIO_wordmark_REFERENCE_WHITE.svg', depth, 'brand/approved-20261115')
    return (
        '<div class="vellario-footer-signature" role="img" aria-label="VELLARIO — THE ART OF DOLCEVITA — COMO">'
        '<img class="vellario-footer-emblem" src="' + esc(emblem) + '" alt="" decoding="async">'
        '<img class="vellario-footer-wordmark" src="' + esc(wordmark) + '" alt="" decoding="async">'
        '<span class="vellario-footer-tagline" aria-hidden="true">THE ART OF DOLCEVITA</span>'
        '<span class="vellario-footer-como" aria-hidden="true">COMO</span>'
        '</div>'
    )

def header(current_id, depth, data):
    menu_items = []
    for i, item in enumerate(data['nav'], 1):
        is_current = ' aria-current="page"' if current_id == item['id'] else ''
        menu_items.append(
            f'<a class="menu-link" href="{esc(site_path(item["slug"], depth))}"{is_current}>'
            f'<span class="menu-number">{i:02d}</span>'
            f'<span class="menu-name">{esc(item["label"])}</span>'
            '<span class="menu-arrow" aria-hidden="true"><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>'
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
        '</nav><div class="menu-footer"><div class="vellario-menu-signature" role="img" aria-label="VELLARIO — THE ART OF DOLCEVITA — COMO">' +
        '<img class="vellario-menu-emblem" src="' + esc(asset('VELLARIO_V_cutout_TRANSPARENT.svg', depth, 'brand/approved-20261115')) + '" alt="" decoding="async">' +
        '<img class="vellario-menu-wordmark" src="' + esc(asset('VELLARIO_wordmark_REFERENCE_WHITE.svg', depth, 'brand/approved-20261115')) + '" alt="" decoding="async">' +
        '<span class="vellario-menu-tagline" aria-hidden="true">THE ART OF DOLCEVITA</span>' +
        '<span class="vellario-menu-como" aria-hidden="true">COMO</span>' +
        '</div></div>'
        '</div></div></details>'
        '<a class="wordmark" href="' + esc(site_path('', depth)) + '" aria-label="VELLARIO — Torna alla home">'
        + '<img class="brand-v-emblem" src="' + esc(asset('VELLARIO_V_cutout_TRANSPARENT.svg', depth, 'brand/approved-20261115')) +
        '" alt="" aria-hidden="true" decoding="async"></a>'
                '<a class="header-side" href="' + esc(site_path('collezione', depth)) + '">LA COLLEZIONE <span aria-hidden="true"><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>'
        '</header>'
    )

def footer(depth, data):
    foot = data.get('footer', {})
    return (
        '<footer class="site-footer">'
        '<div class="footer-mark">' + brand_lockup('footer', depth) + '</div>'
        '<p>'+esc(foot.get('statement','Una nuova casa italiana della nautica.'))+'</p>'
        '<p>'+esc(foot.get('disclosure','Design concept preview.'))+'</p>'
        '<p><a href="'+esc(site_path('contatti',depth))+'">Contatti</a> · '
        '<a href="'+esc(site_path('collezione',depth))+'">La Collezione</a> · '
        '<a href="'+esc(site_path('',depth))+'">Inizio</a></p>'
        '</footer>'
    )

def hero(page, depth, model_lookup, lakes, opening, content_model=None, used=None):
    key = page.get('hero')
    home = page['id'] == 'home'
    if key == 'opening':
        poster = asset(opening['poster'], depth)
        parts = '|'.join(asset(segment, depth) for segment in opening['segments'])
        mobile_attr = ''
        if opening.get('mobileVideo'):
            mv = asset(opening['mobileVideo'], depth)
            mp = asset(opening.get('mobilePoster', opening['poster']), depth)
            mobile_attr = f' data-src-mobile="{esc(mv)}" data-poster-mobile="{esc(mp)}"'
        media = (
            '<figure class="film-frame film-frame--opening" data-media-frame>'
            f'<img class="opening-backdrop" src="{esc(poster)}" alt="" aria-hidden="true" loading="eager" decoding="async">'
            f'<img class="media-poster" src="{esc(poster)}" alt="Original VELLARIO yacht design film" loading="eager" decoding="async" fetchpriority="high">'
            f'<video data-film data-opening data-segments="{esc(parts)}" data-src="{esc(asset(opening["segments"][0],depth))}"{mobile_attr} '
            f'muted playsinline preload="none" poster="{esc(poster)}" aria-label="Cinematic original VELLARIO yacht design studies"></video>'
            '<button type="button" class="play-film" aria-label="Avvia o ferma il filmato">'
            '<span class="play-icon">▶</span><span class="play-label">PLAY FILM</span></button>'
            '<figcaption><span class="source-label">ORIGINAL DESIGN ARCHIVE</span>'
            '<span>Original yacht design studies · Opening film</span></figcaption></figure>'
        )
    elif key:
        media = section_media(key, depth, model_lookup, lakes, hero=True, mobile_media=page.get('heroMobile'), used=used)
    else:
        media = '<div class="hero-artwork"><span class="hero-artwork-ring"></span></div>'
    title = 'VELLARIO' if home else page['title']
    italy = ''  # Official brand signature is paired with the wordmark.
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
        + (('<h1 class="cinema-home-brand"><img class="vellario-home-official-wordmark" src="' +
             esc(asset('VELLARIO_wordmark_REFERENCE_WHITE.svg', depth, 'brand/approved-20261115')) +
             '" alt="VELLARIO" decoding="async"></h1>' +
             '<p class="vellario-home-tagline">THE ART OF DOLCEVITA</p>' +
             '<p class="vellario-home-como">COMO</p>') if home else '<h1>' + esc(title) + '</h1>') + italy +
        ('<p class="cinema-english">' + esc(page['englishTagline']) + '</p>' if page.get('englishTagline') and not home else '') +
        '<p class="cinema-lead">' + esc(lead) + '</p></div>'
        + hint + '<div class="hero-counter">VELLARIO / COMO <span>✳</span> ITALIA</div></section>'
    )

def model_cards(depth, models, copy_lookup, used=None):
    cards = []
    for i, m in enumerate(models, 1):
        href = site_path('collezione/' + m['id'], depth)
        reference = model_film_variant(m)
        preference = film_orientation(reference)
        clip = model_film_variant(m, used=used, prefer=preference if preference!='unknown' else 'landscape')
        image = asset((clip or {}).get('poster') or m['poster'], depth)
        film_markup = (
            '<video class="model-card-film" data-model-film data-src="' + esc(asset(clip['video'], depth)) +
            '" muted playsinline autoplay loop preload="none" poster="' + esc(image) +
            '" aria-label="Video del modello ' + esc(m['name']) + '"></video>'
        ) if clip else ''
        tag = copy_lookup[m['id']]['tagline']
        cards.append(
            '<a class="model-card' + (' model-card--featured' if i == 1 else '') + (' model-card--portrait' if film_orientation(clip)=='portrait' else ' model-card--landscape') + '" href="' + esc(href) + '">'
            '<img src="' + esc(image) + '" alt="' + esc(m['name']) + ' original study image or media placeholder" loading="lazy" decoding="async">'
            + film_markup +
            '<span class="model-card-overlay"></span>'
            '<span class="model-card-index">LA COLLEZIONE <b>' + str(i).zfill(2) + ' / ' + str(len(models)).zfill(2) + '</b></span>'
            '<span class="model-card-copy"><span><strong>' + esc(m['name']) + '</strong>'
            '<small>' + esc(tag) + '</small></span>'
            '<span class="card-explore" aria-label="Scopri il modello"><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></span></span>'
            '</a>'
        )
    return (
        '<section class="yacht-rail" data-yacht-rail aria-label="La collezione VELLARIO: otto barche da esplorare in orizzontale">'
        '<div class="model-card-grid yacht-rail-track" data-yacht-track tabindex="0" aria-label="Scorri orizzontalmente fra i otto modelli">'
        + ''.join(cards) +
        '</div><div class="yacht-rail-controls">'
        '<div class="yacht-rail-legend"><span>LA COLLEZIONE</span><small>SCORRI PER ESPLORARE</small></div>'
        '<span class="yacht-rail-progress" aria-hidden="true"><i data-yacht-progress></i></span>'
        '<span class="yacht-rail-count" aria-live="off"><strong data-yacht-current>01</strong><span> / ' + str(len(models)).zfill(2) + '</span></span>'
        '<div class="yacht-rail-buttons">'
        '<button class="yacht-rail-btn" type="button" data-yacht-prev aria-label="Modello precedente" disabled>←</button>'
        '<button class="yacht-rail-btn" type="button" data-yacht-next aria-label="Modello successivo">→</button>'
        '</div></div></section>'
    )

def award_study(page_id, depth):
    """Owner-approved interactive chapters: static, visible without JS, scoped styles."""
    # Rebuild serially after concurrent VELLARIO editorial generator commits (2026-11-20).
    supported = ('home', 'como', 'dolce-vita', 'collection', 'design-craftsmanship')
    if page_id not in supported:
        return ''
    fragment = Path(__file__).with_name('award-interactions.html')
    if not fragment.is_file():
        raise FileNotFoundError('Missing VELLARIO award experience fragment: ' + str(fragment))
    content = fragment.read_text(encoding='utf-8')
    def block(key):
        start = '<!-- VA:' + key + ' -->'
        finish = '<!-- VA:/' + key + ' -->'
        if content.count(start) != 1 or content.count(finish) != 1:
            raise ValueError('Invalid interactive chapter block: ' + key)
        return content.split(start, 1)[1].split(finish, 1)[0]
    result = block('STYLE') + block(page_id) + block('SCRIPT')
    return result.replace('@@ASSETS@@', '../' * (depth + 1) + 'assets/').replace(
        '@@SITE@@', '../' * depth or './')



def curated_chapter(page, section, index, depth, data, model_lookup, variation=0, used=None, used_images=None):
    """Render actual editorial content inside one chosen cinematic composition."""
    layout = section['layout']
    media_name = section.get('media')
    media = section_media(media_name, depth, model_lookup, data['lakeSources'],
                          mobile_media=section.get('mobileMedia'), variation=variation, used=used) if media_name else ''
    secondary = ''
    secondary_id = section.get('secondaryMedia')
    if secondary_id:
        if secondary_id.startswith('model:'):
            secondary_model = model_lookup[secondary_id.split(':', 1)[1]]
            secondary_image = asset(secondary_model.get('videoPoster') or secondary_model['poster'], depth)
            secondary_alt = secondary_model['name'] + ' original design study'
        else:
            lake = data['lakeSources'][secondary_id]
            secondary_image = asset(lake['poster'], depth, 'lake-placeholders')
            secondary_alt = lake['place'] + ' location placeholder'
        secondary = ('<div class="curated-secondary" aria-hidden="true"><img src="' +
                     esc(secondary_image) + '" alt="' + esc(secondary_alt) +
                     '" loading="lazy" decoding="async"></div>')
    archive = ''
    if layout == 'filmbook':
        studies = [model_lookup[k] for k in ('mas-36', 'mas-52', 'quantum-999')]
        figures = []
        for item in studies:
            images = ranked_images(item)
            fresh = [x for x in images if used_images is None or x not in used_images]
            picture = fresh[0] if fresh else (images[0] if images else item['poster'])
            if used_images is not None: used_images.add(picture)
            poster = asset(picture, depth)
            figures.append('<figure><img src="' + esc(poster) + '" alt="' +
                           esc(item['name']) + ' original contemporary design study" loading="lazy">' +
                           '<figcaption>' + esc(item['name']) +
                           ' · PROGETTO CONTEMPORANEO</figcaption></figure>')
        archive = ('<div class="curated-archive" aria-label="Contemporary original design archive, '
                   'not historical vessel photographs">' + ''.join(figures) + '</div>')
    link = ''
    if section.get('link'):
        target = next(n for n in data['nav'] if n['id'] == section['link'])
        link = ('<a class="curated-link" href="' + esc(site_path(target['slug'], depth)) +
                '">SCOPRI ' + esc(target['label']) + ' <span aria-hidden="true">↗</span></a>')
    source = ''
    if section.get('source'):
        ref = section['source']
        source = ('<a class="curated-source" target="_blank" rel="noopener noreferrer" href="' +
                  esc(ref['url']) + '">FONTE STORICA · ' + esc(ref['label']) + '</a>')
    kicker = section.get('storyKicker') or page['title']
    statement = section.get('storyCaption') or section.get('englishLine') or ''
    return (
        '<section class="editorial-section curated-chapter curated--' + esc(layout) +
        '" id="' + esc(section['id']) + '" aria-label="' + esc(section['title']) + '">'
        '<div class="curated-stage">'
        '<div class="curated-media">' + media + '</div>' + secondary +
        '<div class="curated-mask" aria-hidden="true"></div>' + archive +
        '<div class="curated-index">VELLARIO · COMO &nbsp; / &nbsp; ' +
        str(index).zfill(2) + ' &nbsp; / &nbsp; ' + str(len(page['sections'])).zfill(2) +
        '</div><div class="curated-copy"><p class="curated-kicker">' + esc(kicker) +
        '</p><h2>' + esc(section['title']) + '</h2>' +
        ('<p class="curated-statement">' + esc(statement) + '</p>' if statement else '') +
        '<p class="curated-body">' + esc(section['body']) + '</p>' +
        source + link +
        '</div><span class="curated-scroll" aria-hidden="true">SCOPRI IL CAPITOLO · SCROLL</span>'
        '</div></section>'
    )

def editorial_media_atlas(page, depth, model_lookup, used=None, used_images=None):
    """Immersive owner-media mosaic; every tile is a verified model-specific asset.

    This gallery supplements editorial chapters without changing the seven
    approved homepage sections. Historical context is never misrepresented
    as a photograph of an old VELLARIO boat.
    """
    programs = {
        'collection': ('La Collezione, in movimento',
                       ['quantum-999','mas-36','mas-52','mas-56','lariocab',
                        'fy70','grantender-72','gran-marlin']),
        'history-legacy': ('Visioni contemporanee',
                           ['mas-52','mas-36','quantum-999','lariocab']),
        'como': ('Incontri sull’acqua',
                 ['gran-marlin','grantender-72','mas-52','fy70','mas-36']),
        'design-craftsmanship': ('La bellezza è nei dettagli',
                                 ['mas-56','fy70','quantum-999','mas-52','grantender-72']),
        'maison': ('Un mondo di possibilità',
                   ['gran-marlin','fy70','quantum-999','grantender-72']),
        'contact': ('Il piacere di incontrarsi',
                    ['gran-marlin','grantender-72'])
    }
    if page['id'] not in programs:
        return ''
    title, model_ids = programs[page['id']]
    pieces = []
    salt = sum(ord(ch) for ch in page['id'])
    for i, model_id in enumerate(model_ids):
        model = model_lookup[model_id]
        destination = esc(site_path('collezione/'+model_id,depth))
        name = esc(model['name'])
        images = ranked_images(model)
        if images:
            pictures = images[(i+salt) % len(images):]+images[:(i+salt) % len(images)]
            fresh = [x for x in pictures if used_images is None or x not in used_images]
            picture = fresh[0] if fresh else pictures[0]
            if used_images is not None: used_images.add(picture)
            src = esc(asset(picture,depth))
            pieces.append(
                '<a class="vellario-atlas-tile vellario-atlas-tile--still" href="'+destination+
                '" aria-label="Esplora '+name+'"><img src="'+src+'" alt="'+name+
                ' · originale progetto nautico" loading="lazy" decoding="async">'
                '<span class="vellario-atlas-caption"><strong>'+name+
                '</strong><small>DESIGN STUDY · ORIGINAL ARCHIVE</small></span></a>'
            )
        reference = model_film_variant(model)
        prefer = film_orientation(reference)
        clip = model_film_variant(model, 1, used=used, prefer=prefer if prefer!='unknown' else 'landscape', allow_reuse=False)
        if clip:
            poster = esc(asset(clip.get('poster') or model['poster'],depth))
            film = esc(asset(clip['video'],depth))
            pieces.append(
                '<a class="vellario-atlas-tile vellario-atlas-tile--film' + (' vellario-atlas-tile--portrait' if film_orientation(clip)=='portrait' else ' vellario-atlas-tile--landscape') + '" href="'+destination+
                '" aria-label="Esplora il video di '+name+'"><img src="'+poster+
                '" alt="'+name+' · fotogramma del film originale" loading="lazy" decoding="async">'
                + ('<img class="atlas-portrait-still" src="'+poster+'" alt="" loading="lazy" decoding="async">' if film_orientation(clip)=='portrait' else '')
                + '<video class="vellario-atlas-video" data-model-film data-src="'+film+
                '" muted playsinline loop preload="none" poster="'+poster+
                '" aria-label="'+name+' · film originale"></video>'
                '<span class="vellario-atlas-caption"><strong>'+name+
                '</strong><small>IL FILM · DESIGN STUDY</small></span></a>'
            )
    if not pieces:
        return ''
    return (
        '<section class="vellario-media-atlas" aria-label="'+esc(title)+'">'
        '<div class="vellario-atlas-heading"><p>VELLARIO / ARCHIVIO VISIVO</p>'
        '<h2>'+esc(title)+'</h2><span>ORIGINAL DESIGN STUDIES · '
        'NON PRODUZIONE VELLARIO</span></div>'
        '<div class="vellario-atlas-grid">'+''.join(pieces)+'</div></section>'
    )


def editorial_page(page, depth, data, model_lookup, models):
    used_videos=set()
    used_images=set()
    opening=data_opening(data,models)
    if page.get('hero')=='opening':
        used_videos.update(opening.get('segments',[]))
        if opening.get('mobileVideo'): used_videos.add(opening['mobileVideo'])
    out = [hero(page, depth, model_lookup, data['lakeSources'], opening, used=used_videos)]
    for i, section in enumerate(page['sections'], 1):
        media_name = section.get('media')
        variation=0
        if section.get('layout'):
            out.append(curated_chapter(page, section, i, depth, data, model_lookup, variation=variation, used=used_videos, used_images=used_images))
            continue
        has_media = bool(section.get('media'))
        is_collection = section.get('kind') == 'collection'
        classes = ['editorial-section', 'chapter', 'chapter--' + str(i % 3)]
        if has_media:
            classes.append('chapter--visual')
        if has_media and page['id'] == 'home' and not is_collection:
            classes.append('chapter--cinematic')
        if is_collection:
            classes.append('chapter--collection')
        out.append(
            '<section class="' + ' '.join(classes) + '" id="' + esc(section['id']) + '">'
            '<div class="chapter-shell"><div class="chapter-number"><span>' + str(i).zfill(2) +
            '</span><i></i><span>' + str(len(page['sections'])).zfill(2) + '</span></div>'
            '<div class="chapter-content"><p class="chapter-eyebrow">' + esc(page['title']) + ' / ' +
            esc(str(i).zfill(2)) + '</p><h2>' + esc(section['title']) + '</h2>' +
            ('<p class="chapter-display-subtitle">' + esc(section['displaySubtitle']) + '</p>' if page['id'] == 'home' and section.get('displaySubtitle') else '') +
            ('<p class="english-subtitle">' + esc(section['englishLine']) + '</p>' if section.get('englishLine') else '') +
            '<p class="chapter-description">' + esc(section.get('shortIntro') or section['body']) + '</p>'
        )
        if section.get('source'):
            src = section['source']
            out.append('<a class="source-link" href="' + esc(src['url']) +
                       '" target="_blank" rel="noopener noreferrer">FONTE STORICA <span><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></span> ' +
                       esc(src['label']) + '</a>')
        if section.get('link'):
            destination = next(n for n in data['nav'] if n['id'] == section['link'])
            out.append('<a class="text-link" href="' + esc(site_path(destination['slug'], depth)) +
                       '">ESPLORA ' + esc(destination['label']) + '<span aria-hidden="true"><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a>')
        if section.get('shortIntro'):
            out.append(
                '<details class="chapter-depth"><summary>LEGGI TUTTO <span aria-hidden="true">＋</span></summary>'
                '<div class="chapter-depth-panel"><p>' + esc(section['body']) + '</p></div></details>'
            )
        out.append('</div></div>')
        if has_media:
            out.append('<div class="chapter-media">' +
                       section_media(section['media'], depth, model_lookup, data['lakeSources'], mobile_media=section.get('mobileMedia'), variation=variation, used=used_videos) + '</div>')
        if is_collection:
            out.append('<div class="chapter-collection">' + model_cards(depth, models, data['modelCopy'], used=used_videos) + '</div>')
        out.append('</section>')
    if page['id'] in ('como', 'collection', 'design-craftsmanship'):
        out.append(award_study(page['id'], depth))
    # Dedicated model-accurate images and films from the owner archive.
    out.append(editorial_media_atlas(page,depth,model_lookup,used=used_videos,used_images=used_images))
    if page['id'] not in ('home','contact'):
        nav = data['nav']
        pos = next(i for i, n in enumerate(nav) if n['id'] == page['id'])
        nex = nav[(pos + 1) % len(nav)]
        out.append('<div class="next-chapter"><span>CONTINUA IL VIAGGIO</span>'
                   '<a href="' + esc(site_path(nex['slug'], depth)) + '">' + esc(nex['label']) +
                   ' <span aria-hidden="true"><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div>')
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
    sorted_images = ranked_images(model)
    scene_images=list(sorted_images)
    for clip in [model_film_variant(model)]+list(model.get('extraVideos',[])):
        if clip and clip.get('poster') and clip['poster'] not in scene_images:
            scene_images.append(clip['poster'])
    used_story_images=set()
    for i, (slug, label, paragraph) in enumerate(parts, 1):
        picture=scene_images[i-1] if i<=4 and len(scene_images)>=i else None
        visual=bool(picture)
        if picture: used_story_images.add(picture)
        block = (
            '<section class="editorial-section chapter chapter--' + str(i % 3) +
            (' model-story' if visual else '') + '" id="' + slug + '">'
            '<div class="chapter-shell"><div class="chapter-number"><span>' +
            str(i).zfill(2) + '</span><i></i><span>07</span></div>'
            '<div class="chapter-content"><p class="chapter-eyebrow">LA COLLEZIONE / ' +
            esc(model['name']) + '</p><h2>' + esc(label) + '</h2>' +
            '<p class="chapter-description">' + esc(paragraph) + '</p></div></div>'
        )
        if visual:
            block += (
                '<figure class="model-story-frame"><img src="' + esc(asset(picture, depth)) +
                '" alt="' + esc(model['name']) + ' · original design archive study" loading="lazy" decoding="async">' +
                '<figcaption>' + esc(model['name']) +
                ' / ARCHIVIO PROGETTUALE · NON PRODUZIONE VELLARIO</figcaption></figure>'
            )
        out.append(block + '</section>')
    photos = []
    gallery_photos=[name for name in sorted_images if name not in used_story_images]
    for i, name in enumerate(gallery_photos):
        photos.append(
            '<figure class="gallery-image gallery-image--' + str(i%3) + '"><img src="' +
            esc(asset(name, depth)) + '" alt="' + esc(model['name']) + ' archival rendering ' + str(i+1) +
            '" loading="lazy" decoding="async"><figcaption>' + esc(model['name']) +
            ' / ARCHIVIO PROGETTUALE <span>' + str(i+1).zfill(2) + '</span></figcaption></figure>'
        )

    # Owner original model reels are placed inside the existing gallery without changing the page structure.
    for j, reel in enumerate(sorted(model.get('extraVideos', []),key=media_priority), 1):
        media_url = asset(reel['video'], depth)
        cover = asset(reel['poster'], depth)
        photos.append(
            '<figure class="gallery-image film-frame film-frame--yacht' + (' gallery-film--portrait' if film_orientation(reel)=='portrait' else ' gallery-film--landscape') + '" data-media-frame>'
            '<img class="media-poster" src="' + esc(cover) + '" alt="' + esc(model['name']) + ' film frame" loading="lazy" decoding="async">'
            + ('<img class="portrait-still" src="' + esc(cover) + '" alt="" loading="lazy" decoding="async">' if film_orientation(reel)=='portrait' else '')
            + '<video data-film data-src="' + esc(media_url) + '" muted playsinline loop preload="none" poster="' + esc(cover) + '" aria-label="' + esc(model['name']) + ' original design film"></video>'
            '<button type="button" class="play-film" aria-label="Avvia o ferma il filmato"><span class="play-icon">▶</span><span class="play-label">PLAY FILM</span></button>'
            '<figcaption>' + esc(model['name']) + ' / VIDEO ARCHIVIO <span>' + str(j).zfill(2) + '</span></figcaption></figure>'
        )
    
    if photos:
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
        '">CONTATTI <span aria-hidden="true"><svg class="vellario-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 19 19 5M9 5h10v10" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></div></div></section>'
    )
    out.append(
        '<section class="collection-after"><div class="collection-after-title"><span>LA COLLEZIONE</span>'
        '<h2>Discover the Collection.</h2></div>' + model_cards(depth, models, data['modelCopy']) + '</section>'
    )
    return ''.join(out)

def generate(data,catalog,where):
    models=catalog['models']
    if len(data['nav'])!=7 or [n['id'] for n in data['nav']]!=['home','collection','history-legacy','como','design-craftsmanship','maison','contact']:
        raise ValueError('Sitemap differs from the owner-approved seven-section order')
    if len(models)!=8 or [x['name'] for x in models]!=[
        'Quantum 999','MAS 36','MAS 52','MAS 56','Lariocab','FY70','GranTender 72','Gran Marlin']:
        raise ValueError('Original model registry differs from approved collection')
    if len(data['pages'])!=7 or len(data['modelCopy'])!=8:
        raise ValueError('Expected seven main pages (home included) + eight model descriptions')
    if any(not x.get('poster') for x in models):
        raise ValueError('Every model needs a real poster or a neutral archive placeholder')
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
        # V25: the six selected graphic studies are now integrated as actual
        # editorial chapters. Keep archive files available but never append demos.
        source_css=root_file('site.css',depth)
        source_js=root_file('site.js',depth)
        html_doc=(
          '<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
          '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
          '<meta name="theme-color" content="#050E0B"><meta name="robots" content="noindex,nofollow,noarchive">'
          '<meta name="description" content="'+esc(desc)+'">'
          '<title>'+esc(title)+' | VELLARIO · COMO — THE ART OF DOLCEVITA</title>'
          '<link rel="preconnect" href="https://fonts.googleapis.com">'
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
          '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">'
          '<link rel="stylesheet" href="'+esc(source_css)+'?v=v31-opening-safe-area">'
           '<link rel="stylesheet" href="'+esc(root_file('curated-site.css',depth))+'?v=v31-opening-safe-area">'
           '<script src="'+esc(source_js)+'?v=v31-opening-safe-area" defer></script>'
          '</head><body data-page="'+esc(pid)+'">'
          +header(pid,depth,data)+'<main id="main-content">'+body+'</main>'
          +footer(depth,data)+'</body></html>\n'
        )
        dest=outdir/'index.html'
        dest.write_text(html_doc,encoding='utf-8')
        if '<h1' not in html_doc or '<main' not in html_doc:
            raise ValueError('Generated route missing static core content: '+slug)
        paths.append({'slug':slug,'path':str(dest.relative_to(root)),'name':title,'bytes':len(html_doc.encode('utf-8'))})
    # Preserve old English/French URLs so previously shared site links keep working.
    legacy_redirects = {
        'como': 'como-dolcevita',
        'dolce-vita': 'como-dolcevita',
        'storia-tradizione': 'heritage',
        'design-saper-fare': 'artisanship',
        'collection': 'collezione',
        'history-legacy': 'heritage',
        'design-craftsmanship': 'artisanship',
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
    if len(paths)!=15 or len({x['slug'] for x in paths})!=15:
        raise ValueError('Must generate 15 unique sitemap routes (seven sections + eight models)')
    return paths


def mirror_at_root(mobile_root, public_root):
    """Publish the same generated pages at the project URL root.

    Keep /mobile/ working for old links; static CSS/JS remain in mobile/,
    while all branded images and films remain in root assets/. No copied
    source logic, duplicate media or external build dependencies.
    """
    mobile_root = Path(mobile_root)
    public_root = Path(public_root)
    manifest = json.loads((mobile_root / 'route-manifest.json').read_text(encoding='utf-8'))
    paths = manifest['routes'] + manifest['redirects']
    copied = []
    for entry in paths:
        rel = Path(entry['path'])
        depth = len(rel.parts) - 1
        source_html = (mobile_root / rel).read_text(encoding='utf-8')
        html_doc = source_html
        if entry in manifest['routes']:
            from_assets = '../' * (depth + 1) + 'assets/'
            to_assets = '../' * depth + 'assets/'
            if from_assets not in html_doc:
                raise ValueError('Canonical page missing an expected media asset: ' + str(rel))
            html_doc = html_doc.replace(from_assets, to_assets)
            for filename in ('site.css', 'curated-site.css', 'site.js'):
                from_file = ('../' * depth or './') + filename
                to_file = ('../' * depth or './') + 'mobile/' + filename
                if from_file not in html_doc:
                    raise ValueError('Canonical page missing a script or stylesheet: ' + str(rel) + ' / ' + filename)
                html_doc = html_doc.replace(from_file, to_file)
            if 'mobile/site.js?v=v31-opening-safe-area' not in html_doc:
                raise ValueError('Root page did not retain versioned script: ' + str(rel))
            if '<main' not in html_doc or '<h1' not in html_doc:
                raise ValueError('Root page missing substantive HTML: ' + str(rel))
        target = public_root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html_doc, encoding='utf-8')
        copied.append(str(rel))
    root_manifest = dict(manifest)
    root_manifest['note'] = 'Public 16-page canonical root. Assets: /assets. Shared CSS/JS: /mobile. Legacy /mobile URLs remain valid.'
    (public_root / 'route-manifest.json').write_text(
        json.dumps(root_manifest, indent=2) + '\n', encoding='utf-8')

    # A single machine-readable sitemap, derived only from real canonical routes.
    # It intentionally excludes /mobile/ mirrors and all legacy redirects.
    from xml.etree import ElementTree as ET
    ns = 'http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('', ns)
    urlset = ET.Element('{'+ns+'}urlset')
    origin = 'https://mconforzi.github.io/vellario-como-site/'
    for entry in manifest['routes']:
        route = entry['slug'].strip('/')
        loc = origin + (quote(route, safe='/-')+'/' if route else '')
        ET.SubElement(ET.SubElement(urlset, '{'+ns+'}url'), '{'+ns+'}loc').text = loc
    if len(urlset) != manifest['count']:
        raise ValueError('Sitemap route count does not match canonical pages')
    ET.indent(urlset, space='  ')
    ET.ElementTree(urlset).write(public_root/'sitemap.xml', encoding='utf-8', xml_declaration=True)
    return copied

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--out',required=True)
    parser.add_argument('--root-out',default=None,help='Mirror all routes into the public site root with shared mobile/ assets')
    parser.add_argument('--site-data',default='mobile/site-content.json')
    parser.add_argument('--catalog',default='mobile/catalog.json')
    args=parser.parse_args()
    d=json.loads(Path(args.site_data).read_text(encoding='utf-8'))
    m=json.loads(Path(args.catalog).read_text(encoding='utf-8'))
    made=generate(d,m,args.out)
    mirrored=mirror_at_root(args.out,args.root_out) if args.root_out else []
    print(json.dumps({'generated':len(made),'root_pages':len(mirrored),'routes':made},indent=2))
