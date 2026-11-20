#!/usr/bin/env python3
"""Tell Bing, Yandex, Seznam, Naver and Yep (IndexNow) which RealHunt pages are new or changed.

15-nov-2026: the list now comes from the sitemaps, so every kind of page and every language is sent (Spanish today;
Russian, German and the rest as soon as their pages are in a sitemap; Yandex reads the same IndexNow list), not only
the homes. A page is sent when its <lastmod> is at most DAYS days old; pages without a date are sent only with --all.
Sitemaps are read from dist/ when a build is there, else from the live site. If neither can be read, the old list
(homes of src/data/deal-meta.json and the country pages) is sent, as before.

20-nov-2026: the build also leaves .rh-indexnow.json (seo/reach/index.ts indexNowChanges): the pages that are new,
changed (their text changed) or removed against the build that was live when it ran, homes first. When that file is
from today, those pages go first, so a new or changed home is sent the same day it is published, and a removed one
too (IndexNow takes removed addresses as well).

Usage: python3 scripts/indexnow.py [--days 3] [--all] [--dry-run] [--dist dist] [--changes .rh-indexnow.json]
Key file: public/dc4a9477773c2eb3d504053f5db16785.txt. Google does not use IndexNow; it reads the sitemaps."""
import argparse, datetime, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://realhunt.co"
KEY = "dc4a9477773c2eb3d504053f5db16785"
UA = {"User-Agent": "RealHunt-indexnow/1.1 (+https://realhunt.co)"}
ALWAYS = ["/", "/new", "/homes", "/research", "/research/data-changelog", "/blog", "/es", "/es/new"]
URL_RE = re.compile(r"<url>\s*<loc>([^<]+)</loc>(?:\s*<lastmod>([^<]+)</lastmod>)?")


def parse_sitemap(xml):
    """[(url, lastmod or None)] of one sitemap file."""
    return [(u.replace("&amp;", "&"), d or None) for u, d in URL_RE.findall(xml)]


def read_local(dist):
    out = []
    if not os.path.isdir(dist): return out
    for f in sorted(os.listdir(dist)):
        if re.fullmatch(r"sitemap-[a-z0-9-]+\.xml", f) and f not in ("sitemap-news.xml", "sitemap-video.xml"):
            out += parse_sitemap(open(os.path.join(dist, f), encoding="utf8").read())
    return out


def read_live():
    get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read().decode("utf8", "replace")
    parts = re.findall(r"<sitemap>\s*<loc>([^<]+)</loc>", get(SITE + "/sitemap.xml"))
    out = []
    for p in parts:
        if p.startswith(SITE + "/sitemap-"): out += parse_sitemap(get(p))
    return out


def legacy():
    deals = json.load(open(os.path.join(ROOT, "src", "data", "deal-meta.json")))
    countries = sorted({(d.get("country") or "").lower().replace(" ", "-") for d in deals if d.get("country")})
    return [f"{SITE}/", f"{SITE}/map", f"{SITE}/best", f"{SITE}/homes"] + [f"{SITE}/homes/{c}" for c in countries] + [f"{SITE}/deal/{d['slug']}" for d in deals]


def pick(entries, days, today, everything=False):
    """The URLs to send: changed in the last `days` days, plus the pages that change every day. Order kept, no repeats."""
    since = (today - datetime.timedelta(days=days)).isoformat()
    known = {u for u, _ in entries}
    urls = [SITE + p if p != "/" else SITE + "/" for p in ALWAYS if (SITE + p if p != "/" else SITE + "/") in known]
    urls += [u for u, d in entries if everything or (d and d[:10] >= since)]
    seen, out = set(), []
    for u in urls:
        if u.startswith(SITE) and u not in seen: seen.add(u); out.append(u)
    return out


def read_changes(path, today):
    """New, changed and removed URLs written by the build today, homes first; [] when the file is old or missing."""
    try:
        d = json.load(open(path, encoding="utf8"))
    except Exception:
        return []
    if d.get("built") != today.isoformat() or not d.get("compared"):
        return []
    return [u for k in ("removed", "added", "changed") for u in d.get(k) or [] if isinstance(u, str) and u.startswith(SITE)]


def merge(first, rest):
    seen, out = set(), []
    for u in list(first) + list(rest):
        if u not in seen: seen.add(u); out.append(u)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=3)
    ap.add_argument("--all", action="store_true", help="send every page of the sitemaps")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--dist", default=os.path.join(ROOT, "dist"))
    ap.add_argument("--changes", default=os.path.join(ROOT, ".rh-indexnow.json"))
    a = ap.parse_args(argv)
    source, entries = "dist", read_local(a.dist)
    if not entries:
        try: source, entries = "live", read_live()
        except Exception as e: print("indexnow: live sitemaps not readable:", e)
    if entries: urls = pick(entries, a.days, datetime.date.today(), a.all)
    else:
        source = "legacy"
        try: urls = legacy()
        except Exception as e: print("indexnow: nothing to send:", e); return 0
    changes = read_changes(a.changes, datetime.datetime.now(datetime.timezone.utc).date())
    if changes:
        print(f"indexnow: {len(changes)} new, changed or removed pages from this build first")
        urls = merge(changes, urls)
    langs = {}
    for u in urls:
        m = re.match(r"https://realhunt\.co/([a-z]{2})(/|$)", u); k = m.group(1) if m and m.group(1) in ("es", "de", "ru", "fr", "nl", "pl") else "en"; langs[k] = langs.get(k, 0) + 1
    print(f"indexnow: {len(urls)} urls from {source} ({', '.join(f'{k} {v}' for k, v in sorted(langs.items()))})")
    if a.dry_run or not urls: return 0
    for i in range(0, len(urls), 10000):
        body = json.dumps({"host": "realhunt.co", "key": KEY, "keyLocation": f"{SITE}/{KEY}.txt", "urlList": urls[i:i + 10000]}).encode()
        req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8", **UA})
        try:
            r = urllib.request.urlopen(req, timeout=60); print("indexnow", r.status, len(urls[i:i + 10000]), "urls")
        except Exception as e:
            print("indexnow failed:", e)
    return 0


if __name__ == "__main__":
    sys.exit(main())
