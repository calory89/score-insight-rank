#!/usr/bin/env python3
"""Enlaces propios sin etiquetas de campaña (idea 937).

Busca, en el código que envía correos y prepara publicaciones (supabase/functions y scripts), enlaces (href) a realhunt.co que
no llevan utm_source, utm_medium y utm_campaign. Solo informa; no cambia nada. Norma: docs/seo/medicion.md.
  python3 scripts/utm_check.py [carpeta ...]"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LINK = re.compile(r"https://(?:www\.)?realhunt\.co(/[^\s\"'`<>)\\]*)?")
SENDS = re.compile(r"resend|sendEmail|send_email|smtp|mailgun|newsletter|digest|telegram|tweet|x\.com/intent|wa\.me", re.I)
NEEDED = ("utm_source", "utm_medium", "utm_campaign")
# addresses that are not a visit: files, images, the API, unsubscribe links
SKIP = re.compile(r"\.(png|jpe?g|webp|svg|ico|xml|txt|json|js|css)(\?|$)|/(og|images|badge|api|__sb)/|unsubscribe|/legal/", re.I)


def missing(url):
    return [k for k in NEEDED if k + "=" not in url]


def scan_text(text):
    """[(line number, url, missing tags)] for a file that sends emails or posts."""
    if not SENDS.search(text): return []
    out = []
    for i, line in enumerate(text.splitlines(), 1):
        if "href=" not in line: continue  # only links a person can click; constants and API calls are not visits
        for m in LINK.finditer(line):
            url = m.group(0)
            # a link built with a template (`https://realhunt.co/deal/${slug}?utm_source=...`) is read to the end of the string
            rest = line[m.end():].split('"')[0].split("`")[0].split("'")[0]
            full = url + rest
            if SKIP.search(full): continue
            miss = missing(full)
            if miss: out.append((i, url, miss))
    return out


def main(argv=None):
    dirs = (argv or sys.argv[1:]) or [os.path.join(ROOT, "supabase", "functions"), os.path.join(ROOT, "scripts")]
    n = files = 0
    for d in dirs:
        for base, _dirs, names in os.walk(d):
            if "node_modules" in base or "__pycache__" in base or "fixtures" in base: continue
            for name in names:
                if not name.endswith((".ts", ".tsx", ".py", ".mjs", ".html")) or name.startswith("test_") or name in ("utm_check.py", "uptime_check.py", "seo_report.py", "log_report.py", "indexnow.py", "post_publish_check.py", "check_live_assets.py"): continue
                path = os.path.join(base, name)
                try: hits = scan_text(open(path, encoding="utf8", errors="replace").read())
                except OSError: continue
                if hits:
                    files += 1
                    for line, url, miss in hits: n += 1; print(f"{os.path.relpath(path, ROOT)}:{line}  {url}  falta: {', '.join(miss)}")
    print(f"{n} enlaces sin etiquetas completas en {files} archivos." if n else "Todos los enlaces propios de correos y publicaciones llevan sus etiquetas.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
