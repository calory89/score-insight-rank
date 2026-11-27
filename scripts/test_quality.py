"""python3 -m unittest scripts/test_quality.py  (data-quality checks of scripts/quality/, list of 1,000, batch 19)"""
import os, sys, unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "quality"))
import checks, audit  # noqa: E402

NOW = datetime(2026, 11, 26, 12, tzinfo=timezone.utc)


def row(slug, **kw):
    r = {"slug": slug, "id": "id-" + slug, "country": "Spain", "title": "2-bedroom house", "price_eur": 100000, "sqm": 80, "bedrooms": 2,
         "lat": 37.0, "lng": -3.0, "image_urls": [f"/finds/{slug}-{i}.webp" for i in range(6)], "location_name": "Terque, Almería, Spain",
         "publish_at": "2026-10-01T00:00:00+00:00", "approved_at": "2026-10-01T00:00:00+00:00", "rank": 1, "nota": 80,
         "src_ok_at": "2026-11-25T00:00:00+00:00", "src_last": "ok", "title_es": "Casa de 2 dormitorios", "why_great": "", "why_great_es": "x"}
    r.update(kw)
    return r


def ctx(rows, **kw):
    meta = {"global_deals": len(rows), "countries_count": {}}
    for r in rows: meta["countries_count"][r["country"]] = meta["countries_count"].get(r["country"], 0) + 1
    return checks.Ctx({"generated": "2026-11-26T00:15:00+00:00", "meta": meta, "rows": rows}, now=NOW, **kw)


class Hard(unittest.TestCase):
    def test_counts(self):
        c = ctx([row("a"), row("b")])
        self.assertEqual(checks.check_snapshot_counts(c), [])
        c.meta["global_deals"] = 3
        self.assertTrue(checks.check_snapshot_counts(c))
        c = ctx([row("a"), row("b", country="Italy")]); c.meta["countries_count"]["Italy"] = 2
        self.assertTrue(any("Italy" == i.get("country") for i in checks.check_snapshot_counts(c)))

    def test_status(self):
        self.assertEqual(checks.check_status_approved(ctx([row("a")])), [])
        self.assertTrue(checks.check_status_approved(ctx([row("a", status="pending")])))

    def test_fresh(self):
        self.assertEqual(checks.check_snapshot_fresh(ctx([row("a")])), [])
        c = ctx([row("a")]); c.snap["generated"] = "2026-11-24T00:00:00+00:00"
        self.assertTrue(checks.check_snapshot_fresh(c))

    def test_slug_stable(self):
        c = ctx([row("a-new", id="X")], prev={"rows": [row("a-old", id="X")]})
        self.assertEqual(checks.check_slug_stable(c)[0]["old"], "a-old")
        self.assertEqual(checks.check_slug_stable(ctx([row("a")], prev={"rows": [row("a")]})), [])


class Data(unittest.TestCase):
    def test_outliers_and_surface(self):
        rows = [row(f"h{i}", price_eur=100000 + i) for i in range(5)] + [row("cheap", price_eur=5000), row("tiny", sqm=10)]
        out = {i["slug"] for i in checks.check_ppsqm_outliers(ctx(rows))}
        self.assertIn("cheap", out)
        self.assertEqual({i["slug"] for i in checks.check_surface(ctx(rows))}, {"tiny"})
        self.assertTrue(checks.check_surface(ctx([row("x", sqm=30, bedrooms=4)])))

    def test_duplicates(self):
        a = row("a", source_url="https://www.fotocasa.es/es/comprar/vivienda/x/123456/d")
        b = row("b", source_url="https://fotocasa.es/es/comprar/vivienda/x/123456/d/", title="Other", lat=40, lng=1)
        self.assertEqual(checks.check_same_home(ctx([a, b]))[0]["slugs"], ["a", "b"])
        c, d = row("c", title="Nice flat", price_eur=100000, lat=1, lng=1), row("d", title="Nice flat", price_eur=101000, lat=2, lng=2)
        self.assertTrue(checks.check_same_home(ctx([c, d])))
        e, f = row("e", image_urls=["https://cdn.x/p/1.jpg"]), row("f", image_urls=["https://cdn.x/p/1.jpg?w=800"], lat=5, lng=5, title="t2")
        self.assertTrue(checks.check_photo_dupes(ctx([e, f])))
        self.assertEqual(checks.check_photo_dupes(ctx([row("g"), row("h")])), [])
        h = ctx([row("i", image_urls=["/u1"]), row("j", image_urls=["/u2"], title="t3", lat=9, lng=9)], hashes={"/u1": 0xFFFF000000000000, "/u2": 0xFFFF000000000003})
        self.assertTrue(any(i["why"].startswith("near") for i in checks.check_photo_dupes(h)))

    def test_kinds(self):
        self.assertEqual(checks.normal_kind("Apartamento"), "flat")
        self.assertEqual(checks.normal_kind("Semi-detached house"), "house")
        self.assertEqual(checks.normal_kind("villa"), "villa")
        self.assertIsNone(checks.normal_kind("castle"))
        self.assertEqual(checks.kind_from_title("Small cortijo with almond trees"), "farmhouse")
        self.assertEqual(checks.kind_from_title("Renovated flat with a sea view"), "flat")
        self.assertEqual(checks.check_kinds(ctx([row("a", property_type="house")])), [])
        self.assertEqual(checks.check_kinds(ctx([row("a", property_type="castle")]))[0]["suggest"], None)

    def test_photos(self):
        out = checks.check_photos(ctx([row("a", image_urls=["/1", "/2"]), row("b", source_domain="bienici.com")]))
        self.assertEqual({(i["slug"], i["idea"]) for i in out}, {("a", "911"), ("b", "912")})

    def test_unconfirmed(self):
        rows = [row("ok"), row("old", src_ok_at="2026-09-01T00:00:00+00:00"), row("never", src_ok_at=None),
                row("gone", src_ok_at=None, src_last="gone"), row("new", src_ok_at=None, publish_at="2026-11-25T00:00:00+00:00")]
        self.assertEqual({i["slug"] for i in checks.check_unconfirmed(ctx(rows))}, {"old", "never"})

    def test_thin_countries(self):
        self.assertEqual(checks.check_thin_countries(ctx([row("a"), row("b"), row("c"), row("d", country="Norway")]))[0]["country"], "Norway")


class Texts(unittest.TestCase):
    def test_sales_words(self):
        self.assertTrue(checks.check_sales_words(ctx([row("a", title="Flat with high rental yield")])))
        self.assertTrue(checks.check_sales_words(ctx([row("a", title_es="Piso con rentabilidad garantizada")])))
        self.assertEqual(checks.check_sales_words(ctx([row("a", why_great="No guaranteed returns: check the rules.")])), [])
        self.assertTrue(checks.check_sales_words(ctx([row("a")], titles={"de": {"a": {"t": "Wohnung mit hoher Rendite"}}})))
        self.assertTrue(checks.check_sales_words(ctx([row("a")], titles={"fr": {"a": {"t": "Appartement, bon rendement locatif"}}})))

    def test_legal_flags(self):
        self.assertTrue(checks.check_legal_flags(ctx([row("a", why_great="Sold at auction by the bank.")])))
        self.assertEqual(checks.check_legal_flags(ctx([row("a", why_great="Not marked as occupied, rented or at auction.")])), [])
        self.assertEqual(checks.check_legal_flags(ctx([row("a", why_great="Owner-occupied and well kept.")])), [])
        self.assertTrue(checks.check_legal_flags(ctx([row("a", why_great="Se vende la nuda propiedad.")])))
        self.assertTrue(checks.check_legal_flags(ctx([row("a", country="United States", why_great="A 55+ community with a pool.")])))
        self.assertEqual(checks.check_legal_flags(ctx([row("a", country="Spain", why_great="A 55+ community with a pool.")])), [])

    def test_source_links(self):
        bad = [row("a", source_url="https://www.idealista.com/"), row("b", source_url="https://www.pisos.com/venta/pisos-granada/"), row("c", source_url="javascript:x")]
        good = row("d", source_url="https://www.fotocasa.es/es/comprar/vivienda/la-oliva/terraza-piscina/183645378/d")
        self.assertEqual({i["slug"] for i in checks.check_source_links(ctx(bad + [good]))}, {"a", "b", "c"})

    def test_es_titles(self):
        self.assertTrue(checks.check_es_titles(ctx([row("a", title_es="Casa with jardín")])))
        self.assertEqual(checks.check_es_titles(ctx([row("a", title_es="Chalet con jardín y vistas")])), [])

    def test_numbers(self):
        self.assertTrue(checks.check_why_great_numbers(ctx([row("a", why_great="Yours for €120,000, two floors.")])))
        self.assertEqual(checks.check_why_great_numbers(ctx([row("a", why_great="€100,000 for 80 m², reduced from €120,000.")])), [])
        self.assertTrue(checks.check_why_great_numbers(ctx([row("a", why_great="A 3-bedroom house.")])))

    def test_translations(self):
        out = checks.check_translations(ctx([row("a"), row("b", title_es=None)], titles={"de": {"a": {}}}))
        self.assertEqual(next(i for i in out if i["slug"] == "b")["missing"], ["es", "de"])


class Report(unittest.TestCase):
    def test_public_has_no_slugs(self):
        c = ctx([row("secret-slug", sqm=None)])
        res = checks.run_all(c)
        pub = audit.public_summary(c.snap, res)
        self.assertNotIn("secret-slug", str(pub))
        self.assertEqual(pub["homes"], 1)
        self.assertIn("sqm", pub["missing"])

    def test_one_broken_check_does_not_stop_the_rest(self):
        c = ctx([row("a")]); c.rows.append({"slug": None})
        res = checks.run_all(c)
        self.assertEqual(len(res), len(checks.CHECKS))


class TitleJunk(unittest.TestCase):
    def test_zero_bed(self):
        c = ctx([row("a"), row("b", title="Renovated 0-bed condo in Little River"), row("c", title_es="Condo de 0 dormitorios en X")])
        self.assertEqual([x["slug"] for x in checks.check_title_junk(c)], ["b", "c"])


if __name__ == "__main__":
    unittest.main()
