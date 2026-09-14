#!/usr/bin/env python3
"""Run this after adding HTML files to vendor/games/"""
import json, re
from pathlib import Path
games = Path(__file__).parent / "games"
out = Path(__file__).parent / "games-manifest.json"
manifest = []
for p in sorted(games.iterdir()):
    if not p.is_file():
        continue
    name = p.name
    t = name
    if t.startswith("cl"):
        t = t[2:]
    t = re.sub(r"\.(html?|txt|docx)$", "", t, flags=re.I)
    t = re.sub(r"([a-z])([A-Z])", r"\1 \2", t)
    t = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1 \2", t)
    t = re.sub(r"[_-]+", " ", t)
    t = re.sub(r"\s+", " ", t).strip() or name
    letter = t[0].upper() if t else "#"
    if not letter.isalpha():
        letter = "#"
    manifest.append({"file": name, "title": t, "letter": letter})
manifest.sort(key=lambda x: (x["letter"], x["title"].lower()))
out.write_text(json.dumps(manifest, indent=2))
print("wrote", len(manifest), "games ->", out)
