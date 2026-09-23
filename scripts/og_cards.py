#!/usr/bin/env python3
"""RealHunt share cards + static SEO data.

For every published home: a 1200x630 JPG card (public/og/deal/<slug>.jpg) that WhatsApp, X, Facebook
and LinkedIn show when someone shares the link, plus src/data/deal-meta.json (read at build time by
the prerender plugin in vite.config.ts) and public/sitemap.xml. Runs in GitHub Actions every day.
"""
import io, json, os, sys, urllib.request, datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUPA = "https://nylmhdtlshhtjkuvfbms.supabase.co"
KEY = os.environ.get("RH_ANON_KEY") or open(os.path.join(ROOT, "scripts", "anon.key")).read().strip()
SITE = "https://realhunt.co"
FONT = os.path.join(ROOT, "scripts", "fonts")
W, H = 1200, 630

def rpc(fn, args):
    req = urllib.request.Request(f"{SUPA}/rest/v1/rpc/{fn}", data=json.dumps(args).encode(),
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req, timeout=60))

def all_rows():
    rows, off = [], 0
    while True:
        d = rpc("community_feed", {"p": {"scope": "all", "limit": 100, "offset": off}})
        rows += d["rows"]; off += 100
        if off >= d["total"] or not d["rows"]: return rows

def money(n): return "€" + f"{int(n):,}"

def nice_title(d):
    import re
    t = re.sub(r"^\s*€\s?[\d.,]+\s*(k\b)?\s*[·\-–:|]\s*", "", d.get("title") or "", flags=re.I).strip()
    if not t or re.match(r"^property\s*[-–]?\s*\w*$", t, re.I):
        t = f"{str(d['sqm']) + ' m² home' if d.get('sqm') else 'Home'} in {d.get('location_name') or d.get('country') or 'Europe'}"
    return t

def fetch_img(path):
    local = os.path.join(ROOT, "public", path.lstrip("/")) if path.startswith("/") else None
    if local and os.path.exists(local): return Image.open(local).convert("RGB")
    url = path if path.startswith("http") else SITE + path
    raw = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "RealHunt-cards/1.0"}), timeout=60).read()
    return Image.open(io.BytesIO(raw)).convert("RGB")

def cover(img, w, h):
    r = max(w / img.width, h / img.height)
    img = img.resize((int(img.width * r) + 1, int(img.height * r) + 1), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))

def wrap(draw, text, font, maxw, lines=2):
    words, out, cur = text.split(), [], ""
    for wd in words:
        test = (cur + " " + wd).strip()
        if draw.textlength(test, font=font) <= maxw: cur = test
        else:
            out.append(cur); cur = wd
            if len(out) == lines: break
    if len(out) < lines and cur: out.append(cur)
    if len(out) == lines and " ".join(out) != text:
        while draw.textlength(out[-1] + "…", font=font) > maxw and " " in out[-1]: out[-1] = out[-1].rsplit(" ", 1)[0]
        out[-1] += "…"
    return out

def card(d, dest):
    img = fetch_img(d["image_urls"][0])
    base = cover(img, W, H)
    shade = Image.new("L", (1, H))
    for y in range(H):
        shade.putpixel((0, y), int(max(0, (y - 220) / (H - 220)) ** 1.3 * 235))
    shade = shade.resize((W, H))
    base = Image.composite(Image.new("RGB", (W, H), (14, 13, 10)), base, shade)
    dr = ImageDraw.Draw(base)
    fb = ImageFont.truetype(os.path.join(FONT, "Poppins-Bold.ttf"), 92)
    fm = ImageFont.truetype(os.path.join(FONT, "Poppins-Medium.ttf"), 40)
    fr = ImageFont.truetype(os.path.join(FONT, "Poppins-Regular.ttf"), 28)
    fs = ImageFont.truetype(os.path.join(FONT, "Poppins-Bold.ttf"), 30)
    # brand pill
    dr.rounded_rectangle((48, 44, 318, 104), radius=30, fill=(255, 255, 255))
    dr.rounded_rectangle((62, 54, 102, 94), radius=10, fill=(20, 20, 20))
    dr.line([(71, 80), (82, 68), (93, 80)], fill=(255, 255, 255), width=5)
    dr.ellipse((78, 81, 86, 89), fill=(14, 165, 233))
    dr.text((114, 55), "RealHunt", font=fs, fill=(20, 20, 20))
    y = H - 60
    loc = (d.get("location_name") or d.get("country") or "")
    meta = loc + (f"  ·  {d['sqm']} m²" if d.get("sqm") else "")
    dr.text((56, y - 34), meta, font=fr, fill=(235, 232, 224))
    import re
    title = re.sub(r"\s+for\s+€[\d,.]+$", "", nice_title(d))
    lines = wrap(dr, title, fm, W - 112, 2)
    y2 = y - 44 - 52 * len(lines)
    for i, ln in enumerate(lines): dr.text((56, y2 + i * 52), ln, font=fm, fill=(255, 255, 255))
    dr.text((52, y2 - 118), money(d["price_eur"]), font=fb, fill=(255, 255, 255))
    base.save(dest, "JPEG", quality=78, optimize=True, progressive=True)

def default_card(rows):
    top = rows[:3]
    base = Image.new("RGB", (W, H), (250, 248, 243))
    for i, d in enumerate(top):
        try: base.paste(cover(fetch_img(d["image_urls"][0]), 400, 380), (i * 400, 250))
        except Exception: pass
    dr = ImageDraw.Draw(base)
    fb = ImageFont.truetype(os.path.join(FONT, "Poppins-Bold.ttf"), 64)
    fm = ImageFont.truetype(os.path.join(FONT, "Poppins-Medium.ttf"), 32)
    dr.rounded_rectangle((56, 50, 104, 98), radius=12, fill=(20, 20, 20))
    dr.line([(67, 81), (80, 67), (93, 81)], fill=(255, 255, 255), width=6)
    dr.ellipse((75, 83, 85, 93), fill=(14, 165, 233))
    dr.text((118, 52), "RealHunt", font=fm, fill=(20, 20, 20))
    dr.text((56, 110), "Real homes under €100,000.", font=fb, fill=(22, 21, 15))
    dr.text((56, 186), "Found by people. Ranked by your votes.", font=fm, fill=(58, 56, 47))
    base.save(os.path.join(ROOT, "public", "og-default-100k.jpg"), "JPEG", quality=82, optimize=True)

def main():
    rows = [r for r in all_rows() if r.get("image_urls") and r.get("price_eur")]
    outdir = os.path.join(ROOT, "public", "og", "deal"); os.makedirs(outdir, exist_ok=True)
    if "--default" in sys.argv or not os.path.exists(os.path.join(ROOT, "public", "og-default-100k.jpg")): default_card(rows)
    made = 0
    for d in rows:
        dest = os.path.join(outdir, f"{d['slug']}.jpg")
        if os.path.exists(dest) and "--force" not in sys.argv: continue
        try: card(d, dest); made += 1
        except Exception as e: print("card failed", d["slug"], e)
    meta = []
    for d in rows:
        t = nice_title(d); p = money(d["price_eur"]); loc = d.get("location_name") or d.get("country") or ""
        title = f"{p} · {t}" if p not in t else t
        desc = f"{t}{'' if p in t else ' for ' + p}. {loc}. Voted by people on RealHunt, where every home costs under €100,000."
        img = f"{SITE}/og/deal/{d['slug']}.jpg" if os.path.exists(os.path.join(outdir, f"{d['slug']}.jpg")) else (SITE + d["image_urls"][0] if d["image_urls"][0].startswith("/") else d["image_urls"][0])
        meta.append({"slug": d["slug"], "title": title, "desc": desc, "image": img, "country": d.get("country")})
    os.makedirs(os.path.join(ROOT, "src", "data"), exist_ok=True)
    json.dump(meta, open(os.path.join(ROOT, "src", "data", "deal-meta.json"), "w"), ensure_ascii=False, indent=0)
    today = datetime.date.today().isoformat()
    countries = sorted({(d.get("country") or "").lower() for d in rows if d.get("country")})
    urls = [f"{SITE}/", f"{SITE}/map", f"{SITE}/swipe", f"{SITE}/leaderboard", f"{SITE}/winners", f"{SITE}/help-buying", f"{SITE}/alerts"]
    urls += [f"{SITE}/guide/{c}" for c in ("italy", "spain", "portugal")]
    for c in countries:
        urls.append(f"{SITE}/homes/{c}")
        urls += [f"{SITE}/homes/{c}/under-{p}" for p in (20000, 40000, 60000, 80000)]
    urls += [f"{SITE}/deal/{d['slug']}" for d in rows]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
        f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n" for u in urls) + "</urlset>\n"
    open(os.path.join(ROOT, "public", "sitemap.xml"), "w").write(xml)
    print(f"{len(rows)} homes, {made} new cards, {len(urls)} sitemap urls")

if __name__ == "__main__":
    main()
