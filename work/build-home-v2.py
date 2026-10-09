"""Home v2 patch (run after build-seo.py and build-extras.py).

Injects work/home-v2.css + work/home-v2.js into src/generated/home.html and swaps the
card template, logo, search options and comparison table for the v2 versions.
Idempotent: exits if the v2 marker is already present.
"""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
GEN = ROOT / 'src' / 'generated'
H = GEN / 'home.html'
s = H.read_text()
MARK = 'home-v2-2026-09-22'
if MARK in s:
    print('already v2'); sys.exit(0)

def sub1(old, new, label):
    global s
    n = s.count(old)
    if n != 1: raise SystemExit(f'anchor {label}: found {n}')
    s = s.replace(old, new)

css = (ROOT / 'work' / 'home-v2.css').read_text() + '\n' + (ROOT / 'work' / 'home-v3.css').read_text()
js = (ROOT / 'work' / 'home-v2.js').read_text() + '\n' + (ROOT / 'work' / 'home-v3.js').read_text()
seo = json.loads((GEN / 'seo-data.json').read_text())
cities = seo['cities'] if isinstance(seo, dict) else seo
cc = {}
for c in cities:
    if c.get('cc') and c.get('country'): cc[c['country']] = c['cc']
js = js.replace('__CC__', json.dumps(cc, ensure_ascii=False, separators=(',', ':')))

# enrich the inline Rome record (other cities come enriched from /api/catalogue)
hx = json.loads((GEN / 'hotel-extras.json').read_text()) if (GEN / 'hotel-extras.json').exists() else {}
cx = json.loads((GEN / 'city-extras.json').read_text()) if (GEN / 'city-extras.json').exists() else {}
k = s.find('const HOTELS=')
inline, _ = json.JSONDecoder().raw_decode(s[k + len('const HOTELS='):])
enrich = {}
for cid, d in inline.items():
    hs = [hx.get(re.sub(r'^https://www\.booking\.com', '', (h.get('booking') or {}).get('url', '').split('?')[0])) for h in d['hotels']]
    enrich[cid] = {'c': cx.get(cid, {}), 'h': hs}
    # galleries: use the (checked, Booking.com) photos from the packed catalogue
    pk = json.loads((GEN / 'catalogue-packed.json').read_text()); PS, PSC = pk['dictionary']
    def un(v):
        if isinstance(v, dict) and set(v) == {'s'}: return PS[v['s']]
        if isinstance(v, list):
            if v and v[0] == -1: return [un(x) for x in v[1:]]
            if v and v[0] == -2: return {kk: un(x) for kk, x in zip(PSC[v[1]], v[2:])}
            return [un(x) for x in v]
        return v
    if cid in pk['cities']:
        pc = un(pk['cities'][cid])
        enrich[cid]['g'] = [[g for g in (ph.get('gallery') or []) if 'onthebeach' not in (g.get('src') or '')] for ph in pc['hotels']]
js = js.replace('// Trip filters', "(()=>{const X=%s;for(const id in X){const d=HOTELS[id];if(!d)continue;d.extras=X[id].c;d.hotels.forEach((h,i)=>{if(X[id].h[i])h.extras=X[id].h[i];if(X[id].g&&X[id].g[i]&&X[id].g[i].length)h.gallery=X[id].g[i];});}})();\n// Trip filters" % json.dumps(enrich, ensure_ascii=False, separators=(',', ':')), 1)

# 0. Travelpayouts (Drive link monetisation, marker 576921), loaded after the page is idle
TP = '<script data-noptimize="1" data-cfasync="false" data-no-defer="1" data-cmp-ab="2">(function(){function tp(){var s=document.createElement("script");s.async=1;s.setAttribute("data-cmp-ab","2");s.src="https://tp-em.com/NTc2OTIx.js?t=576921";document.head.appendChild(s);}function go(){(window.requestIdleCallback||function(f){setTimeout(f,1500)})(tp);}if(document.readyState==="complete")go();else addEventListener("load",go);})();</script>'
sub1('</head>', TP + '</head>', 'head')
# 1. CSS + JS
sub1('</style>', f'/* {MARK} */\n{css}</style>', 'style')
sub1("(function(){\n  let q;try{q=new URLSearchParams", js + "\n(function(){\n  let q;try{q=new URLSearchParams", 'init')

# 2. photo-first card template
i = s.find("$('cards').innerHTML=data.hotels.map((h,i)=>`<article class=\"card ")
j = s.find("</article>`).join('');", i)
if i < 0 or j < 0: raise SystemExit('anchor cards')
s = s[:i] + "$('cards').innerHTML=data.hotels.map((h,i)=>cardHTML(h,i,data)).join('');" + s[j + len("</article>`).join('');"):]

# 3. gallery fallback: city photo when the hotel has no photos yet
sub1("function galleryHTML(h,i){if(!h.gallery.length)return ",
     "function galleryHTML(h,i){const _cd=HOTELS[currentCity],_hero=_cd&&_cd.extras&&_cd.extras.hero;if(!h.gallery.length&&_hero&&_hero.img)return `<a class=\"photo gallery\" href=\"${escapeHTML(h.booking.url)}\" target=\"_blank\" rel=\"noopener noreferrer\" aria-label=\"See photos of ${escapeHTML(h.name)} on Booking.com\"><div class=\"gallery-track\"><div class=\"gallery-slide\"><img src=\"/api/img/${encodeURIComponent(currentCity)}/big\" alt=\"${escapeHTML(_cd.city)}\" loading=\"lazy\" decoding=\"async\"></div></div><span class=\"v2-cityphoto\">City photo · hotel photos on Booking.com ↗</span></a>`;if(!h.gallery.length)return ",
     'gallery')

# 4. hero banner + trip filters
sub1('<section class="results" id="results" aria-labelledby="city-title">',
     '<section class="results" id="results" aria-labelledby="city-title"><div class="v2-hero" id="v2-hero"' + (' hidden><img alt="" decoding="async">' if not cx.get('rome', {}).get('hero') else '><img class="loaded" data-hero="rome" alt="Rome" fetchpriority="high" src="/api/img/rome/mid" srcset="/api/img/rome/small 500w, /api/img/rome/mid 960w, /api/img/rome/big 1280w" sizes="(max-width: 900px) 100vw, 1180px">') + '<small></small></div>', 'results')
sub1('<div class="mobile-overview">', '<div class="v2-filters" id="v2-filters"></div><p id="v2-filter-note" role="status"></p><div class="mobile-overview">', 'mobile-overview')

# 5. logo mark: three bars in the category colours
sub1('<span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>',
     '<svg width="22" height="20" viewBox="0 0 22 20" aria-hidden="true"><rect x="0" y="8" width="6" height="12" rx="2" fill="#1f7a5a"/><rect x="8" y="0" width="6" height="20" rx="2" fill="#d83b51"/><rect x="16" y="4" width="6" height="16" rx="2" fill="#b8860b"/></svg>', 'logo')

# 6. search options with photo thumbnails + flags
sub1("`<div class=\"option\" role=\"option\" id=\"city-option-${i}\" data-option=\"${i}\" aria-selected=\"false\"><span>${escapeHTML(c.city)}</span><small>${escapeHTML(c.country)} · ${c.curated?'3 picks':'3 picks'}</small></div>`",
     "`<div class=\"option\" role=\"option\" id=\"city-option-${i}\" data-option=\"${i}\" aria-selected=\"false\"><img class=\"v2-thumb\" src=\"/api/thumb/${encodeURIComponent(c.id)}\" loading=\"lazy\" alt=\"\" onerror=\"this.style.visibility='hidden'\"><span>${escapeHTML(c.city)}</span><small>${flag(CC[c.country])} ${escapeHTML(c.country)} · 3 picks</small></div>`",
     'options')

# 7. visual comparison table: location, walk time and facilities
yes = lambda t: f"h=>tagsOf(h).includes('{t}')?'<span aria-label=\"yes\">✓</span>':'<span aria-label=\"not listed\">—</span>'"
sub1("['Amenities',h=>h.attributes.map(escapeHTML).join(' · ')||'See property details']];",
     "['Location score',h=>h.extras&&h.extras.loc?String(h.extras.loc)+' / 10':'—'],['Walk to sights',h=>escapeHTML(walkText(h,c))||'—']," +
     ",".join(f"['{l}',{yes(t)}]" for t, l in [('breakfast', '🍳 Breakfast'), ('pool', '🏊 Pool'), ('parking', '🅿️ Free parking'), ('pets', '🐾 Pets'), ('family', '👨‍👩‍👧 Family rooms'), ('spa', '💆 Spa')]) +
     ",['Amenities',h=>h.attributes.map(escapeHTML).join(' · ')||'See property details']];", 'decision')

# 8. live destination count + direct-flight hubs for the Danish airports
m8 = re.search(r'const DESTINATIONS=', s); dl, _ = json.JSONDecoder().raw_decode(s[m8.end():])
s = s.replace('1,283 destinations', f'{len(dl):,} destinations').replace('1,283 DESTINATIONS', f'{len(dl):,} DESTINATIONS')
sub1('<p class="dir-more">', '<p class="dir-more">Direct flights from Denmark: <a href="/from/billund">Billund</a> · <a href="/from/aalborg">Aalborg</a> · <a href="/from/aarhus">Aarhus</a></p><p class="dir-more">', 'dir-more')
# 9. v3 redesign: header, magazine hero, quick dates, chips, byline, rich footer, lighter page
N = f'{len(dl):,}'
s, n9 = re.subn(r'<nav aria-label="Main navigation">.*?</nav>', '<nav aria-label="Main navigation"><a href="/how-we-choose">How we choose</a><a href="/destinations" class="v3-keep">Destinations</a><a href="/lists">Best-of lists</a><a class="v3-cta" href="/partners">For hotels</a><label class="sr-only" for="v3-lang-sel">Language</label><select id="v3-lang-sel" aria-label="Language" onchange="if(this.value)location.href=this.value"><option value="" selected>English</option><option value="/es">Español</option><option value="/de">Deutsch</option><option value="/fr">Français</option><option value="/it">Italiano</option><option value="/pt">Português</option><option value="/da">Dansk</option></select></nav>', s, count=1, flags=re.S)
assert n9 == 1, 'nav'
s = s.replace('</svg>top3hotels<em>.</em></a>', '</svg><span>top3hotels<em>.</em></span></a>', 1)
s = s.replace('<rect x="0" y="8" width="6" height="12" rx="2" fill="#1f7a5a"/><rect x="8" y="0" width="6" height="20" rx="2" fill="#d83b51"/><rect x="16" y="4" width="6" height="16" rx="2" fill="#b8860b"/>', '<rect x="0" y="9" width="6" height="11" rx="1.8" fill="#1f7a5a"/><rect x="8" y="0" width="6" height="20" rx="1.8" fill="#d83b51"/><rect x="16" y="4.5" width="6" height="15.5" rx="1.8" fill="#c9971c"/>', 1)
sub1('<section class="hero" aria-labelledby="headline">', '<section class="hero" aria-labelledby="headline"><div class="v3-bg" id="v3-bg" aria-hidden="true"></div><span class="v3-credit" id="v3-credit" aria-hidden="true"></span>', 'hero')
sub1('<div id="date-error" class="error" role="alert"></div>', '<div class="v3-quick"><span>Quick dates:</span><button type="button" data-v3q="-1">This weekend</button><button type="button" data-v3q="-2">Next weekend</button><button type="button" data-v3q="30">In a month</button></div><div id="date-error" class="error" role="alert"></div>', 'date-error')
s, n9 = re.subn(r'(<div class="popular" aria-label="Popular destinations"><span>Some favourites:</span>).*?(</div>)', r'\1' + ''.join(f'<button class="city-chip" data-city="{i}">{c}</button>' for i, c in [('london', 'London'), ('paris', 'Paris'), ('amsterdam-netherlands', 'Amsterdam'), ('rome', 'Rome'), ('barcelona', 'Barcelona'), ('copenhagen-denmark', 'Copenhagen'), ('billund-denmark', 'Billund'), ('tokyo', 'Tokyo')]) + r'\2', s, count=1, flags=re.S)
assert n9 == 1, 'popular'
s = re.sub(r'\d[\d,]* destinations with three picks', f'{N} destinations with three picks', s, count=1)
s, n9 = re.subn(r'(<a id="city-page-link"[^>]*>.*?</a>)', r'\1<p class="v3-byline"><span>Selected with the Top3Hotels method · Updated 8 October 2026</span><span>Independent</span><span>No paid rankings</span></p>', s, count=1, flags=re.S)
assert n9 == 1, 'byline'
s, n9 = re.subn(r'<details class="dir-all">.*?</details>', '', s, count=1, flags=re.S)
assert n9 == 1, 'dir-all'
FOOT = ('<footer class="v3"><div class="cols"><div><a class="logo" href="/"><span>top3hotels<em>.</em></span></a><p style="max-width:340px;margin:12px 0 0">The best hotel in every city, picked in 1 second. Independent · No paid rankings.</p></div>'
        '<div><h3>Explore</h3><ul><li><a href="/destinations">All destinations</a></li><li><a href="/lists">Best-of lists</a></li><li><a href="/from/billund">✈ Billund</a></li><li><a href="/from/aalborg">✈ Aalborg</a></li><li><a href="/from/aarhus">✈ Aarhus</a></li><li><a href="/cheap-cities">Cheapest cities</a></li><li><a href="/saved">♡ Saved</a></li><li><a href="/random">🎲 Surprise me</a></li></ul></div>'
        '<div><h3>Company</h3><ul><li><a href="/about">About us</a></li><li><a href="/how-we-choose">How we choose</a></li><li><a href="/partners">For hotels</a></li><li><a href="/contact">Contact</a></li></ul></div>'
        '<div><h3>Legal</h3><ul><li><a href="/privacy">Privacy</a></li><li><a href="/cookies">Cookies</a></li><li><a href="/terms">Terms</a></li><li><a href="/imprint">Imprint</a></li><li><a href="/sitemap.xml">Sitemap</a></li></ul></div></div>'
        '<div class="fine"><span>© 2026 Top3Hotels · Equinox Investment Group LLC (Wyoming, United States)</span><span>Booking links may earn us a commission at no cost to you. Reference prices, not live quotes.</span></div></footer>')
s, n9 = re.subn(r'<footer>.*?</footer>', FOOT, s, count=1, flags=re.S)
assert n9 == 1, 'footer'

# 10. trust & collab pass: cookie consent, affiliate disclosure, spotlight, stats, for-hotels band
TP_OLD = '<script data-noptimize="1" data-cfasync="false" data-no-defer="1" data-cmp-ab="2">(function(){function tp(){var s=document.createElement("script");s.async=1;s.setAttribute("data-cmp-ab","2");s.src="https://tp-em.com/NTc2OTIx.js?t=576921";document.head.appendChild(s);}function go(){(window.requestIdleCallback||function(f){setTimeout(f,1500)})(tp);}if(document.readyState==="complete")go();else addEventListener("load",go);})();</script>'
TP_NEW = ("<script>(function(){var K='t3-consent',v=null;try{v=localStorage.getItem(K)}catch(_){}function tp(){var s=document.createElement('script');s.async=1;s.setAttribute('data-cmp-ab','2');s.src='https://tp-em.com/NTc2OTIx.js?t=576921';document.head.appendChild(s)}function go(){(window.requestIdleCallback||function(f){setTimeout(f,1500)})(tp)}if(v==='yes'){if(document.readyState==='complete')go();else addEventListener('load',go);return}if(v==='no')return;addEventListener('DOMContentLoaded',function(){var b=document.createElement('div');b.className='cbar';b.setAttribute('role','dialog');b.setAttribute('aria-label','Cookies');b.innerHTML='<p>We use cookies for booking-partner tracking and basic statistics. Essential cookies are always on. <a href=\"/cookies\">Cookie policy</a></p><button type=\"button\" class=\"btn-ghost\" data-c=\"no\">Reject</button><button type=\"button\" class=\"btn-solid\" data-c=\"yes\">Accept</button>';b.addEventListener('click',function(e){var c=e.target.getAttribute&&e.target.getAttribute('data-c');if(!c)return;try{localStorage.setItem(K,c)}catch(_){}b.remove();if(c==='yes')go()});document.body.appendChild(b)})})();</script>")
assert TP_OLD in s, 'tp'
s = s.replace(TP_OLD, TP_NEW, 1)
s = s.replace('<li><a href="/imprint">Imprint</a></li><li><a href="/sitemap.xml">Sitemap</a></li></ul></div></div>', '<li><a href="/imprint">Imprint</a></li><li><a href="/affiliate-disclosure">Affiliate disclosure</a></li><li><a href="/sitemap.xml">Sitemap</a></li></ul></div></div>', 1)
s = s.replace('<span>Booking links may earn us a commission at no cost to you. Reference prices, not live quotes.</span>', '<span>Booking links may earn us a commission at no cost to you; it never changes our picks (<a href="/affiliate-disclosure">disclosure</a>). Reference prices, not live quotes.</span>', 1)
SPOT = ('<section class="v3-band" aria-labelledby="v3-spot-h"><div class="v3-stats"><div><b>' + N + '</b><span>destinations</span></div><div><b>' + f'{len(dl)*3:,}' + '</b><span>hotel picks</span></div><div><b>' + str(len(cc)) + '</b><span>countries</span></div><div><b>7</b><span>languages</span></div></div>'
        '<div class="v3-spot"><a class="big" href="/london"><img src="/api/img/london/mid" alt="London" loading="lazy" decoding="async"><span><small>City guide</small><strong id="v3-spot-h">London: the 3 best hotels</strong><em>Neighbourhoods, airports, when to go, and our Budget, Best Value and Luxury picks.</em></span></a>'
        '<a href="/paris"><img src="/api/img/paris/small" alt="Paris" loading="lazy" decoding="async"><span><small>City guide</small><strong>Paris</strong></span></a>'
        '<a href="/amsterdam-netherlands"><img src="/api/img/amsterdam-netherlands/small" alt="Amsterdam" loading="lazy" decoding="async"><span><small>City guide</small><strong>Amsterdam</strong></span></a></div>'
        '<div class="v3-collab"><div><h2>Run a hotel? Work with Top3Hotels.</h2><p>We are filming our London picks in late October 2026. Hotels can get a free badge, or apply for a clearly labelled partner feature with photos and video. Our three picks are never for sale.</p></div><a href="/partners">For hotels →</a></div></section>')
s = s.replace('<footer class="v3">', SPOT + '<footer class="v3">', 1)

# 11. professional listing note (was "final editorial review pending") + live city count
OLDN = "$('listing-note').textContent='Booking.com snapshots · 19–20 Sep 2026; individual dates shown on each card. Reference stay: 10–12 Nov 2026 · 2 adults · 1 room. Rates and scores may change. Preselected from a limited provider sample; final editorial review pending.';"
assert OLDN in s, 'listing-note'
s = s.replace(OLDN, "$('listing-note').textContent='Booking.com reference data checked in October 2026; each card shows its own check date. Reference stay: 10–12 Nov 2026 · 2 adults · 1 room. Rates and scores change, so always confirm the final price on the booking site.';", 1)
s = s.replace("$('listing-note').textContent='1283 cities have three preselected hotels.';", "$('listing-note').textContent='" + N + " cities, three hotels each.';", 1)

# 12. current counts and check date everywhere
s, n12 = re.subn(r'1283 destinations · 3,849 real hotel listings · Booking\.com snapshots: 19–20 Sep(?:tember)? 2026', N + ' destinations · ' + f'{len(dl)*3:,}' + ' hotel picks · Booking.com data checked in October 2026', s)
assert n12 >= 1, 'endnote'
sub1('</head>', '<link rel="icon" href="/icon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="preload" href="/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" as="image" href="/api/img/london/mid" media="(min-width: 700px)"><link rel="preload" as="image" href="/api/img/london/small" media="(max-width: 699px)"></head>', 'head2')
H.write_text(s)
print('home v2 ok', len(s), 'bytes; countries', len(cc))
