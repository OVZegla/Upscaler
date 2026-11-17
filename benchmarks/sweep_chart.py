"""Small multiples for the resolution sweep.

Averaging across the sweep images would be misleading: a chart sits near
SSIM 0.95 and a building near 0.60, so one panel per image keeps each
curve readable and stops a missing tier from bending the mean.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyse import COLOR, LABEL, ORDER, line_chart  # noqa: E402

from PIL import Image  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(HERE, "results-sweep.json")))

TITLES = {
    "sweepsrc_graphique": "Graphique à courbes",
    "sweepsrc_texte": "Texte, corps 56 à 7 px",
    "urban_020": "Façade d'immeuble",
}
bases = [b for b in ["sweepsrc_graphique", "sweepsrc_texte", "urban_020"]
         if any(r["sweep_base"] == b for r in rows)]

panels = []
for key, ylabel, fname in (("ssim", "SSIM", "ssim"), ("seconds", "secondes", "temps")):
    for b in bases:
        sub = [r for r in rows if r["sweep_base"] == b]
        tiers = sorted({int(r["tier"][:-2]) for r in sub})
        series = []
        for m in ORDER:
            if key == "seconds" and m == "Lanczos (sans IA)":
                continue
            ys = []
            for t in tiers:
                v = [r[key] for r in sub
                     if r["model"] == m and r["tier"] == f"{t}px"]
                ys.append(v[0] if v else float("nan"))
            series.append((LABEL[m], COLOR[m], ys))
        p = os.path.join(HERE, f"_panel_{fname}_{b}.png")
        line_chart(p, TITLES[b],
                   "fidélité, plus haut = mieux" if key == "ssim"
                   else "temps de calcul, processeur seul",
                   tiers, series, ylabel, "largeur de la source",
                   xticklabels=[f"{t}px" for t in tiers], w=760, h=430)
        panels.append((fname, p))

for fname in ("ssim", "temps"):
    ps = [p for f, p in panels if f == fname]
    ims = [Image.open(p) for p in ps]
    W = max(i.width for i in ims)
    H = sum(i.height for i in ims)
    c = Image.new("RGB", (W, H), "white")
    y = 0
    for i in ims:
        c.paste(i, (0, y))
        y += i.height
    out = os.path.join(HERE, f"chart-sweep-{fname}.png")
    c.save(out)
    print("wrote", out, c.size)

for _, p in panels:
    os.remove(p)
