#!/usr/bin/env python3
"""RealHunt · AI score with Claude (vision).
Reads public/data/rh-static.json, scores every home not yet scored and writes
public/data/ai-scores.json. Needs env ANTHROPIC_API_KEY (GitHub secret).
Usage: python3 scripts/ai_score.py [--force] [--limit N]
"""
import json, os, sys, time, urllib.request, urllib.error, datetime

SITE = "https://realhunt.co"
SRC = "public/data/rh-static.json"
OUT = "public/data/ai-scores.json"
MODELS = [m for m in [os.environ.get("RH_AI_MODEL"), "claude-haiku-4-5", "claude-sonnet-4-5"] if m]
KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()

PROMPT = """You are the photo editor of RealHunt, a viral feed of beautiful, affordable homes.
Rules of the feed: only homes that look beautiful and are ready to move in. No ugly, sad,
old-looking or run-down homes, no homes that need renovation, no depressing cover photos.

Home: {title}
Place: {place} · Price: EUR {price} · {sqm} m2 · {beds} bedrooms
Listing text: {text}

The photos are numbered 0..{n} in the order given. Score honestly and return ONLY this JSON:
{{"beauty": 0-100, "condition": 0-100, "move_in_ready": true/false,
"cover_ok": true/false, "best_cover": index of the most beautiful photo to use as cover,
"red_flags": ["short English phrases, e.g. needs renovation, dark rooms, damaged facade"],
"verdict_en": "max 12 words, honest and catchy", "verdict_es": "lo mismo en español",
"keep": true/false}}
cover_ok=false if photo 0 looks ugly, sad, dark, old or run-down from outside.
keep=false if the home breaks the feed rules (beauty < 60 or condition < 60 or not move-in ready)."""


def lst(v):
    if isinstance(v, list):
        return v
    try:
        import ast
        return ast.literal_eval(v) if v and v != "None" else []
    except Exception:
        return []


def call(content):
    last = None
    for model in MODELS:
        body = json.dumps({"model": model, "max_tokens": 600,
                           "messages": [{"role": "user", "content": content}]}).encode()
        for attempt in range(4):
            req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=body, headers={
                "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    j = json.load(r)
                txt = "".join(b.get("text", "") for b in j.get("content", []))
                return model, txt, j.get("usage", {})
            except urllib.error.HTTPError as e:
                msg = e.read().decode()[:300]
                last = f"{e.code} {msg}"
                if e.code == 404 or "model" in msg and e.code == 400:
                    break  # try next model
                if e.code in (429, 500, 502, 503, 529):
                    time.sleep(5 * (attempt + 1)); continue
                if e.code == 400 and "image" in msg.lower():
                    raise ValueError("bad image: " + msg)
                raise RuntimeError(last)
            except Exception as e:
                last = str(e); time.sleep(3)
    raise RuntimeError(last or "no model worked")


def parse(txt):
    s, e = txt.find("{"), txt.rfind("}")
    return json.loads(txt[s:e + 1])


def main():
    if not KEY:
        sys.exit("ANTHROPIC_API_KEY missing")
    force = "--force" in sys.argv
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 10**6
    rows = json.load(open(SRC))["rows"]
    out = json.load(open(OUT)) if os.path.exists(OUT) else {}
    done = cost_in = cost_out = 0
    for r in rows:
        slug = r.get("slug")
        if not slug or (slug in out and not force):
            continue
        if done >= limit:
            break
        imgs = [u if u.startswith("http") else SITE + u for u in lst(r.get("image_urls"))][:4]
        if not imgs:
            continue
        text = (str(r.get("why_great") or "") + " " + str(r.get("pick_note") or ""))[:1500]
        content = []
        for i, u in enumerate(imgs):
            content.append({"type": "text", "text": f"Photo {i}:"})
            content.append({"type": "image", "source": {"type": "url", "url": u}})
        content.append({"type": "text", "text": PROMPT.format(
            title=r.get("title"), place=r.get("location_name"), price=r.get("price_eur"),
            sqm=r.get("sqm"), beds=r.get("bedrooms"), text=text, n=len(imgs) - 1)})
        try:
            model, txt, usage = call(content)
            res = parse(txt)
        except ValueError:
            # some image failed to load: retry with the cover only
            try:
                model, txt, usage = call(content[:2] + content[-1:])
                res = parse(txt)
            except Exception as e:
                print("skip", slug, e); continue
        except Exception as e:
            print("skip", slug, e); continue
        res.update({"model": model, "at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")})
        out[slug] = res
        cost_in += usage.get("input_tokens", 0); cost_out += usage.get("output_tokens", 0)
        done += 1
        print(f"{done:4d} {slug:45s} beauty={res.get('beauty')} cond={res.get('condition')} keep={res.get('keep')} cover_ok={res.get('cover_ok')}")
        if done % 20 == 0:
            json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    usd = cost_in / 1e6 * 1.0 + cost_out / 1e6 * 5.0
    bad = [(s, v) for s, v in out.items() if not v.get("keep", True) or not v.get("cover_ok", True)]
    lines = [f"## RealHunt AI score", f"Scored now: {done} · total: {len(out)} · approx cost (Haiku): ${usd:.2f}", "",
             f"### Homes to review ({len(bad)})", "| home | beauty | condition | cover ok | keep | flags |", "|---|---|---|---|---|---|"]
    for s, v in sorted(bad, key=lambda x: (x[1].get("beauty") or 0)):
        lines.append(f"| [{s}]({SITE}/deal/{s}) | {v.get('beauty')} | {v.get('condition')} | {v.get('cover_ok')} | {v.get('keep')} | {', '.join(v.get('red_flags') or [])[:80]} |")
    rep = "\n".join(lines)
    print(rep)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        open(os.environ["GITHUB_STEP_SUMMARY"], "a").write(rep + "\n")
    open("public/data/ai-review.md", "w").write(rep + "\n")


if __name__ == "__main__":
    main()
