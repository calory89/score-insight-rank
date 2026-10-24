#!/usr/bin/env python3
"""After rh-auto-publish: wait until realhunt.co serves this build, then check it.

Fails (exit 1, so GitHub emails the owner) when the build does not go live within 15 minutes, the sitemap has
fewer than 1,000 URLs, a key page is not 200, or any sitemap URL does not answer 200.
Usage: python3 scripts/post_publish_check.py <commit-sha>
"""
import json, re, sys, time, random, urllib.request
from concurrent.futures import ThreadPoolExecutor

SITE = "https://realhunt.co"
UA = {"User-Agent": "RealHuntPostPublishCheck/1.0 (+https://realhunt.co)"}
want = (sys.argv[1] if len(sys.argv) > 1 else "")[:7]

def get(url, tries=4):
    for i in range(tries):
        try:
            sep = "&" if "?" in url else "?"
            r = urllib.request.urlopen(urllib.request.Request(f"{url}{sep}_c={random.randint(1, 10**9)}", headers=UA), timeout=30)
            return r.status, r.read().decode("utf8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) and i < tries - 1: time.sleep(10 * (i + 1)); continue  # Cloudflare rate limit: back off
            if e.code < 500 or i == tries - 1: return e.code, ""
        except Exception:
            if i == tries - 1: return 0, ""
        time.sleep(3)

problems = []
deadline = time.time() + 900
while True:
    st, body = get(f"{SITE}/build.json")
    live = (json.loads(body).get("commit") if st == 200 and body.strip().startswith("{") else None)
    if not want or live == want: break
    if time.time() > deadline: print(f"::error::build {want} not live after 15 min (live: {live})"); sys.exit(1)
    time.sleep(20)
print("live build:", live)

st, idx = get(f"{SITE}/sitemap.xml")
parts = re.findall(r"<loc>([^<]+)</loc>", idx)
urls = []
for p in parts: urls += re.findall(r"<loc>([^<]+)</loc>", get(p)[1])
urls = sorted(set(urls))
print("sitemap parts", len(parts), "urls", len(urls))
if len(urls) < 1000: problems.append(f"sitemap has only {len(urls)} URLs")

KEY = ["/", "/method", "/new", "/guide", "/costs", "/countries", "/research/prices", "/homes/spain", "/feed.xml", "/llms.txt", "/data/rh-static.json"]
for k in KEY:
    s, b = get(SITE + k)
    if s != 200 or len(b) < 500: problems.append(f"{k}: HTTP {s}, {len(b)} bytes")

# Gently (4 at a time): a burst from a GitHub runner gets rate-limited by Cloudflare and would look like an outage.
res = list(ThreadPoolExecutor(4).map(lambda u: (u, get(u)[0]), urls))
codes = {}
for _, s in res: codes[s] = codes.get(s, 0) + 1
print("status codes:", codes)
bad = [(u, s) for u, s in res if s != 200]
if bad and all(s in (403, 429) for _, s in bad) and len(bad) > len(urls) / 2:
    print("::warning::most URLs were refused with 403/429 from this runner (rate limit, not an outage); key pages decide")
    bad = []
problems += [f"{u}: HTTP {s}" for u, s in bad[:30]]
if len(bad) > 30: problems.append(f"... and {len(bad) - 30} more")

# Photos: the first photo of every home and its small variant must be a real image (24-oct-2026 the photos
# vanished for hours because their folder was trimmed; this catches it on the next publish).
def img(u):
    for i in range(4):
        try:
            r = urllib.request.urlopen(urllib.request.Request(f"https://realhunt-media.pages.dev{u}?_c={random.randint(1, 10**9)}", headers=UA), timeout=30)  # the app loads photos from here
            return u, r.status, r.headers.get("content-type", "")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) and i < 3: time.sleep(10 * (i + 1)); continue
            return u, e.code, ""
        except Exception:
            time.sleep(3)
    return u, 0, ""
import os
VARIANTS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data", "image-variants.json")))  # what the app asks for
st, body = get(f"{SITE}/data/rh-static.json")
rows = json.loads(body).get("rows", []) if st == 200 else []
photos = []
for r in rows:
    first = next((x for x in (r.get("image_urls") or []) if str(x).startswith("/")), None)
    if first: photos += [first] + ([VARIANTS[first]] if first in VARIANTS else [])
pres = list(ThreadPoolExecutor(3).map(img, photos))
small_set = set(VARIANTS.values())
pbad = [(u, s, ct) for u, s, ct in pres if s != 200 or not ct.startswith("image")]
small_missing = [u for u, s, ct in pbad if u in small_set]
pbad = [x for x in pbad if x[0] not in small_set]
print(f"photos checked {len(pres)}, main photos broken {len(pbad)}, small variants missing {len(small_missing)}")
if pbad: problems.append(f"{len(pbad)} home photos are not images, e.g. {pbad[0][0]} ({pbad[0][1]} {pbad[0][2]})")
if small_missing: problems.append(f"{len(small_missing)} small photo variants missing, e.g. {small_missing[0]}")

for p in problems: print("::error::" + p)
print("OK" if not problems else f"{len(problems)} problems")
sys.exit(1 if problems else 0)
