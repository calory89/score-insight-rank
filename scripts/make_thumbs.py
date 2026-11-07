#!/usr/bin/env python3
"""Card thumbnails for realhunt.co (7-nov-2026).

Makes a 480 px wide WebP copy (target under 40 KB) of every home photo in the static snapshot, for the cards and
mini-cards (src/lib/thumbs.ts). The home page gallery keeps the full photos.

    python3 scripts/make_thumbs.py <rh-static.json> <local finds dir> <site root in webs-estaticas>

Writes <site root>/t/finds/<name>.webp and <site root>/t/sb/<name>.webp. Add-only: a thumbnail that already exists
is never rewritten and nothing is ever deleted (realhunt-media is built from this folder). Sources, in order: the
local repo copy (public/finds), the copy already in the deploy tree, then a download (Supabase bucket or
realhunt-media). Failures are counted and skipped; the site falls back to the original photo.

Keep thumb_key() in sync with thumb() in src/lib/thumbs.ts.
"""
import io
import json
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

MEDIA = "https://realhunt-media.pages.dev"
FINDS = re.compile(r"^(?:https://realhunt-media\.pages\.dev|https://realhunt\.co)?/finds/([A-Za-z0-9][A-Za-z0-9._-]{0,180})\.(?:webp|jpe?g|png)$", re.I)
SUPA = re.compile(r"^https://oykcsmextclpdnugixqz\.supabase\.co/storage/v1/object/public/realhunt-finds/([A-Za-z0-9][A-Za-z0-9._-]{0,180})\.(?:webp|jpe?g|png)$", re.I)
WIDTH, MAX_H, TARGET = 480, 720, 40 * 1024
# Photos written in the code and shown as small tiles (VIBE_FALLBACK in src/community/v6.tsx).
EXTRA = ["/finds/DdOGB56ABXI-0.webp", "/finds/lake-como-peglio-85000-0.webp", "/finds/lake-como-plesio-89000-0.webp", "/finds/DcAr2EbIAqx-1.webp",
         "/finds/Dc56aI-icMP-1.webp", "/finds/DdPBLT2CLlb-1.webp", "/finds/acquappesa-sea-view-39000.webp", "/finds/grotte-santo-stefano-13000.webp"]
UA = {"User-Agent": "realhunt-thumbs/1.0 (+https://realhunt.co)"}


def thumb_key(url):
    """'finds/<name>.webp' or 'sb/<name>.webp' for a photo URL, None when there is no thumbnail for it."""
    m = FINDS.match(url or "")
    if m:
        return f"finds/{m.group(1)}.webp"
    m = SUPA.match(url or "")
    if m:
        return f"sb/{m.group(1)}.webp"
    return None


def make(data):
    from PIL import Image  # imported here so --selftest runs without Pillow
    im = Image.open(io.BytesIO(data))
    im = im.convert("RGB")
    im.thumbnail((WIDTH, MAX_H), Image.LANCZOS)
    out = b""
    for q in (62, 52, 42):
        b = io.BytesIO()
        im.save(b, "WEBP", quality=q, method=6)
        out = b.getvalue()
        if len(out) <= TARGET:
            break
    return out


def source_bytes(url, local_dir, site_root):
    m = FINDS.match(url)
    if m:
        name = url.rsplit("/", 1)[1]
        for p in (os.path.join(local_dir, name), os.path.join(site_root, "finds", name)):
            if os.path.isfile(p):
                with open(p, "rb") as fh:
                    return fh.read()
        url = MEDIA + "/finds/" + name
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
        return r.read()


def main(rows_path, local_dir, site_root):
    with open(rows_path) as fh:
        snap = json.load(fh)
    rows = snap.get("rows", snap) if isinstance(snap, dict) else snap
    urls = [u for r in rows for u in (r.get("image_urls") or [])] + EXTRA
    todo, seen = [], set()
    for u in urls:
        k = thumb_key(u)
        if not k or k in seen:
            continue
        seen.add(k)
        if not os.path.exists(os.path.join(site_root, "t", k)):
            todo.append((u, k))
    stats = {"made": 0, "failed": 0, "bytes": 0}

    def one(item):
        u, k = item
        try:
            out = make(source_bytes(u, local_dir, site_root))
            dst = os.path.join(site_root, "t", k)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            tmp = dst + ".tmp"
            with open(tmp, "wb") as fh:
                fh.write(out)
            os.replace(tmp, dst)
            return len(out)
        except Exception as e:  # noqa: BLE001 - one bad photo must not stop the rest
            print(f"thumb failed {u}: {e}", file=sys.stderr)
            return -1

    with ThreadPoolExecutor(max_workers=max(2, (os.cpu_count() or 2) * 2)) as ex:
        for n in ex.map(one, todo):
            if n < 0:
                stats["failed"] += 1
            else:
                stats["made"] += 1
                stats["bytes"] += n
    avg = stats["bytes"] / stats["made"] / 1024 if stats["made"] else 0
    line = f"thumbnails: {len(seen)} photos, {len(seen) - len(todo)} already there, {stats['made']} made (avg {avg:.0f} KB), {stats['failed']} failed"
    print(line)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as fh:
            fh.write(line + "\n")


def selftest():
    assert thumb_key("/finds/a-b_c.1.webp") == "finds/a-b_c.1.webp"
    assert thumb_key(MEDIA + "/finds/x-0.jpg") == "finds/x-0.webp"
    assert thumb_key("https://oykcsmextclpdnugixqz.supabase.co/storage/v1/object/public/realhunt-finds/us-0.webp") == "sb/us-0.webp"
    assert thumb_key("https://cdn.example.com/x.jpg") is None
    assert thumb_key("/finds/../x.webp") is None
    assert thumb_key("/top/x.webp") is None
    print("selftest ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        selftest()
    elif len(sys.argv) == 4:
        main(*sys.argv[1:])
    else:
        print(__doc__)
        sys.exit(2)
