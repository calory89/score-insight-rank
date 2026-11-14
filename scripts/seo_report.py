#!/usr/bin/env python3
"""Informe de posicionamiento de RealHunt por familia de página (ideas 911 a 935 de la lista de tráfico orgánico).

Lee solo lo que existe y nunca inventa una cifra. Lo que no tiene datos aparece como "sin datos" con lo que falta.

Siempre (sale del propio build):
  dist/seo-audit.json, dist/build.json, dist/reach.json, dist/sitemap-*.xml   páginas publicadas e indexables por familia
  public/data/rh-static.json                                                  casas

Si se le da una carpeta con la exportación de Search Console (Rendimiento > Exportar > CSV, sin cambiar los nombres):
  Páginas.csv / Pages.csv, Consultas.csv / Queries.csv, Países.csv / Countries.csv, Fechas.csv / Dates.csv
  y, opcional, consulta-pagina.csv (columnas query,page,clicks,impressions,position; sale de Looker Studio o de la API)
añade: clics e impresiones por familia, marca frente a sin marca, países, clics por posición frente a la media del
propio sitio, búsquedas de oro, búsquedas objetivo, canibalización, páginas sin impresiones y caídas de más del 20 %.

  python3 scripts/seo_report.py                              # solo el estado del build
  python3 scripts/seo_report.py --gsc ~/Descargas/gsc        # con Search Console
  python3 scripts/seo_report.py --gsc carpeta --archive data/seo-history   # y guarda la copia propia (Google borra a los 16 meses)
  python3 scripts/seo_report.py --gsc carpeta --out informe.md
"""
import argparse, csv, datetime, io, json, os, re, shutil, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://realhunt.co"
BRAND = re.compile(r"real\s*hunt|hunt\s*real|realhunt", re.I)
NO_DATA = "sin datos"
LANGS = ("es", "de", "ru", "fr", "nl", "pl")


def load_json(path, default=None):
    try:
        with open(path, encoding="utf8") as f: return json.load(f)
    except Exception:
        return default


def families():
    data = load_json(os.path.join(ROOT, "seo", "reach", "families.json"), {"families": [["app", "."]]})
    return [(name, re.compile(rx)) for name, rx in data["families"]]


def to_path(url):
    p = url[len(SITE):] if url.startswith(SITE) else url
    p = re.sub(r"[?#].*$", "", p).rstrip("/") or "/"
    return p


def lang_of(path):
    m = re.match(r"^/([a-z]{2})(/|$)", path)
    return m.group(1) if m and m.group(1) in LANGS else "en"


def family_of(path, fams):
    p = path
    m = re.match(r"^/([a-z]{2})(/.*|$)", p)
    if m and m.group(1) in LANGS: p = m.group(2) or "/"
    for name, rx in fams:
        if rx.search(p): return name
    return "app"


def num(s):
    s = str(s or "").strip().replace(" ", "").replace("%", "")
    if not s: return 0.0
    if re.fullmatch(r"-?\d{1,3}(\.\d{3})+(,\d+)?", s): s = s.replace(".", "").replace(",", ".")   # 1.234,5
    elif re.fullmatch(r"-?\d{1,3}(,\d{3})+(\.\d+)?", s): s = s.replace(",", "")                 # 1,234.5
    elif "," in s and "." not in s: s = s.replace(",", ".")
    else: s = s.replace(",", "")
    try: return float(s)
    except ValueError: return 0.0


def read_csv(folder, names):
    """Rows of the first file found among `names` as dicts with keys key, clicks, impressions, position. None if absent."""
    if not folder: return None
    for n in names:
        f = os.path.join(folder, n)
        if not os.path.isfile(f): continue
        with open(f, encoding="utf-8-sig", newline="") as fh: text = fh.read()
        rows = list(csv.reader(io.StringIO(text)))
        if len(rows) < 2: return []
        head = [h.strip().lower() for h in rows[0]]
        col = lambda *opts: next((i for i, h in enumerate(head) if any(o in h for o in opts)), None)
        ci, ii, pi = col("clic", "click"), col("impres"), col("posic", "position")
        out = []
        for r in rows[1:]:
            if not r or not r[0].strip(): continue
            out.append({"key": r[0].strip(), "clicks": num(r[ci]) if ci is not None and ci < len(r) else 0.0, "impressions": num(r[ii]) if ii is not None and ii < len(r) else 0.0, "position": num(r[pi]) if pi is not None and pi < len(r) else 0.0})
        return out
    return None


def sitemap_pages(dist):
    out = []
    if not os.path.isdir(dist): return out
    for f in sorted(os.listdir(dist)):
        if re.fullmatch(r"sitemap-[a-z0-9-]+\.xml", f) and f not in ("sitemap-news.xml", "sitemap-video.xml"):
            out += [to_path(u.replace("&amp;", "&")) for u in re.findall(r"<url>\s*<loc>([^<]+)</loc>", open(os.path.join(dist, f), encoding="utf8").read())]
    return out


def table(head, rows):
    if not rows: return NO_DATA + "\n"
    return "| " + " | ".join(head) + " |\n| " + " | ".join("---" for _ in head) + " |\n" + "\n".join("| " + " | ".join(str(c) for c in r) + " |" for r in rows) + "\n"


def n0(x): return f"{int(round(x)):,}".replace(",", ".")
def pct(a, b): return f"{(100 * a / b):.1f} %".replace(".", ",") if b else NO_DATA


def bucket(pos):
    return "1-3" if pos <= 3 else "4-10" if pos <= 10 else "11-20" if pos <= 20 else "21-50" if pos <= 50 else "51+"


def by_family(pages, fams):
    agg = defaultdict(lambda: {"clicks": 0.0, "impressions": 0.0, "pages": 0})
    for r in pages:
        p = to_path(r["key"]); k = (family_of(p, fams), lang_of(p))
        agg[k]["clicks"] += r["clicks"]; agg[k]["impressions"] += r["impressions"]; agg[k]["pages"] += 1
    return agg


def ctr_outliers(rows, min_impr=30):
    """Rows whose CTR is under half the site's own average for their position bucket. No outside benchmark."""
    tot = defaultdict(lambda: [0.0, 0.0])
    for r in rows:
        if r["impressions"] > 0 and r["position"] > 0: b = bucket(r["position"]); tot[b][0] += r["clicks"]; tot[b][1] += r["impressions"]
    avg = {b: (c / i if i else 0) for b, (c, i) in tot.items()}
    weak = []
    for r in rows:
        if r["impressions"] < min_impr or r["position"] <= 0: continue
        b = bucket(r["position"]); ctr = r["clicks"] / r["impressions"]
        if avg.get(b, 0) > 0 and ctr < avg[b] / 2: weak.append((r["key"], r["impressions"], ctr, avg[b], r["position"]))
    return avg, sorted(weak, key=lambda x: -x[1])


def cannibals(qp, min_impr=10):
    """Queries for which two or more of our pages get impressions: [(query, [(page, impressions, position)])]."""
    by = defaultdict(list)
    for r in qp:
        if r["impressions"] >= min_impr: by[r["query"]].append((r["page"], r["impressions"], r["position"]))
    out = [(q, sorted(v, key=lambda x: -x[1])) for q, v in by.items() if len({to_path(p) for p, _, _ in v}) >= 2]
    return sorted(out, key=lambda x: -sum(i for _, i, _ in x[1]))


def read_query_page(folder):
    if not folder: return None
    for n in ("consulta-pagina.csv", "query-page.csv"):
        f = os.path.join(folder, n)
        if os.path.isfile(f):
            with open(f, encoding="utf-8-sig", newline="") as fh:
                return [{"query": r.get("query", "").strip(), "page": r.get("page", "").strip(), "clicks": num(r.get("clicks")), "impressions": num(r.get("impressions")), "position": num(r.get("position"))} for r in csv.DictReader(fh) if r.get("query")]
    return None


def drops(dates, threshold=0.2):
    """Last 7 days against the 7 before: (last, previous, change) per metric, and whether clicks fell over the threshold."""
    rows = sorted([r for r in dates if re.match(r"\d{4}-\d{2}-\d{2}", r["key"])], key=lambda r: r["key"])
    if len(rows) < 14: return None
    last, prev = rows[-7:], rows[-14:-7]
    out = {}
    for m in ("clicks", "impressions"):
        a, b = sum(r[m] for r in last), sum(r[m] for r in prev)
        out[m] = (a, b, (a - b) / b if b else None)
    out["from"], out["to"] = last[0]["key"], last[-1]["key"]
    out["alert"] = out["clicks"][2] is not None and out["clicks"][2] <= -threshold
    return out


def archive(folder, dest, today):
    """Own copy of the export (idea 911): the days are merged into gsc-daily.csv and the pages kept per month."""
    os.makedirs(dest, exist_ok=True)
    done = []
    dates = read_csv(folder, ("Fechas.csv", "Dates.csv"))
    if dates:
        f = os.path.join(dest, "gsc-daily.csv"); had = {}
        if os.path.isfile(f):
            with open(f, encoding="utf8", newline="") as fh:
                for r in csv.DictReader(fh): had[r["date"]] = r
        for r in dates:
            if re.match(r"\d{4}-\d{2}-\d{2}$", r["key"]): had[r["key"]] = {"date": r["key"], "clicks": int(r["clicks"]), "impressions": int(r["impressions"]), "position": r["position"]}
        with open(f, "w", encoding="utf8", newline="") as fh:
            w = csv.DictWriter(fh, ["date", "clicks", "impressions", "position"]); w.writeheader()
            for d in sorted(had): w.writerow(had[d])
        done.append(f"{f} ({len(had)} días)")
    for names, tag in ((("Páginas.csv", "Paginas.csv", "Pages.csv"), "pages"), (("Consultas.csv", "Queries.csv"), "queries")):
        for n in names:
            src = os.path.join(folder, n)
            if os.path.isfile(src):
                dst = os.path.join(dest, f"{tag}-{today[:7]}.csv"); shutil.copyfile(src, dst); done.append(dst); break
    return done


def aging(dest, fams):
    """Pages whose impressions fell three months in a row, from the monthly copies kept by --archive."""
    if not dest or not os.path.isdir(dest): return None
    months = sorted(f for f in os.listdir(dest) if re.fullmatch(r"pages-\d{4}-\d{2}\.csv", f))
    if len(months) < 4: return None
    series = defaultdict(dict)
    for f in months[-4:]:
        for r in read_csv(dest, (f,)) or []: series[to_path(r["key"])][f] = r["impressions"]
    out = []
    for p, s in series.items():
        v = [s.get(f, 0.0) for f in months[-4:]]
        if v[0] > 0 and v[0] > v[1] > v[2] > v[3]: out.append((p, family_of(p, fams), *[n0(x) for x in v]))
    return sorted(out, key=lambda r: -num(r[2]))


def build_report(dist, snapshot, gsc=None, archive_dir=None, targets=None, today=None, window_days=None):
    today = today or datetime.date.today().isoformat()
    fams = families()
    L = [f"# Informe de posicionamiento de RealHunt ({today})", ""]
    audit, build, reach = load_json(os.path.join(dist, "seo-audit.json")), load_json(os.path.join(dist, "build.json")), load_json(os.path.join(dist, "reach.json"))
    snap = load_json(snapshot, {}) or {}
    homes = len([r for r in snap.get("rows", []) if r.get("slug")]) if snap else None

    L += ["## 1. Estado del sitio (sale del build)", ""]
    if audit:
        s = audit.get("summary", {})
        L += [f"- Páginas: {n0(s.get('pages', 0))}; indexables: {n0(s.get('indexable', 0))}; sin indexar: {n0(s.get('noindex', 0))}.",
              f"- Comprobaciones que fallan: {len(audit.get('failures', []))}. Enlaces rotos: {s.get('broken_links', NO_DATA)}; huérfanas: {s.get('orphans', NO_DATA)}; títulos duplicados: {s.get('duplicate_titles', NO_DATA)}; descripciones duplicadas: {s.get('duplicate_descriptions', NO_DATA)}.",
              f"- Títulos de más de 60 caracteres: {s.get('title_over_60', NO_DATA)}; páginas de menos de 150 palabras: {s.get('thin_under_150_words', NO_DATA)}."]
    else: L.append(f"- Auditoría del build: {NO_DATA} (falta dist/seo-audit.json; ejecuta `npm run build`).")
    L.append(f"- Casas: {n0(homes) if homes is not None else NO_DATA}. Versión publicada: {(build or {}).get('commit', NO_DATA)}, {(build or {}).get('built_at', NO_DATA)}.")
    if reach: L.append(f"- Archivos para asistentes y lectores: {len(reach.get('files', []))} de 13 presentes; páginas con fecha legible por máquina añadida: {reach.get('pages_given_a_date', NO_DATA)}; entradas en el sitemap de noticias: {(reach.get('sitemaps') or {}).get('news', NO_DATA)}; páginas con vídeo: {reach.get('video_pages', NO_DATA)}.")
    L.append("")

    pages_sm = sitemap_pages(dist)
    pub = defaultdict(int)
    for p in pages_sm: pub[(family_of(p, fams), lang_of(p))] += 1
    gp = read_csv(gsc, ("Páginas.csv", "Paginas.csv", "Pages.csv"))
    agg = by_family(gp, fams) if gp else {}
    L += ["## 2. Por familia de página e idioma", ""]
    if not pages_sm and not gp: L += [NO_DATA + " (no hay sitemaps en dist ni exportación de Search Console).", ""]
    else:
        keys = sorted(set(pub) | set(agg), key=lambda k: (-pub.get(k, 0), k))
        rows = []
        for k in keys:
            a = agg.get(k)
            rows.append([k[0], k[1], n0(pub.get(k, 0)), n0(a["pages"]) if a else NO_DATA, n0(a["impressions"]) if a else NO_DATA, n0(a["clicks"]) if a else NO_DATA, (f"{a['clicks'] / pub[k]:.2f}".replace(".", ",") if a and pub.get(k) else NO_DATA)])
        L += [table(["Familia", "Idioma", "Indexables (sitemap)", "Con impresiones", "Impresiones", "Clics", "Clics por página"], rows)]
        if not gp: L += ["Impresiones y clics: " + NO_DATA + ". Falta la exportación de Search Console (docs/seo/owner-steps.md, paso 3).", ""]
        L += ["Páginas indexadas por Google: " + NO_DATA + " (solo lo da Search Console en Indexación > Páginas; no se exporta por familia).", ""]

    gq = read_csv(gsc, ("Consultas.csv", "Queries.csv"))
    L += ["## 3. Marca y sin marca", ""]
    if gq:
        b = [r for r in gq if BRAND.search(r["key"])]; nb = [r for r in gq if not BRAND.search(r["key"])]
        L += [table(["Tipo", "Búsquedas", "Impresiones", "Clics", "Clics / impresiones"], [[n, len(x), n0(sum(r["impressions"] for r in x)), n0(sum(r["clicks"] for r in x)), pct(sum(r["clicks"] for r in x), sum(r["impressions"] for r in x))] for n, x in (("Marca", b), ("Sin marca", nb))])]
    else: L += [NO_DATA + " (falta Consultas.csv).", ""]

    gc = read_csv(gsc, ("Países.csv", "Paises.csv", "Countries.csv"))
    L += ["## 4. Por país del buscador", ""]
    L += [table(["País", "Impresiones", "Clics", "Posición media"], [[r["key"], n0(r["impressions"]), n0(r["clicks"]), f"{r['position']:.1f}".replace(".", ",")] for r in sorted(gc, key=lambda r: -r["impressions"])[:20]])] if gc else [NO_DATA + " (falta Países.csv).", ""]

    L += ["## 5. Búsquedas de oro (las 20 con más clics)", ""]
    gold = sorted([r for r in (gq or []) if r["clicks"] > 0], key=lambda r: (-r["clicks"], -r["impressions"]))[:20]
    L += [table(["Búsqueda", "Clics", "Impresiones", "Posición"], [[r["key"], n0(r["clicks"]), n0(r["impressions"]), f"{r['position']:.1f}".replace(".", ",")] for r in gold])] if gold else [NO_DATA + (" (ninguna búsqueda con clics en la exportación)." if gq else " (falta Consultas.csv)."), ""]

    L += ["## 6. Búsquedas objetivo", ""]
    tq = (targets or {}).get("queries") or []
    if tq:
        pos = {r["key"].strip().lower(): r for r in (gq or [])}
        rows = []
        for t in tq:
            r = pos.get(t["q"].strip().lower())
            rows.append([t["q"], t["lang"], t["page"], (f"{r['position']:.1f}".replace(".", ",") if r else NO_DATA), (n0(r["impressions"]) if r else NO_DATA), (n0(r["clicks"]) if r else NO_DATA)])
        seen = sum(1 for r in rows if r[3] != NO_DATA)
        L += [f"{len(tq)} búsquedas en la lista (docs/seo/target-queries.json); {seen} aparecen en la exportación." if gq else f"{len(tq)} búsquedas en la lista; posiciones: {NO_DATA} (falta Consultas.csv).", ""]
        if gq: L += [table(["Búsqueda", "Idioma", "Página", "Posición", "Impresiones", "Clics"], rows)]
    else: L += [NO_DATA + " (falta docs/seo/target-queries.json).", ""]

    L += ["## 7. Clics por posición frente a la media del propio sitio (títulos flojos)", ""]
    if gp:
        avg, weak = ctr_outliers(gp)
        L += ["Media del sitio por tramo de posición: " + "; ".join(f"{b}: {100 * v:.1f} %".replace(".", ",") for b, v in sorted(avg.items(), key=lambda x: ["1-3", "4-10", "11-20", "21-50", "51+"].index(x[0]))) + ".", ""]
        L += [table(["Página", "Impresiones", "Clics / impresiones", "Media de su tramo", "Posición"], [[to_path(k), n0(i), f"{100 * c:.1f} %".replace(".", ","), f"{100 * a:.1f} %".replace(".", ","), f"{p:.1f}".replace(".", ",")] for k, i, c, a, p in weak[:25]])] if weak else ["Ninguna página con 30 impresiones o más queda por debajo de la mitad de la media de su tramo.", ""]
    else: L += [NO_DATA + " (falta Páginas.csv).", ""]

    qp = read_query_page(gsc)
    L += ["## 8. Canibalización (dos páginas nuestras para la misma búsqueda)", ""]
    if qp is None: L += [NO_DATA + " (hace falta consulta-pagina.csv; la exportación normal de Search Console no cruza búsqueda y página).", ""]
    else:
        cs = cannibals(qp)
        L += [table(["Búsqueda", "Páginas (impresiones, posición)"], [[q, "; ".join(f"{to_path(p)} ({n0(i)}, {pos:.1f})".replace(".", ",") for p, i, pos in v[:4])] for q, v in cs[:25]])] if cs else ["Ninguna búsqueda con dos páginas nuestras.", ""]

    L += ["## 9. Páginas indexables sin impresiones (regla de poda: seis meses)", ""]
    if gp and pages_sm:
        seen = {to_path(r["key"]) for r in gp if r["impressions"] > 0}
        none = [p for p in pages_sm if p not in seen]
        by = defaultdict(int)
        for p in none: by[(family_of(p, fams), lang_of(p))] += 1
        L += [f"{n0(len(none))} de {n0(len(pages_sm))} páginas indexables no tienen impresiones en la exportación" + (f" ({window_days} días)." if window_days else ".") , ""]
        if not window_days or window_days < 180: L += ["La regla de poda pide seis meses sin impresiones: esta exportación no llega, así que la lista es solo orientativa. La exportación de Search Console lleva como mucho 1.000 páginas; con más páginas con impresiones, usa la copia propia.", ""]
        L += [table(["Familia", "Idioma", "Sin impresiones"], [[k[0], k[1], n0(v)] for k, v in sorted(by.items(), key=lambda x: -x[1])])]
    else: L += [NO_DATA + " (hacen falta los sitemaps de dist y Páginas.csv).", ""]

    gd = read_csv(gsc, ("Fechas.csv", "Dates.csv"))
    L += ["## 10. Caídas de más del 20 % (últimos 7 días frente a los 7 anteriores)", ""]
    d = drops(gd) if gd else None
    if d:
        f = lambda t: f"{n0(t[0])} frente a {n0(t[1])}" + (f" ({100 * t[2]:+.0f} %)" if t[2] is not None else "")
        L += [f"- Del {d['from']} al {d['to']}. Clics: {f(d['clicks'])}. Impresiones: {f(d['impressions'])}.", "- " + ("AVISO: los clics han caído más de un 20 %. Escribe el análisis en docs/seo/experimentos.md (qué pasó y qué se cambia)." if d["alert"] else "Sin caída de más del 20 % en clics."), ""]
    else: L += [NO_DATA + (" (hacen falta al menos 14 días en Fechas.csv)." if gd else " (falta Fechas.csv)."), ""]

    L += ["## 11. Contenido que envejece (impresiones que bajan tres meses seguidos)", ""]
    ag = aging(archive_dir, fams)
    L += [table(["Página", "Familia", "Mes 1", "Mes 2", "Mes 3", "Mes 4"], ag[:30]) if ag else "Ninguna página baja tres meses seguidos.\n"] if ag is not None else [NO_DATA + " (hacen falta cuatro copias mensuales guardadas con --archive).", ""]

    L += ["## 12. Las cinco cifras de la semana", ""]
    clicks7 = n0(d["clicks"][0]) if d else NO_DATA
    L += [f"- Páginas indexadas por Google: {NO_DATA} (mirar en Search Console, Indexación > Páginas).", f"- Clics de los últimos 7 días: {clicks7}.", f"- Enlaces nuevos: {NO_DATA} (Search Console, Enlaces > Sitios con más enlaces).", f"- Casas publicadas: {n0(homes) if homes is not None else NO_DATA}.", f"- Suscriptores: {NO_DATA} (panel de administración de RealHunt).", ""]
    return "\n".join(L)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dist", default=os.path.join(ROOT, "dist"))
    ap.add_argument("--snapshot", default=os.path.join(ROOT, "public", "data", "rh-static.json"))
    ap.add_argument("--gsc", help="carpeta con los CSV exportados de Search Console")
    ap.add_argument("--archive", help="carpeta donde guardar la copia propia de la exportación")
    ap.add_argument("--targets", default=os.path.join(ROOT, "docs", "seo", "target-queries.json"))
    ap.add_argument("--window-days", type=int, help="días que cubre la exportación (para la regla de poda)")
    ap.add_argument("--out")
    a = ap.parse_args(argv)
    today = datetime.date.today().isoformat()
    if a.gsc and not os.path.isdir(a.gsc): print(f"No existe la carpeta {a.gsc}", file=sys.stderr); return 2
    saved = archive(a.gsc, a.archive, today) if a.gsc and a.archive else []
    text = build_report(a.dist, a.snapshot, a.gsc, a.archive, load_json(a.targets), today, a.window_days)
    if saved: text += "\nCopia propia guardada: " + "; ".join(saved) + "\n"
    if a.out:
        with open(a.out, "w", encoding="utf8") as f: f.write(text)
        print("Informe escrito en", a.out)
    else: print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
