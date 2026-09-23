#!/usr/bin/env python3
"""Tell Bing, Yandex, Seznam and Naver (IndexNow) which RealHunt pages are new or changed.
Reads public/sitemap.xml. Key file: public/dc4a9477773c2eb3d504053f5db16785.txt. Google does not use IndexNow; it reads the sitemap."""
import json, os, re, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = "dc4a9477773c2eb3d504053f5db16785"
urls = re.findall(r"<loc>(.*?)</loc>", open(os.path.join(ROOT, "public", "sitemap.xml")).read())[:10000]
body = json.dumps({"host": "realhunt.co", "key": KEY, "keyLocation": f"https://realhunt.co/{KEY}.txt", "urlList": urls}).encode()
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
try:
    r = urllib.request.urlopen(req, timeout=60); print("indexnow", r.status, len(urls), "urls")
except Exception as e:
    print("indexnow failed:", e)
