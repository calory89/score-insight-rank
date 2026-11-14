"""python3 -m unittest scripts/test_seo_reports.py  (seo_report.py, log_report.py, indexnow.py, uptime_check.py, utm_check.py)"""
import datetime, json, os, sys, tempfile, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import indexnow, log_report, seo_report, uptime_check, utm_check  # noqa: E402

SM = '<urlset>\n  <url><loc>https://realhunt.co/</loc><lastmod>2026-11-14</lastmod></url>\n  <url><loc>https://realhunt.co/homes/spain</loc><lastmod>2026-11-01</lastmod></url>\n  <url><loc>https://realhunt.co/homes/spain/under-50000</loc></url>\n  <url><loc>https://realhunt.co/es/homes/spain</loc><lastmod>2026-11-13</lastmod></url>\n  <url><loc>https://realhunt.co/deal/abc</loc></url>\n</urlset>'


def make(files):
    d = tempfile.mkdtemp()
    for name, text in files.items():
        p = os.path.join(d, name); os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf8") as f: f.write(text)
    return d


class Report(unittest.TestCase):
    def setUp(self):
        self.dist = make({"sitemap-main.xml": SM, "sitemap-news.xml": "<urlset><url><loc>https://realhunt.co/blog/x</loc></url></urlset>", "seo-audit.json": json.dumps({"summary": {"pages": 6, "indexable": 5, "noindex": 1}, "failures": []}), "build.json": json.dumps({"commit": "abc1234", "built_at": "2026-11-15T00:00:00Z"})})
        self.snap = os.path.join(make({"s.json": json.dumps({"rows": [{"slug": "a"}, {"slug": "b"}, {}]})}), "s.json")

    def test_families_and_languages(self):
        f = seo_report.families()
        self.assertEqual(seo_report.family_of("/es/homes/spain", f), "country"); self.assertEqual(seo_report.family_of("/homes/spain/under-50000", f), "listing")
        self.assertEqual(seo_report.family_of("/", f), "front"); self.assertEqual(seo_report.family_of("/es", f), "front"); self.assertEqual(seo_report.family_of("/essay", f), "app")
        self.assertEqual(seo_report.lang_of("/es/deal/x"), "es"); self.assertEqual(seo_report.lang_of("/deal/x"), "en")

    def test_numbers(self):
        self.assertEqual(seo_report.num("1,234"), 1234); self.assertEqual(seo_report.num("1.234"), 1234); self.assertEqual(seo_report.num("2,04%"), 2.04); self.assertEqual(seo_report.num("12.6"), 12.6); self.assertEqual(seo_report.num(""), 0)

    def test_without_exports_it_says_no_data_and_invents_nothing(self):
        t = seo_report.build_report(self.dist, self.snap, today="2026-11-15")
        self.assertIn("Páginas: 6; indexables: 5", t); self.assertIn("Casas: 2.", t)
        self.assertIn("| country | en | 1 | sin datos | sin datos | sin datos | sin datos |", t)
        self.assertNotIn("/blog/x", t)
        for section in ("## 3.", "## 4.", "## 5.", "## 7.", "## 8.", "## 9.", "## 10.", "## 11."):
            body = t.split(section)[1].split("\n## ")[0]; self.assertIn("sin datos", body, section)
        self.assertIn("Clics de los últimos 7 días: sin datos", t); self.assertNotIn("—", t)

    def test_with_exports(self):
        days = "".join(f"2026-11-{d:02d},{2 if d < 8 else 1},{50 if d < 8 else 40},2%,12\n" for d in range(1, 15))
        gsc = make({"Pages.csv": "Top pages,Clicks,Impressions,CTR,Position\nhttps://realhunt.co/,5,100,5%,2.9\nhttps://realhunt.co/homes/spain,0,80,0%,2.5\nhttps://realhunt.co/es/homes/spain,2,40,5%,8\n",
                    "Consultas.csv": "Consultas principales,Clics,Impresiones,CTR,Posición\nrealhunt,4,50,8%,1\ncheap houses for sale in Spain,2,60,\"3,3%\",\"7,4\"\nhouses in poland,0,30,0%,40\n",
                    "Countries.csv": "Country,Clicks,Impressions,CTR,Position\nSpain,3,90,3%,9\nGermany,1,60,2%,14\n", "Dates.csv": "Date,Clicks,Impressions,CTR,Position\n" + days,
                    "query-page.csv": "query,page,clicks,impressions,position\ncheap houses spain,https://realhunt.co/homes/spain,1,40,6\ncheap houses spain,https://realhunt.co/homes/spain/under-50000,0,30,9\nrealhunt,https://realhunt.co/,4,50,1\n"})
        targets = {"queries": [{"q": "cheap houses for sale in Spain", "lang": "en", "page": "/homes/spain"}, {"q": "casas baratas en Italia", "lang": "es", "page": "/es/homes/italy"}]}
        t = seo_report.build_report(self.dist, self.snap, gsc, targets=targets, today="2026-11-15", window_days=28)
        self.assertIn("| country | en | 1 | 1 | 80 | 0 | 0,00 |", t); self.assertIn("| country | es | 1 | 1 | 40 | 2 | 2,00 |", t)
        self.assertIn("| Marca | 1 | 50 | 4 | 8,0 % |", t); self.assertIn("| Sin marca | 2 | 90 | 2 | 2,2 % |", t)
        self.assertIn("| Spain | 90 | 3 | 9,0 |", t); self.assertIn("| realhunt | 4 | 50 | 1,0 |", t)
        self.assertIn("| cheap houses for sale in Spain | en | /homes/spain | 7,4 | 60 | 2 |", t); self.assertIn("| casas baratas en Italia | es | /es/homes/italy | sin datos | sin datos | sin datos |", t)
        self.assertIn("| /homes/spain | 80 | 0,0 % |", t)                       # weak title: position 2.5 and no clicks
        self.assertIn("| cheap houses spain | /homes/spain (40, 6,0); /homes/spain/under-50000 (30, 9,0) |", t)
        self.assertIn("2 de 5 páginas indexables no tienen impresiones", t); self.assertIn("no llega", t)
        self.assertIn("Clics: 7 frente a 14 (-50 %)", t); self.assertIn("AVISO", t); self.assertIn("Clics de los últimos 7 días: 7.", t)

    def test_archive_keeps_its_own_copy_and_finds_ageing_pages(self):
        gsc = make({"Dates.csv": "Date,Clicks,Impressions,CTR,Position\n2026-11-01,1,10,10%,5\n", "Pages.csv": "Top pages,Clicks,Impressions,CTR,Position\nhttps://realhunt.co/,1,10,10%,5\n"})
        dest = tempfile.mkdtemp()
        seo_report.archive(gsc, dest, "2026-11-15")
        gsc2 = make({"Dates.csv": "Date,Clicks,Impressions,CTR,Position\n2026-11-01,2,10,20%,5\n2026-11-02,3,10,30%,5\n"})
        seo_report.archive(gsc2, dest, "2026-11-16")
        rows = open(os.path.join(dest, "gsc-daily.csv")).read().strip().split("\n")
        self.assertEqual(rows, ["date,clicks,impressions,position", "2026-11-01,2,10,5.0", "2026-11-02,3,10,5.0"]); self.assertTrue(os.path.isfile(os.path.join(dest, "pages-2026-11.csv")))
        self.assertIsNone(seo_report.aging(dest, seo_report.families()))
        for m, v in (("2026-08", 90), ("2026-09", 70), ("2026-10", 40)):
            open(os.path.join(dest, f"pages-{m}.csv"), "w").write(f"Top pages,Clicks,Impressions,CTR,Position\nhttps://realhunt.co/,1,{v},1%,5\nhttps://realhunt.co/deal/abc,1,{100 - v},1%,5\n")
        self.assertEqual(seo_report.aging(dest, seo_report.families()), [("/", "front", "90", "70", "40", "10")])


class Logs(unittest.TestCase):
    def test_bots_404s_and_decisions(self):
        dist = make({"sitemap-main.xml": SM, "redirects.json": json.dumps({"/country/spain": "/homes/spain"})})
        log = os.path.join(make({"l.ndjson": "\n".join(json.dumps(x) for x in [
            {"ClientRequestURI": "/homes/spain?x=1", "EdgeResponseStatus": 200, "ClientRequestUserAgent": "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)"},
            {"ClientRequestURI": "/deal/abc", "EdgeResponseStatus": 200, "ClientRequestUserAgent": "Mozilla/5.0 (compatible; ClaudeBot/1.0)"},
            {"ClientRequestURI": "/homes/spane", "EdgeResponseStatus": 404, "ClientRequestUserAgent": "ChatGPT-User/1.0"},
            {"ClientRequestURI": "/homes/spane", "EdgeResponseStatus": 404, "ClientRequestUserAgent": "Mozilla/5.0"},
            {"ClientRequestURI": "/country/spain", "EdgeResponseStatus": 404, "ClientRequestUserAgent": "Mozilla/5.0"},
            {"ClientRequestURI": "/zzz/qqq", "EdgeResponseStatus": 404, "ClientRequestUserAgent": "Mozilla/5.0"},
            {"ClientRequestURI": "/assets/a.js", "EdgeResponseStatus": 404, "ClientRequestUserAgent": "Mozilla/5.0"},
            {"ClientRequestURI": "/", "EdgeResponseStatus": 200, "ClientRequestUserAgent": "Mozilla/5.0 (compatible; Googlebot/2.1)"}]) + "\nnot json\n"}), "l.ndjson")
        rows = log_report.read_log(log)
        self.assertEqual(len(rows), 8); self.assertEqual(rows[0][0], "/homes/spain")
        t = log_report.build_report(rows, dist)
        self.assertIn("| GPTBot | OpenAI (entrenamiento) | 1 |", t); self.assertIn("| ChatGPT-User |", t); self.assertIn("| Googlebot | Google | 1 |", t)
        self.assertIn("| /homes/spane | 2 | 1 | redirigir a /homes/spain (página más parecida) |", t)
        self.assertIn("| /country/spain | 1 | 0 | ya redirige a /homes/spain |", t); self.assertIn("| /zzz/qqq | 1 | 0 | sin página parecida: dejar en 404 |", t)
        self.assertNotIn("/assets/a.js", t); self.assertIn("| 200 | 1 |", t)
        self.assertEqual(log_report.bot_of("Mozilla/5.0 Chrome/120"), (None, None, None))
        csvlog = os.path.join(make({"l.csv": "path,status,user_agent\n/deal/abc,200,PerplexityBot/1.0\n"}), "l.csv")
        self.assertEqual(log_report.read_log(csvlog), [("/deal/abc", 200, "PerplexityBot/1.0")])


class IndexNow(unittest.TestCase):
    def test_sends_changed_pages_of_every_language(self):
        e = indexnow.parse_sitemap(SM)
        self.assertEqual(len(e), 5); self.assertEqual(e[2], ("https://realhunt.co/homes/spain/under-50000", None))
        today = datetime.date(2026, 11, 15)
        self.assertEqual(indexnow.pick(e, 3, today), ["https://realhunt.co/", "https://realhunt.co/es/homes/spain"])
        self.assertEqual(len(indexnow.pick(e, 3, today, True)), 5)
        self.assertEqual(indexnow.pick(e, 30, today)[1], "https://realhunt.co/homes/spain")
        d = make({"sitemap-main.xml": SM, "sitemap-news.xml": SM.replace("/deal/abc", "/blog/x"), "sitemap.xml": "<sitemapindex/>"})
        self.assertEqual(len(indexnow.read_local(d)), 5); self.assertEqual(indexnow.read_local(os.path.join(d, "nope")), [])


class Uptime(unittest.TestCase):
    def test_reports_each_kind_of_problem(self):
        good = {p: (200, (c or "text/html") + "; charset=utf-8", needle + ' {"commit":"a","homes":591}' if p != "/build.json" else '{"commit":"a","homes":591}') for p, needle, c in uptime_check.CHECKS}
        get = lambda url: good.get(url.replace("https://x", ""), (404, "", ""))
        self.assertEqual(uptime_check.check("https://x", get), [])
        bad = dict(good); bad["/"] = (200, "text/html", '<title>x</title><meta name="robots" content="noindex, follow">'); bad["/robots.txt"] = (503, "", ""); bad["/llms.txt"] = (200, "text/html", "# RealHunt"); bad["/build.json"] = (200, "application/json", '{"commit":"a","homes":3}')
        bad["/esta-pagina-no-existe-uptime"] = (200, "text/html", "x")
        out = uptime_check.check("https://x", lambda url: bad.get(url.replace("https://x", ""), (404, "", "")))
        self.assertEqual(len(out), 5); self.assertIn("/: la portada lleva noindex", out); self.assertIn("/robots.txt: respuesta 503", out)


class Utm(unittest.TestCase):
    def test_finds_links_without_tags_only_where_something_is_sent(self):
        self.assertEqual(utm_check.scan_text('const a = `<a href="https://realhunt.co/deal/x">home</a>`'), [])
        hits = utm_check.scan_text('await resend.send()\nconst a = `<a href="https://realhunt.co/deal/${s}?utm_source=newsletter&utm_medium=email">x</a><a href="https://realhunt.co/new?utm_source=a&utm_medium=b&utm_campaign=c">y</a><img src="https://realhunt.co/og/x.png">`')
        self.assertEqual(hits, [(2, "https://realhunt.co/deal/${s}?utm_source=newsletter&utm_medium=email", ["utm_campaign"])])


if __name__ == "__main__":
    unittest.main()
