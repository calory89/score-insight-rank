#!/usr/bin/env python3
"""Plain-assert tests for scripts/weekly_top10.py (no pytest needed): python3 scripts/test_weekly_top10.py"""
import datetime as dt
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import weekly_top10 as w  # noqa: E402

NOW = dt.datetime(2026, 11, 9, 7, 13, tzinfo=dt.timezone.utc)


def home(i, nota, days_ago, **kw):
    t = (NOW - dt.timedelta(days=days_ago)).isoformat()
    r = {"slug": f"h{i}", "title": f"Home {i}", "price_eur": 10000 + i * 1000, "nota": nota, "approved_at": t, "country": "Spain",
         "location_name": f"Town {i}, Spain", "image_urls": [f"/finds/h{i}-0.webp"], "sqm": 50, "bedrooms": 2, "why_great": f"Nice home {i}. Second. Third."}
    r.update(kw)
    return r


def test_picks_top_scores_in_last_7_days():
    rows = [home(i, 70 + i, 1) for i in range(15)] + [home(100, 99, 10)]
    got, days = w.select(rows, NOW)
    assert days == 7
    assert len(got) == 10
    assert [r["nota"] for r in got] == sorted([r["nota"] for r in got], reverse=True)
    assert "h100" not in [r["slug"] for r in got], "older than 7 days must wait for the fallback"
    assert got[0]["slug"] == "h14"


def test_falls_back_to_14_then_30_days():
    rows = [home(i, 80, 2) for i in range(6)] + [home(10 + i, 85, 12) for i in range(5)]
    got, days = w.select(rows, NOW)
    assert days == 14 and len(got) == 10
    rows = [home(i, 80, 2) for i in range(3)] + [home(10 + i, 85, 25) for i in range(8)]
    got, days = w.select(rows, NOW)
    assert days == 30 and len(got) == 10
    assert got[0]["nota"] == 85


def test_too_few_homes_means_no_post():
    got, _ = w.select([home(i, 80, 2) for i in range(4)], NOW)
    assert got == []
    got, days = w.select([home(i, 80, 20) for i in range(6)], NOW)
    assert len(got) == 6 and days == 30


def test_skips_future_ineligible_and_already_featured():
    rows = [home(i, 90, 1) for i in range(12)]
    rows += [home(50, 99, -1), home(51, 99, 1, price_eur=0), {**home(52, 99, 1), "nota": None}, home(53, 99, 1, slug="")]
    got, _ = w.select(rows, NOW, exclude={"h0", "h1"})
    s = [r["slug"] for r in got]
    assert "h50" not in s and "h51" not in s and "h52" not in s
    assert "h0" not in s and "h1" not in s and len(s) == 10


def test_tie_break_is_stable_by_rank_then_newest():
    rows = [home(1, 90, 3, rank=5), home(2, 90, 1, rank=5), home(3, 90, 2, rank=1)] + [home(10 + i, 70, 1) for i in range(8)]
    got, _ = w.select(rows, NOW)
    assert [r["slug"] for r in got[:3]] == ["h3", "h2", "h1"]


def test_publish_at_used_when_approved_at_missing():
    r = home(1, 95, 0)
    r["approved_at"] = None
    r["publish_at"] = (NOW - dt.timedelta(days=1)).isoformat()
    assert w.live_at(r) is not None


def test_week_slug_and_featured():
    assert w.week_slug(NOW) == "best-home-deals-this-week-2026-w46"
    posts = [{"slug": "best-home-deals-this-week-2026-w45", "html": '<a href="/deal/a-1">x</a><a href="/deal/b_2">y</a>'}, {"slug": "other", "html": '<a href="/deal/zzz">'}]
    assert w.featured_slugs(posts) == {"a-1", "b_2"}


def test_post_shape_and_honest_copy():
    homes = [home(i, 90 - i, 1, why_great="Big terrace — sea view. Two. Three.") for i in range(10)]
    p = w.build_post(homes, 7, NOW, "en", {})
    for k in ["slug", "title", "desc", "date", "author", "image", "tags", "minutes", "html"]:
        assert k in p, k
    assert p["title"].startswith("The 10 best home deals this week")
    assert "—" not in json.dumps(p, ensure_ascii=False)
    assert p["html"].count('<figure class="rh-home">') == 10 and '<div class="rh-homes">' in p["html"]
    assert 'href="/deal/h0"' in p["html"] and "score 90/100" in p["html"]
    assert p["image"].startswith("https://realhunt-media.pages.dev/finds/")
    assert "Three" not in p["html"], "only the first two sentences of the description"
    es = w.build_post(homes, 14, NOW, "es", {"Home 0": "Casa 0"})
    assert es["title"].startswith("Las 10 mejores casas de la semana") and "Casa 0" in es["html"]
    assert "últimos 14 días" in es["html"]
    assert "Big terrace" not in es["html"], "no English descriptions in the Spanish post"


def test_date_range():
    a, b = dt.date(2026, 10, 31), dt.date(2026, 11, 7)
    assert w.date_range(a, b, "en") == "31 October to 7 November 2026"
    assert w.date_range(dt.date(2026, 11, 2), dt.date(2026, 11, 9), "es") == "del 2 al 9 de noviembre de 2026"


if __name__ == "__main__":
    n = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            n += 1
    print(f"ok: {n} tests passed")
