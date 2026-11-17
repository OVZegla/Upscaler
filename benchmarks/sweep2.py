"""Controlled resolution sweep: the same picture at four source widths.

The synthetic sources are rendered at 2x so every tier is a genuine
downscale — no tier is ever obtained by enlarging the ground truth, which
would make the comparison meaningless.
"""
import json
import os
import sys

# -I drops the script's directory from sys.path; only our own modules live
# here (the downloaded corpus is images under gt/), so re-adding it is safe.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run as R  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

CASES = [
    ("sweepsrc_graphique", "Graphique & trait"),
    ("sweepsrc_texte", "Texte"),
    ("urban_020", "Bâtiment & architecture"),
]
TIERS = [256, 512, 1024, 1280]

os.makedirs(R.WORK, exist_ok=True)
results = []
out = os.path.join(HERE, "results-sweep.json")

for name, cat in CASES:
    src = os.path.join(R.GT, f"{name}.png")
    for tw in TIERS:
        rows = R.run_case(f"{name}@{tw}", src, target_w=tw, tier=f"{tw}px")
        for r in rows:
            r["category"] = cat
            r["sweep_base"] = name
        results += rows
        json.dump(results, open(out, "w"), indent=1)
        print(f"{name} @{tw}px -> {len(rows)} rows", flush=True)

print("DONE", len(results), flush=True)
