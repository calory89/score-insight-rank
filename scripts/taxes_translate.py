#!/usr/bin/env python3
"""Fill the Spanish version ("es") of public/data/taxes.json with Claude (only missing countries,
or all with --force). Needs ANTHROPIC_API_KEY. Run by .github/workflows/rh-taxes.yml."""
import json, os, sys, time, urllib.request, urllib.error
P = "public/data/taxes.json"
KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
MODELS = ["claude-haiku-4-5", "claude-sonnet-4-5"]
def ask(text):
    for m in MODELS:
        for a in range(4):
            req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=json.dumps({"model": m, "max_tokens": 4000, "messages": [{"role": "user", "content": text}]}).encode(),
                headers={"x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=180) as r:
                    j = json.load(r)
                return "".join(b.get("text", "") for b in j["content"])
            except urllib.error.HTTPError as e:
                if e.code == 404: break
                time.sleep(5 * (a + 1))
    raise RuntimeError("no model")
def main():
    force = "--force" in sys.argv
    T = json.load(open(P))
    n = 0
    for c, v in T["countries"].items():
        if v.get("es") and not force: continue
        payload = {"en": v["en"]}
        if v.get("states"): payload["states"] = v["states"]["en"]
        q = ("Translate the string values of this JSON from English to natural Spanish (Spain) for a home-buying website. "
             "Keep keys, numbers, currency codes, tax names (ITP, IBI, IMU, SDLT, FIRPTA, IMT, etc.) and percentages exactly; "
             "use comma as decimal separator (0,5%). Return ONLY valid JSON with the same structure.\n" + json.dumps(payload, ensure_ascii=False))
        j = None
        for _ in range(4):
            try:
                t = ask(q); jj = json.loads(t[t.find("{"): t.rfind("}") + 1])
                body = jj.get("en") or jj.get("es") or jj
                if not isinstance(body, dict) or body == v["en"] or sum(body.get(k) == v["en"].get(k) for k in v["en"]) > 2:
                    raise ValueError("not translated")
                j = jj; break
            except Exception as e:
                print("retry", c, e)
        if not j: continue
        v["es"] = {k: x for k, x in (j.get("en") or j.get("es") or j).items() if k in v["en"]}
        st = j.get("states")
        if st and v.get("states"): v["states"]["es"] = st
        n += 1; print("es", c)
    json.dump(T, open(P, "w"), ensure_ascii=False, separators=(",", ":"))
    print("translated", n)
if __name__ == "__main__":
    main()
