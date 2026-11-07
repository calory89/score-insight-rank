#!/usr/bin/env python3
"""Keep realhunt.co from filling the shared assets/ folder of webs-estaticas pub/_lovable.

Every realhunt build adds ~110-240 new hashed files (Vite: <name>-<8 char hash>.<ext>) to the root assets/
folder that ~60 sites share. Nothing ever removed the old ones, and on 7-nov-2026 the branch hit the Cloudflare
Pages limit of 20,000 files and every site stopped deploying. This runs inside the deploy checkout after the new
build has been merged and staged (git add), and:

  1. reads assets/.realhunt-manifest.txt (lines "<epoch>\t<sha>\t<file>": the realhunt builds that wrote each file);
  2. candidates = files of earlier realhunt builds that the new build does not contain. Grace: the previous build
     and any build of the last 2 hours stay (pages cached by Cloudflare or open tabs still load their chunks).
     First run (no manifest yet): every root assets/ file with a Vite hashed name that the new build lacks;
  3. keeps every candidate still referenced by any other file in the whole tree (all sites, _worker.js, the new
     build, and other kept files, followed transitively). Only the rest is removed (git rm);
  4. writes the new manifest (new build + the earlier realhunt files that are still there).

Never touches anything outside the root assets/ folder. Prints what it did; --dry-run changes nothing.
Usage (cwd = deploy checkout): python3 prune_shared_assets.py <dist/assets dir> <sha> [--dry-run]
"""
import os, re, subprocess, sys, time

DIST_ASSETS, SHA = sys.argv[1], sys.argv[2][:7]
DRY = "--dry-run" in sys.argv
MANIFEST = "assets/.realhunt-manifest.txt"
GRACE = 2 * 3600
NOW = int(time.time())
VITE_NAME = re.compile(r"^[A-Za-z0-9_$.~-]+-[A-Za-z0-9_-]{8}\.(?:js|mjs|css|woff2?|ttf|otf|svg|png|webp|jpe?g|gif|avif|ico|wasm|json)$")
EXT = rb"(?:js|mjs|css|woff2?|ttf|otf|svg|png|webp|jpe?g|gif|avif|ico|wasm|json|mp4)"
REF = re.compile(rb"([A-Za-z0-9_-]{8})\." + EXT + rb"(?![A-Za-z0-9])")  # the 8 characters before ".ext" = a Vite hash
BINARY = (".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif", ".ico", ".mp4", ".webm", ".mov", ".pdf", ".zip", ".gz",
          ".woff", ".woff2", ".ttf", ".otf", ".eot", ".wasm", ".mp3", ".heic")

def git(*a, inp=None):
    return subprocess.run(["git", *a], input=inp, capture_output=True, check=True).stdout

def key(name):  # what a reference to this file looks like to REF, or None when the name has no 8-char hash
    stem, _, ext = name.rpartition(".")
    return (stem[-8:] + "." + ext).encode() if len(stem) >= 8 else None

# The staged tree: every file of every site (sparse checkout: most are only in the index).
index = {}
for line in git("ls-files", "-s", "-z").split(b"\0"):
    if not line: continue
    meta, path = line.split(b"\t", 1)
    index[path.decode()] = meta.split()[1].decode()
root_assets = {p[7:] for p in index if p.startswith("assets/") and "/" not in p[7:] and p != MANIFEST}
new_build = {f for f in os.listdir(DIST_ASSETS) if os.path.isfile(os.path.join(DIST_ASSETS, f))}

old = {}  # file -> (epoch, sha) of the latest realhunt build that wrote it
first_run = not os.path.exists(MANIFEST)
if not first_run:
    for line in open(MANIFEST, encoding="utf8"):
        parts = line.rstrip("\n").split("\t")
        if len(parts) == 3 and parts[0].isdigit():
            e, s, f = int(parts[0]), parts[1], parts[2]
            if f not in old or old[f][0] < e: old[f] = (e, s)
latest = max((e for e, _ in old.values()), default=None)  # the previous build (the one live right now)
old = {f: v for f, v in old.items() if f in root_assets and f not in new_build}

class Blobs:  # one "git cat-file --batch" for all reads
    def __init__(self): self.p = subprocess.Popen(["git", "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    def read(self, oid):
        self.p.stdin.write(oid.encode() + b"\n"); self.p.stdin.flush()
        head = self.p.stdout.readline().split()
        if len(head) < 3: return b""
        data = self.p.stdout.read(int(head[2])); self.p.stdout.read(1)
        return data
blobs = Blobs()
def blob(path): return blobs.read(index[path])
def refs_in(data):
    return {m.group(1) + b"." + m.group(0).rsplit(b".", 1)[1] for m in REF.finditer(data)}

if first_run:
    # The build that is live right now is the "previous build": its HTML is the version in HEAD before this commit.
    prev = set()
    try: prev_keys = refs_in(git("show", "HEAD:_s/realhunt.co/index.html"))
    except subprocess.CalledProcessError: prev_keys = set()
    prev = {f for f in root_assets if key(f) in prev_keys}
    candidates = {f for f in root_assets if f not in new_build and VITE_NAME.match(f)}
    grace = {f for f in candidates if f in prev}
else:
    grace = {f for f, (e, _) in old.items() if NOW - e < GRACE or e == latest}
    candidates = set(old)
candidates -= grace

# Roots: every text file of the tree that is not a candidate (new build, all other sites, _worker.js, ...), plus
# the grace files. A candidate referenced by a root is kept and becomes a root too, until nothing new is found.
text_paths = [p for p in index if not p.lower().endswith(BINARY)]
absent = {l[1:].strip() for l in git("rev-list", "--objects", "--missing=print", "HEAD").decode().splitlines() if l.startswith("?")}
missing = [index[p] for p in text_paths if index[p] in absent]  # not downloaded yet (no lazy fetch here)
if missing:  # partial clone: fetch the other sites' text blobs in one go (cat-file would fetch them one by one)
    subprocess.run(["git", "-c", "fetch.negotiationAlgorithm=noop", "fetch", "-q", "--no-tags", "--no-write-fetch-head",
                    "--recurse-submodules=no", "--filter=blob:none", "--stdin", "origin"],
                   input="\n".join(sorted(set(missing))).encode(), check=True)

by_key = {}
for f in candidates:
    by_key.setdefault(key(f), set()).add(f)
nokey = by_key.pop(None, set())  # odd names: matched by plain substring search

kept, seen_keys, queue = set(), set(), []
roots = [p for p in text_paths if not (p.startswith("assets/") and p[7:] in candidates)]
roots += ["assets/" + f for f in grace]
def scan(path):
    data = blob(path)
    found = refs_in(data) - seen_keys
    seen_keys.update(found)
    hits = set()
    for k in found: hits |= by_key.get(k, set())
    hits |= {f for f in nokey if f.encode() in data}
    return hits - kept
t0 = time.time()
for p in roots:
    for f in scan(p): kept.add(f); queue.append(f)
while queue:
    f = queue.pop()
    for g in scan("assets/" + f): kept.add(g); queue.append(g)
remove = sorted(candidates - kept)
print(f"root assets {len(root_assets)}, new build {len(new_build)}, realhunt files of earlier builds {len(old)}"
      f"{' (first run: Vite-named files)' if first_run else ''}, grace {len(grace)}, candidates {len(candidates)}, "
      f"still referenced {len(kept)}, remove {len(remove)} (scanned {len(roots)} files in {time.time() - t0:.0f}s)")

if DRY or os.environ.get("RH_PRUNE_VERBOSE"):
    for f in remove: print("  remove assets/" + f)
if not DRY:
    for i in range(0, len(remove), 500):
        git("rm", "-q", "--cached", "--ignore-unmatch", "--", *["assets/" + f for f in remove[i:i + 500]])
        for f in remove[i:i + 500]:
            try: os.remove("assets/" + f)
            except FileNotFoundError: pass
    rows = {f: (NOW, SHA) for f in new_build}
    for f, v in old.items():
        if f not in remove: rows[f] = v
    if first_run:
        for f in grace: rows[f] = (NOW - 1, "live")
    with open(MANIFEST, "w", encoding="utf8") as fh:
        fh.write("".join(f"{e}\t{s}\t{f}\n" for f, (e, s) in sorted(rows.items())))
    git("add", MANIFEST)
summ = os.environ.get("GITHUB_STEP_SUMMARY")
if summ:
    with open(summ, "a") as fh: fh.write(f"shared assets: removed {len(remove)} old realhunt files, kept {len(kept)} still referenced\n")
