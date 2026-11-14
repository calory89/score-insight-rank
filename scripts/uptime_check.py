#!/usr/bin/env python3
"""Is realhunt.co up and answering as it should? (idea 932: a day down costs weeks of crawling)

Run by .github/workflows/uptime.yml every 30 minutes. Any failure ends with exit 1, so GitHub emails the owner of the
repository. It reads a handful of pages a crawler depends on; it sends nothing and changes nothing.
Usage: python3 scripts/uptime_check.py [--site https://realhunt.co]"""
import argparse, json, re, sys, time, urllib.error, urllib.request

UA = {"User-Agent": "RealHuntUptimeCheck/1.0 (+https://realhunt.co)"}
# (path, what the body must contain, content type must start with)
CHECKS = [
    ("/", "<title>", "text/html"), ("/homes/spain", "<h1", "text/html"), ("/es", 'lang="es"', "text/html"), ("/research", "<h1", "text/html"),
    ("/robots.txt", "Sitemap:", "text/plain"), ("/sitemap.xml", "<sitemapindex", ""), ("/llms.txt", "# RealHunt", "text/plain"),
    ("/feed.xml", "<rss", ""), ("/build.json", '"commit"', "application/json"), ("/data/rh-static.json", '"rows"', "application/json"),
]


def fetch(url, tries=3):
    for i in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30)
            return r.status, r.headers.get("content-type", ""), r.read(400000).decode("utf8", "replace")
        except urllib.error.HTTPError as e:
            if e.code < 500 and e.code not in (403, 429): return e.code, "", ""
            last = (e.code, "", "")
        except Exception as e:
            last = (0, "", str(e))
        time.sleep(5 * (i + 1))
    return last


def check(site, get=fetch):
    """The list of problems (empty when everything answers)."""
    problems = []
    for path, needle, ctype in CHECKS:
        status, ct, body = get(site + path)
        if status != 200: problems.append(f"{path}: respuesta {status or 'sin conexión'}")
        elif needle not in body: problems.append(f"{path}: responde 200 pero falta «{needle}»")
        elif ctype and not ct.lower().startswith(ctype): problems.append(f"{path}: tipo de contenido «{ct}», se esperaba «{ctype}»")
        elif path == "/" and re.search(r'<meta name="robots" content="[^"]*noindex', body): problems.append("/: la portada lleva noindex")
        elif path == "/build.json":
            try:
                if int(json.loads(body).get("homes", 0)) < 100: problems.append("/build.json: menos de 100 casas")
            except Exception: problems.append("/build.json: no es JSON válido")
    status, _, _ = get(site + "/esta-pagina-no-existe-uptime")
    if status == 200: problems.append("una dirección inventada responde 200 en vez de 404 (riesgo de páginas vacías indexadas)")
    return problems


def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument("--site", default="https://realhunt.co"); a = ap.parse_args(argv)
    problems = check(a.site.rstrip("/"))
    if problems:
        print("realhunt.co NO responde bien:"); [print(" -", p) for p in problems]; return 1
    print(f"realhunt.co responde bien ({len(CHECKS) + 1} comprobaciones)."); return 0


if __name__ == "__main__":
    sys.exit(main())
