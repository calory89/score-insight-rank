#!/usr/bin/env python3
"""Card thumbnails for realhunt.co (7-nov-2026).

Makes a 480 px wide WebP copy (target under 40 KB) of every home photo in the static snapshot, for the cards and
mini-cards (src/lib/thumbs.ts). The home page gallery keeps the full photos.

    python3 scripts/make_thumbs.py <rh-static.json> <local finds dir> <site root in webs-estaticas>

Writes <site root>/t/finds/<name>.webp and <site root>/t/sb/<name>.webp. Add-only: a thumbnail that already exists
is never rewritten and nothing is ever deleted (realhunt-media is built from this folder). Sources, in order: the
local repo copy (public/finds), the copy already in the deploy tree, then a download (Supabase bucket or
realhunt-media). Failures are counted and skipped; the site falls back to the original photo.

15-nov-2026: also a mid-size copy (800 px wide, target under 90 KB) of the MAIN photo of each home, for the top of
the home page on a phone, where the full photo (up to 1,440 px and 275 KB) is more than the screen can show. Written
to <site root>/t/m/finds/<name>.webp and t/m/sb/<name>.webp. Same rules: add-only, failures skipped.

21-nov-2026: the mid-size copy is made for EVERY main photo (a photo narrower than 800 px is re-encoded at its own
size; before, only photos wider than 1,000 px had one, so every run downloaded about 300 photos just to measure them
and MID_PHOTOS stayed off). After the run the script writes <site root>/t/index.txt, one line per copy that exists
(finds/<name>.webp, sb/<name>.webp, m/finds/<name>.webp, m/sb/<name>.webp). scripts/build_static.py reads it from
realhunt-media and marks each row of the snapshot (th, tm), and the app only asks for copies a row is marked with
(learnThumbs in src/lib/thumbs.ts). Exit code 1 when a photo of a published home is left without its copy (the
publish goes on: that home shows its original photo), with the list in the output.

28-nov-2026: the Pages project realhunt-media takes 20,000 files at most and the publish stops at 19,600
(.github/workflows/rh-auto-publish.yml, "Commit, check and push"). With 1,006 homes the new copies alone pushed the
deploy over that and the whole publish stopped. Now the script counts the room that is left (room_for_new_files)
and, when the new copies do not all fit, makes only the ones of the homes that fit whole (fit_to_budget), in the
order of the snapshot. The others are named in the output and made by a later run, once there is room; until then
those homes show their original photo (their row has th = 0), exactly as when a copy fails.

Keep thumb_key() in sync with thumb() and mid() in src/lib/thumbs.ts.
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
MID_WIDTH, MID_MAX_H, MID_TARGET = 800, 1200, 90 * 1024
# Photos written in the code and shown as small tiles (VIBE_FALLBACK in src/community/v6.tsx).
EXTRA = ["/finds/DdOGB56ABXI-0.webp", "/finds/lake-como-peglio-85000-0.webp", "/finds/lake-como-plesio-89000-0.webp", "/finds/DcAr2EbIAqx-1.webp",
         "/finds/Dc56aI-icMP-1.webp", "/finds/DdPBLT2CLlb-1.webp", "/finds/acquappesa-sea-view-39000.webp", "/finds/grotte-santo-stefano-13000.webp"]
UA = {"User-Agent": "realhunt-thumbs/1.0 (+https://realhunt.co)"}
# Keep in sync with the realhunt-media check in .github/workflows/rh-auto-publish.yml (guard 19,600, at least 1,300
# shared assets added by the Pages build). RESERVE is left free for the pages and data files of the next days.
PAGES_GUARD, SHARED_MIN, RESERVE = 19600, 1300, 150


def thumb_key(url):
    """'finds/<name>.webp' or 'sb/<name>.webp' for a photo URL, None when there is no thumbnail for it."""
    m = FINDS.match(url or "")
    if m:
        return f"finds/{m.group(1)}.webp"
    m = SUPA.match(url or "")
    if m:
        return f"sb/{m.group(1)}.webp"
    return None


def make(data, width=WIDTH, max_h=MAX_H, target=TARGET, qualities=(62, 52, 42), min_source=0):
    """WebP copy of a photo, `width` px wide at most. None when the photo is not wider than `min_source`."""
    from PIL import Image  # imported here so --selftest runs without Pillow
    im = Image.open(io.BytesIO(data))
    if min_source and im.size[0] <= min_source:
        return None
    im = im.convert("RGB")
    im.thumbnail((width, max_h), Image.LANCZOS)
    out = b""
    for q in qualities:
        b = io.BytesIO()
        im.save(b, "WEBP", quality=q, method=6)
        out = b.getvalue()
        if len(out) <= target:
            break
    return out


def make_mid(data):
    return make(data, MID_WIDTH, MID_MAX_H, MID_TARGET, (74, 66, 58))


def mid_key(url):
    """'m/finds/<name>.webp' or 'm/sb/<name>.webp': the mid-size copy of a main photo."""
    k = thumb_key(url)
    return "m/" + k if k else None


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


def room_for_new_files(rows_path, site_root):
    """How many more files the realhunt-media deploy can take, None when this is not the publish layout
    (<dist>/data/<snapshot> next to <dist>/assets, and the site folder present): then nothing is limited."""
    dist_assets = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(rows_path))), "assets")
    if not os.path.isdir(site_root) or not os.path.isdir(dist_assets):
        return None
    have = sum(len(files) for _, _, files in os.walk(site_root))
    shared = max(SHARED_MIN, sum(len(files) for _, _, files in os.walk(dist_assets)))
    return max(0, PAGES_GUARD - shared - have - RESERVE)


def fit_to_budget(rows, todo, budget):
    """The copies of `todo` that fit in `budget` new files, whole homes only and in the order of the snapshot (a home
    with half its copies still shows its original photos, so half a home would be wasted files)."""
    want = {k: u for u, k in todo}
    kept, used = [], set()
    for r in rows:
        urls = r.get("image_urls") or []
        keys = [k for k in dict.fromkeys(thumb_key(u) for u in urls) if k and k in want and k not in used]
        mk = mid_key(next(iter(urls), None))
        if mk and mk in want and mk not in used:
            keys.append(mk)
        if not keys or len(kept) + len(keys) > budget:
            continue
        used.update(keys)
        kept += [(want[k], k) for k in keys]
    return kept


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
    # mid-size copies: the first photo of each home
    mids = []
    for r in rows:
        first = next(iter(r.get("image_urls") or []), None)
        k = mid_key(first)
        if not k or k in seen:
            continue
        seen.add(k)
        if not os.path.exists(os.path.join(site_root, "t", k)):
            mids.append((first, k))
    todo += mids
    room = room_for_new_files(rows_path, site_root)
    left_out = 0
    if room is not None and len(todo) > room:
        fits = fit_to_budget(rows, todo, room)
        left_out = len(todo) - len(fits)
        print(f"thumbnails: {left_out} of {len(todo)} new copies not made, realhunt-media has room for {room} more files only (limit 20,000); those homes show their original photo")
        todo = fits
    stats = {"made": 0, "failed": 0, "bytes": 0, "mid": 0}

    def one(item):
        u, k = item
        try:
            data = source_bytes(u, local_dir, site_root)
            out = make_mid(data) if k.startswith("m/") else make(data)
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
            elif n > 0:
                stats["made"] += 1
                stats["bytes"] += n
    avg = stats["bytes"] / stats["made"] / 1024 if stats["made"] else 0
    have = write_index(site_root)
    missing = sorted(k for k in seen if k not in have)
    line = f"thumbnails: {len(seen)} copies wanted ({len(mids)} mid-size to make), {len(seen) - len(todo) - left_out} already there, {left_out} left for a later run (no room), {stats['made']} made (avg {avg:.0f} KB), {stats['failed']} failed; t/index.txt lists {len(have)}; {len(missing)} still missing"
    print(line)
    for k in missing[:50]:
        print("  missing:", k)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as fh:
            fh.write(line + "\n")
    return 1 if missing else 0


def write_index(site_root):
    """Writes <site root>/t/index.txt: every copy under t/ (finds, sb, m/finds, m/sb), sorted. Returns the set."""
    base = os.path.join(site_root, "t")
    have = set()
    for sub in ("finds", "sb", "m/finds", "m/sb"):
        d = os.path.join(base, sub)
        if os.path.isdir(d):
            have.update(f"{sub}/{f}" for f in os.listdir(d) if f.endswith(".webp") and os.path.getsize(os.path.join(d, f)) > 0)
    os.makedirs(base, exist_ok=True)
    tmp = os.path.join(base, "index.txt.tmp")
    with open(tmp, "w") as fh:
        fh.write("".join(k + "\n" for k in sorted(have)))
    os.replace(tmp, os.path.join(base, "index.txt"))
    return have


def mark_rows(rows, have):
    """th / tm on each row (see src/lib/thumbs.ts learnThumbs): th = 1 when every photo with a copy rule has its
    480 px copy, tm = 1 when the main photo has its 800 px copy. Used by scripts/build_static.py."""
    for r in rows:
        keys = [k for k in (thumb_key(u) for u in (r.get("image_urls") or [])) if k]
        r["th"] = 1 if keys and all(k in have for k in keys) else 0
        mk = mid_key(next(iter(r.get("image_urls") or []), None))
        r["tm"] = 1 if mk and mk in have else 0
    return rows


def selftest():
    assert thumb_key("/finds/a-b_c.1.webp") == "finds/a-b_c.1.webp"
    assert thumb_key(MEDIA + "/finds/x-0.jpg") == "finds/x-0.webp"
    assert thumb_key("https://oykcsmextclpdnugixqz.supabase.co/storage/v1/object/public/realhunt-finds/us-0.webp") == "sb/us-0.webp"
    assert thumb_key("https://cdn.example.com/x.jpg") is None
    assert thumb_key("/finds/../x.webp") is None
    assert thumb_key("/top/x.webp") is None
    assert mid_key("/finds/a-0.webp") == "m/finds/a-0.webp"
    assert mid_key(MEDIA + "/finds/x-0.jpg") == "m/finds/x-0.webp"
    assert mid_key("https://cdn.example.com/x.jpg") is None
    try:
        from PIL import Image
    except ImportError:
        print("selftest ok (Pillow not installed: sizes not checked)")
        return
    def photo(w, h):
        b = io.BytesIO()
        Image.new("RGB", (w, h), (120, 90, 60)).save(b, "JPEG")
        return b.getvalue()
    assert Image.open(io.BytesIO(make(photo(1440, 960)))).size == (480, 320)
    assert Image.open(io.BytesIO(make_mid(photo(1440, 960)))).size == (800, 533)
    assert Image.open(io.BytesIO(make_mid(photo(600, 400)))).size == (600, 400)  # a small photo keeps its size
    rows = mark_rows([{"image_urls": ["/finds/a-0.webp", "/finds/a-1.webp"]}, {"image_urls": ["/finds/b-0.webp", "https://x.com/y.jpg"]}, {"image_urls": []}],
                     {"finds/a-0.webp", "finds/a-1.webp", "m/finds/a-0.webp", "finds/b-0.webp"})
    assert [(r["th"], r["tm"]) for r in rows] == [(1, 1), (1, 0), (0, 0)], rows
    rows2 = [{"image_urls": ["/finds/a-0.webp", "/finds/a-1.webp"]}, {"image_urls": ["/finds/b-0.webp"]}, {"image_urls": ["/finds/c-0.webp", "/finds/c-1.webp"]}]
    todo2 = [(u, thumb_key(u)) for r in rows2 for u in r["image_urls"]] + [(r["image_urls"][0], mid_key(r["image_urls"][0])) for r in rows2]
    assert [k for _, k in fit_to_budget(rows2, todo2, 5)] == ["finds/a-0.webp", "finds/a-1.webp", "m/finds/a-0.webp", "finds/b-0.webp", "m/finds/b-0.webp"]
    assert [k for _, k in fit_to_budget(rows2, todo2, 2)] == ["finds/b-0.webp", "m/finds/b-0.webp"]  # the first home does not fit, the second does
    assert fit_to_budget(rows2, todo2, 0) == [] and len(fit_to_budget(rows2, todo2, 99)) == len(todo2)
    assert room_for_new_files("/nonexistent/data/x.json", "/nonexistent/site") is None
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "t", "m", "sb"))
        open(os.path.join(d, "t", "m", "sb", "c-0.webp"), "wb").write(b"x")
        assert write_index(d) == {"m/sb/c-0.webp"}
        assert open(os.path.join(d, "t", "index.txt")).read() == "m/sb/c-0.webp\n"
    print("selftest ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        selftest()
    elif len(sys.argv) == 4:
        sys.exit(main(*sys.argv[1:]))
    else:
        print(__doc__)
        sys.exit(2)
