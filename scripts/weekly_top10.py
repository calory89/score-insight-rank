#!/usr/bin/env python3
"""Weekly Top 10: writes "The 10 best home deals this week" into src/data/blog.json and src/data/blog-es.json.

Picks the 10 highest-scored homes approved in the last 7 days (14, then 30 days if fewer than 10 passed the
check), leaving out homes already listed in an earlier weekly post. One post per ISO week: if this week's post
exists, nothing changes. All copy comes from the data fields (title, place, price, size, bedrooms, score,
description); nothing is invented. Run by .github/workflows/weekly-top10.yml every Monday.

  python3 scripts/weekly_top10.py                 # live snapshot from realhunt.co
  python3 scripts/weekly_top10.py --source public/data/rh-static.json --now 2026-11-07T12:00:00Z --dry-run
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import math
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = "https://realhunt.co/data/rh-static.json"
MEDIA = "https://realhunt-media.pages.dev"
SLUG_PREFIX = "best-home-deals-this-week-"
WINDOWS = (7, 14, 30)
TOP_N = 10
MIN_POST = 5  # below this, even after 30 days, no post that week

MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
COUNTRY_ES = {
    "Spain": "España", "Italy": "Italia", "United States": "Estados Unidos", "Denmark": "Dinamarca", "Sweden": "Suecia",
    "France": "Francia", "Japan": "Japón", "Poland": "Polonia", "Germany": "Alemania", "Netherlands": "Países Bajos",
    "Greece": "Grecia", "Switzerland": "Suiza", "Mexico": "México", "Canada": "Canadá", "Bulgaria": "Bulgaria",
    "Dominican Republic": "República Dominicana", "Cyprus": "Chipre", "Portugal": "Portugal", "United Kingdom": "Reino Unido",
    "Norway": "Noruega", "Scandinavia": "Escandinavia",
}


# ---------------------------------------------------------------- selection (unit-tested in test_weekly_top10.py)
def parse_ts(s: str | None) -> dt.datetime | None:
    if not s:
        return None
    try:
        t = dt.datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


def live_at(r: dict) -> dt.datetime | None:
    """When the home passed the check (approved_at), or when it went live if that is missing."""
    return parse_ts(r.get("approved_at")) or parse_ts(r.get("publish_at"))


def eligible(r: dict) -> bool:
    return bool(r.get("slug")) and (r.get("price_eur") or 0) > 0 and r.get("nota") is not None and bool(r.get("title"))


def rank_key(r: dict):
    t = live_at(r)
    return (-(r.get("nota") or 0), r.get("rank") if r.get("rank") is not None else 10**9, -(t.timestamp() if t else 0), r.get("slug", ""))


def select(rows: list[dict], now: dt.datetime, exclude: set[str] = frozenset(), n: int = TOP_N):
    """Returns (homes, days): the n best-scored homes approved in the smallest window that has n of them."""
    best: list[dict] = []
    for days in WINDOWS:
        start = now - dt.timedelta(days=days)
        pool = [r for r in rows if eligible(r) and r["slug"] not in exclude and (t := live_at(r)) and start <= t <= now]
        pool.sort(key=rank_key)
        if len(pool) >= n:
            return pool[:n], days
        best = pool
    return (best[:n], WINDOWS[-1]) if len(best) >= MIN_POST else ([], WINDOWS[-1])


def iso_week(now: dt.datetime) -> str:
    y, w, _ = now.isocalendar()
    return f"{y}-w{w:02d}"


def week_slug(now: dt.datetime) -> str:
    return SLUG_PREFIX + iso_week(now)


def featured_slugs(posts: list[dict]) -> set[str]:
    """Homes already listed in earlier weekly posts, so a home is not picked twice."""
    out: set[str] = set()
    for p in posts:
        if str(p.get("slug", "")).startswith(SLUG_PREFIX):
            out.update(re.findall(r'href="/deal/([A-Za-z0-9_-]+)"', p.get("html", "")))
    return out


# ---------------------------------------------------------------- copy
def no_dash(s: str) -> str:
    return re.sub(r"\s*—\s*", ", ", str(s or "")).strip()


def eur(n: float) -> str:
    return "€" + f"{round(n):,}"


def eur_es(n: float) -> str:
    return f"{round(n):,}".replace(",", ".") + " €"


def img(r: dict) -> str:
    u = (r.get("image_urls") or [""])[0] or ""
    return MEDIA + u if u.startswith("/") else u


def sentences(s: str, k: int = 2) -> str:
    parts = re.split(r"(?<=[.!?])\s+", no_dash(s))
    return " ".join(parts[:k]).strip()


def date_range(a: dt.date, b: dt.date, lang: str) -> str:
    m = MONTHS_EN if lang == "en" else MONTHS_ES
    if lang == "en":
        if a.year != b.year:
            return f"{a.day} {m[a.month-1]} {a.year} to {b.day} {m[b.month-1]} {b.year}"
        if a.month != b.month:
            return f"{a.day} {m[a.month-1]} to {b.day} {m[b.month-1]} {b.year}"
        return f"{a.day} to {b.day} {m[b.month-1]} {b.year}"
    if a.year != b.year:
        return f"del {a.day} de {m[a.month-1]} de {a.year} al {b.day} de {m[b.month-1]} de {b.year}"
    if a.month != b.month:
        return f"del {a.day} de {m[a.month-1]} al {b.day} de {m[b.month-1]} de {b.year}"
    return f"del {a.day} al {b.day} de {m[b.month-1]} de {b.year}"


def join_list(xs: list[str], lang: str) -> str:
    if len(xs) <= 1:
        return "".join(xs)
    return ", ".join(xs[:-1]) + (" and " if lang == "en" else " y ") + xs[-1]


def card(r: dict, title: str, score_word: str) -> str:
    e = html.escape
    return (f'<figure class="rh-home"><a href="/deal/{e(r["slug"])}"><img src="{e(img(r))}" alt="{e(title)}" loading="lazy" width="640" height="480">'
            f'<figcaption><strong>{e(eur(r["price_eur"]))} · {score_word} {e(str(r["nota"]))}/100</strong>{e(title)}<span>{e(no_dash(r.get("location_name") or r.get("country") or ""))}</span></figcaption></a></figure>')


def facts(r: dict, lang: str) -> str:
    out = [eur(r["price_eur"]) if lang == "en" else eur_es(r["price_eur"])]
    if r.get("sqm"):
        out.append(f'{r["sqm"]} m²')
        out.append((eur(r["price_eur"] / r["sqm"]) if lang == "en" else eur_es(r["price_eur"] / r["sqm"])) + "/m²")
    if r.get("bedrooms"):
        b = r["bedrooms"]
        out.append(f"{b} {'bedroom' if b == 1 else 'bedrooms'}" if lang == "en" else f"{b} {'dormitorio' if b == 1 else 'dormitorios'}")
    out.append(f'{"score" if lang == "en" else "nota"} {r["nota"]}/100')
    return " · ".join(out)


def build_post(homes: list[dict], days: int, now: dt.datetime, lang: str, es_map: dict[str, str]) -> dict:
    e = html.escape
    n = len(homes)
    end = now.date()
    start = (now - dt.timedelta(days=days)).date()
    span = date_range(start, end, lang)
    prices = [h["price_eur"] for h in homes]
    countries = []
    for h in homes:
        c = h.get("country") or ""
        c = COUNTRY_ES.get(c, c) if lang == "es" else c
        if c and c not in countries:
            countries.append(c)
    t = lambda r: no_dash(es_map.get(r["title"], r["title"]) if lang == "es" else r["title"])  # noqa: E731
    words = 0
    if lang == "en":
        title = f"The {n} best home deals this week: {span}"
        desc = f"The {n} highest-scored homes that passed our check from {span}, in {join_list(countries, 'en')}, priced from {eur(min(prices))} to {eur(max(prices))}."
        intro = (f"Every week we take the homes that passed RealHunt's hand check in the last 7 days and list the {n} with the highest score. "
                 + ("" if days == 7 else f"Fewer than {TOP_N} new homes passed in the last 7 days, so this list covers the last {days} days. ")
                 + f"This week they are in {join_list(countries, 'en')}, priced from {eur(min(prices))} to {eur(max(prices))}.")
        how = ("A person checks every home before it goes up, and homes that need major work, ruins, bare land and thin listings are turned down. "
               "The score then compares each home with every other home on RealHunt, from 70 to 98. Homes already listed in an earlier weekly Top 10 are left out.")
        note = "Prices are the asking prices when each home was added. Homes sell, so check the listing before you travel."
        links = '<p><a href="/new">All new homes, newest first</a> · <a href="/alerts">Get new homes by email</a> · <a href="/method">How the score works</a></p>'
        h_list, h_how, word = "The list", "How we pick", "score"
    else:
        title = f"Las {n} mejores casas de la semana: {span}"
        desc = f"Las {n} viviendas con mejor nota que pasaron nuestra revisión {span}, en {join_list(countries, 'es')}, de {eur_es(min(prices))} a {eur_es(max(prices))}."
        intro = (f"Cada semana tomamos las viviendas que pasaron la revisión a mano de RealHunt en los últimos 7 días y publicamos las {n} con mejor nota. "
                 + ("" if days == 7 else f"En los últimos 7 días pasaron menos de {TOP_N} viviendas nuevas, así que esta lista cubre los últimos {days} días. ")
                 + f"Esta semana están en {join_list(countries, 'es')}, con precios de {eur_es(min(prices))} a {eur_es(max(prices))}.")
        how = ("Una persona revisa cada vivienda antes de publicarla, y rechazamos las que necesitan obras grandes, ruinas, terrenos sin casa y anuncios con poca información. "
               "La nota compara cada vivienda con todas las demás de RealHunt, de 70 a 98. Dejamos fuera las que ya salieron en un Top 10 semanal anterior.")
        note = "Los precios son los pedidos cuando se añadió cada vivienda. Las casas se venden, así que comprueba el anuncio antes de viajar."
        links = '<p><a href="/new">Todas las viviendas nuevas</a> · <a href="/alerts">Recibe las nuevas por email</a> · <a href="/method">Cómo funciona la nota</a></p>'
        h_list, h_how, word = "La lista", "Cómo elegimos", "nota"
    items = []
    for i, r in enumerate(homes, 1):
        why = r.get("why_great") or ""
        why = es_map.get(why, "") if lang == "es" else why
        why = sentences(why, 2)
        items.append(f'<li><a href="/deal/{e(r["slug"])}"><strong>{e(t(r))}</strong></a>, {e(no_dash(r.get("location_name") or r.get("country") or ""))}. {e(facts(r, lang))}.'
                     + (f" {e(why)}" if why else "") + "</li>")
        words += len((t(r) + " " + why).split())
    body = (f"<p>{e(intro)}</p>\n<div class=\"rh-homes\">" + "".join(card(r, t(r), word) for r in homes) + "</div>\n"
            f"<h2>{h_list}</h2>\n<ol>" + "".join(items) + "</ol>\n"
            f"<h2>{h_how}</h2>\n<p>{e(how)}</p>\n<p>{e(note)}</p>\n{links}")
    words += len((intro + how + note).split())
    post = {
        "slug": week_slug(now), "title": no_dash(title), "desc": no_dash(desc), "date": end.isoformat(),
        "author": "RealHunt Research", "image": img(homes[0]),
        "tags": ["weekly top 10", "deals"] if lang == "en" else ["top 10 semanal", "chollos"],
        "minutes": max(3, math.ceil(words / 200)), "html": body,
    }
    assert "—" not in json.dumps(post, ensure_ascii=False), "em dash in post"
    return post


# ---------------------------------------------------------------- io
def load_rows(src: str) -> list[dict]:
    if re.match(r"^https?://", src):
        req = urllib.request.Request(src, headers={"User-Agent": "realhunt-weekly-top10"})
        with urllib.request.urlopen(req, timeout=60) as f:
            data = json.load(f)
    else:
        with open(src, encoding="utf-8") as f:
            data = json.load(f)
    return [r for r in data.get("rows", []) if isinstance(r, dict)]


def read_json(p: str, default):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def write_blog(p: str, posts: list[dict]) -> None:
    with open(p, "w", encoding="utf-8") as f:
        f.write(json.dumps(posts, indent=1, ensure_ascii=False) + "\n")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--source", default=LIVE, help="URL or path of rh-static.json")
    ap.add_argument("--now", default=None, help="ISO time to run as (default: now, UTC)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    now = parse_ts(a.now) if a.now else dt.datetime.now(dt.timezone.utc)
    en_p, es_p = os.path.join(ROOT, "src/data/blog.json"), os.path.join(ROOT, "src/data/blog-es.json")
    en, es = read_json(en_p, []), read_json(es_p, [])
    slug = week_slug(now)
    if any(p.get("slug") == slug for p in en) or any(p.get("slug") == slug for p in es):
        print(f"weekly-top10: {slug} already exists, nothing to do")
        return 0
    rows = load_rows(a.source)
    homes, days = select(rows, now, featured_slugs(en))
    if not homes:
        print(f"weekly-top10: fewer than {MIN_POST} new homes in {WINDOWS[-1]} days, no post this week")
        return 0
    es_map = read_json(os.path.join(ROOT, "public/i18n/es-listings.json"), {})
    pe, ps = build_post(homes, days, now, "en", es_map), build_post(homes, days, now, "es", es_map)
    print(f"weekly-top10: {slug}: {len(homes)} homes from the last {days} days: " + ", ".join(h["slug"] for h in homes))
    if a.dry_run:
        print(json.dumps(pe, ensure_ascii=False, indent=1)[:2000])
        return 0
    write_blog(en_p, [pe] + en)
    write_blog(es_p, [ps] + es)
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        with open(gh, "a") as f:
            f.write(f"slug={slug}\ntitle={pe['title']}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
