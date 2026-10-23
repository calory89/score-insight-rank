#!/usr/bin/env python3
"""Tell Bing, Yandex, Seznam and Naver (IndexNow) which RealHunt pages are new or changed.
Reads the homes in src/data/deal-meta.json (refreshed by og_cards.py) plus the main list pages.
Key file: public/dc4a9477773c2eb3d504053f5db16785.txt. Google does not use IndexNow; it reads the sitemap built by seo/prerender.ts."""
import json, os, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://realhunt.co"
KEY = "dc4a9477773c2eb3d504053f5db16785"
deals = json.load(open(os.path.join(ROOT, "src", "data", "deal-meta.json")))
countries = sorted({(d.get("country") or "").lower().replace(" ", "-") for d in deals if d.get("country")})
urls = [f"{SITE}/", f"{SITE}/map", f"{SITE}/best", f"{SITE}/cheap-houses"] + [f"{SITE}/homes/{c}" for c in countries] + [f"{SITE}/deal/{d['slug']}" for d in deals]
body = json.dumps({"host": "realhunt.co", "key": KEY, "urlList": urls[:10000]}).encode()
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "RealHunt-indexnow/1.0 (+https://realhunt.co)"})
try:
    r = urllib.request.urlopen(req, timeout=60); print("indexnow", r.status, len(urls), "urls")
except Exception as e:
    print("indexnow failed:", e)
