#!/usr/bin/env python3
"""Informe de registros del servidor: robots de IA, robots de buscadores y errores 404 (ideas 701, 709, 923 y 940).

Lee una exportación de registros de Cloudflare (Logpush o "Descargar registros", en NDJSON o CSV) o cualquier CSV con
las columnas path, status y user_agent. No inventa nada: sin archivo no hay informe.

  python3 scripts/log_report.py registros.ndjson [--dist dist] [--out informe.md]

Campos que entiende: ClientRequestURI o ClientRequestPath o path; EdgeResponseStatus o status;
ClientRequestUserAgent o user_agent. Las líneas que no son de páginas (imágenes, scripts, /assets/) no cuentan.
"""
import argparse, csv, difflib, io, json, os, re, sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo_report import families, family_of, lang_of, load_json, n0, sitemap_pages, table, to_path  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The name each robot gives itself in its User-Agent (the names robots.txt allows).
AI_BOTS = [("GPTBot", "OpenAI (entrenamiento)"), ("OAI-SearchBot", "ChatGPT (búsqueda)"), ("ChatGPT-User", "ChatGPT (a petición de una persona)"), ("ClaudeBot", "Claude (rastreo)"), ("Claude-SearchBot", "Claude (búsqueda)"), ("Claude-User", "Claude (a petición de una persona)"),
           ("PerplexityBot", "Perplexity (rastreo)"), ("Perplexity-User", "Perplexity (a petición de una persona)"), ("Google-Extended", "Google (IA)"), ("Applebot-Extended", "Apple (IA)"), ("Amazonbot", "Amazon"), ("meta-externalagent", "Meta"), ("MistralAI-User", "Mistral"), ("CCBot", "Common Crawl"), ("Bytespider", "ByteDance"), ("DuckAssistBot", "DuckDuckGo (IA)")]
SEARCH_BOTS = [("Googlebot", "Google"), ("bingbot", "Bing"), ("YandexBot", "Yandex"), ("DuckDuckBot", "DuckDuckGo"), ("Applebot", "Apple"), ("Bravebot", "Brave"), ("SeznamBot", "Seznam"), ("Yeti", "Naver"), ("MojeekBot", "Mojeek"), ("Qwantbot", "Qwant"), ("PetalBot", "Petal")]
NOT_A_PAGE = re.compile(r"\.(js|css|png|jpe?g|webp|gif|svg|ico|woff2?|map|mp4|json|xml|txt|csv|md|pdf|kml|geojson|atom|webmanifest)$|^/(assets|images|og|badge|data|__sb|api|cdn-cgi)/", re.I)


def bot_of(ua):
    for name, label in AI_BOTS:
        if name.lower() in ua.lower(): return "ai", name, label
    for name, label in SEARCH_BOTS:
        if name.lower() in ua.lower(): return "search", name, label
    return None, None, None


def read_log(path):
    """[(path, status, user_agent)] from NDJSON or CSV."""
    text = open(path, encoding="utf-8-sig", errors="replace").read()
    out = []
    pick = lambda d, *ks: next((d[k] for k in ks if k in d and d[k] not in (None, "")), "")
    if text.lstrip().startswith("{"):
        for line in text.splitlines():
            line = line.strip()
            if not line: continue
            try: d = json.loads(line)
            except ValueError: continue
            out.append((str(pick(d, "ClientRequestPath", "ClientRequestURI", "path")), int(float(pick(d, "EdgeResponseStatus", "status") or 0)), str(pick(d, "ClientRequestUserAgent", "user_agent"))))
    else:
        for d in csv.DictReader(io.StringIO(text)):
            try: st = int(float(pick(d, "EdgeResponseStatus", "status") or 0))
            except ValueError: st = 0
            out.append((str(pick(d, "ClientRequestPath", "ClientRequestURI", "path")), st, str(pick(d, "ClientRequestUserAgent", "user_agent"))))
    return [(to_path(p), s, ua) for p, s, ua in out if p.startswith("/")]


def suggest(path, known, redirects):
    """What to do with an address that gives 404: already redirected, the closest real page, or nothing found."""
    if path in redirects: return f"ya redirige a {redirects[path]}" if redirects[path] != "410" else "ya responde 410 (retirada)"
    if lang_of(path) != "en" and path[3:] in known: return f"redirigir a {path[3:]} (existe en inglés)"
    m = difflib.get_close_matches(path, known, n=1, cutoff=0.82)
    if m: return f"redirigir a {m[0]} (página más parecida)"
    parent = path.rsplit("/", 1)[0] or "/"
    while parent != "/" and parent not in known: parent = parent.rsplit("/", 1)[0] or "/"
    return f"sin página parecida; la más cercana es {parent}" if parent != "/" else "sin página parecida: dejar en 404"


def build_report(rows, dist):
    fams = families()
    pages = [(p, s, ua) for p, s, ua in rows if not NOT_A_PAGE.search(p)]
    L = [f"# Registros del servidor: {n0(len(rows))} peticiones, {n0(len(pages))} de páginas", ""]
    for kind, title in (("ai", "## 1. Robots de asistentes de IA por familia de página"), ("search", "## 2. Robots de buscadores por familia de página")):
        hits = defaultdict(Counter); labels = {}
        for p, s, ua in pages:
            k, name, label = bot_of(ua)
            if k == kind: hits[name][family_of(p, fams)] += 1; labels[name] = label
        L += [title, ""]
        if not hits: L += ["Ninguna petición de estos robots en el archivo.", ""]; continue
        cols = sorted({f for c in hits.values() for f in c}, key=lambda f: -sum(c[f] for c in hits.values()))
        L += [table(["Robot", "De quién", "Total"] + cols, [[n, labels[n], n0(sum(c.values()))] + [n0(c[f]) for f in cols] for n, c in sorted(hits.items(), key=lambda x: -sum(x[1].values()))])]
    known = sitemap_pages(dist); redirects = load_json(os.path.join(dist, "redirects.json"), {}) or {}
    nf = Counter(p for p, s, ua in pages if s == 404)
    L += ["## 3. Direcciones con error 404 más pedidas, con una decisión para cada una", ""]
    if not nf: L += ["Ningún 404 de página en el archivo.", ""]
    else:
        by_ai = Counter(p for p, s, ua in pages if s == 404 and bot_of(ua)[0] == "ai")
        L += [table(["Dirección", "Veces", "De robots de IA", "Decisión propuesta"], [[p, n0(n), n0(by_ai[p]), suggest(p, known, redirects) if known else "sin datos (falta dist)"] for p, n in nf.most_common(40)])]
        L += ["Las direcciones pedidas sobre todo por robots de IA suelen ser inventadas por un asistente: si hay una página parecida, añade la redirección en seo/redirects-seed.json.", ""]
    g = Counter(s for p, s, ua in pages if bot_of(ua)[1] == "Googlebot")
    L += ["## 4. Googlebot: respuestas", "", table(["Respuesta", "Peticiones"], [[s, n0(n)] for s, n in sorted(g.items())]) if g else "Ninguna petición de Googlebot en el archivo.\n",
          "Para comparar con Search Console (idea 940) pon al lado las cifras de Ajustes > Estadísticas de rastreo del mismo periodo.", ""]
    return "\n".join(L)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("log"); ap.add_argument("--dist", default=os.path.join(ROOT, "dist")); ap.add_argument("--out")
    a = ap.parse_args(argv)
    if not os.path.isfile(a.log): print(f"No existe {a.log}: sin registros no hay informe.", file=sys.stderr); return 2
    text = build_report(read_log(a.log), a.dist)
    if a.out: open(a.out, "w", encoding="utf8").write(text); print("Informe escrito en", a.out)
    else: print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
