#!/usr/bin/env python3
"""After a publish: every script, style and chunk the live realhunt.co (and go.realhunt.co, which redirects there)
pages load must answer 200. Follows chunk imports inside the JS/CSS too, so a file removed from the shared assets/
by prune_shared_assets.py that a page still needs is caught. Exit 1 (GitHub emails the owner) on any miss.
"""
import re, sys, time, random, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "RealHuntPostPublishCheck/1.0 (+https://realhunt.co)"}
PAGES = ["https://realhunt.co/", "https://realhunt.co/map", "https://realhunt.co/homes/spain", "https://realhunt.co/new",
         "https://realhunt.co/guide", "https://realhunt.co/hunt", "https://go.realhunt.co/", "https://go.realhunt.co/about.html"]
HTML_REF = re.compile(r'''(?:https://realhunt\.co)?/assets/([A-Za-z0-9_$.~-]+\.(?:js|mjs|css|woff2?|svg|png|webp|json))''')
JS_REF = re.compile(r'''(?:assets/|["'`(]\./)([A-Za-z0-9_$.~-]+\.(?:js|mjs|css|woff2?|ttf|svg|png|webp|json))''')

def get(url, tries=5):
    for i in range(tries):
        try:
            sep = "&" if "?" in url else "?"
            r = urllib.request.urlopen(urllib.request.Request(f"{url}{sep}_c={random.randint(1, 10**9)}", headers=UA), timeout=30)
            return r.status, r.geturl(), r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 429, 500, 502, 503) and i < tries - 1: time.sleep(8 * (i + 1)); continue
            return e.code, url, b""
        except Exception:
            if i == tries - 1: return 0, url, b""
            time.sleep(3)

problems, seen, todo = [], set(), set()
for p in PAGES:
    st, final, body = get(p)
    print(f"{p} -> {st} {final.split('?')[0]} ({len(body)} bytes)")
    if st != 200 or len(body) < 500: problems.append(f"{p}: HTTP {st}"); continue
    refs = set(HTML_REF.findall(body.decode("utf8", "replace")))
    if not refs: problems.append(f"{p}: no /assets/ files referenced (unexpected)")
    todo |= refs
while todo:
    batch = sorted(todo - seen); seen |= todo; todo = set()
    for name, (st, _, body) in zip(batch, ThreadPoolExecutor(4).map(lambda n: get(f"https://realhunt.co/assets/{n}"), batch)):
        if st != 200: problems.append(f"/assets/{name}: HTTP {st}"); continue
        if name.endswith((".js", ".mjs", ".css")): todo |= set(JS_REF.findall(body.decode("utf8", "replace")))
print(f"assets checked: {len(seen)}")
for p in problems[:40]: print("::error::" + p)
print("OK" if not problems else f"{len(problems)} problems")
sys.exit(1 if problems else 0)
