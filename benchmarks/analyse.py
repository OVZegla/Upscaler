"""Turns results.json into the tables and the curve charts."""
import json
import os
from collections import defaultdict

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "renderer/fonts/poppins")

LABEL = {
    "4xLSDIRCompactC3": "Précision",
    "upscayl-standard-4x": "Classique",
    "upscayl-lite-4x": "Léger",
    "Lanczos (sans IA)": "Lanczos",
}
ORDER = ["4xLSDIRCompactC3", "upscayl-standard-4x", "upscayl-lite-4x",
         "Lanczos (sans IA)"]
COLOR = {
    "4xLSDIRCompactC3": (0, 85, 164),
    "upscayl-standard-4x": (208, 18, 23),
    "upscayl-lite-4x": (22, 140, 92),
    "Lanczos (sans IA)": (150, 152, 160),
}

rows = json.load(open(os.path.join(HERE, "results.json")))
native = [r for r in rows if r["tier"] == "native"]
sweep = [r for r in rows if r["tier"] != "native"]


def mean(vals):
    return sum(vals) / len(vals) if vals else float("nan")


def agg(subset, key):
    out = {}
    for m in ORDER:
        v = [r[key] for r in subset if r["model"] == m]
        out[m] = mean(v)
    return out


# ── Tables ───────────────────────────────────────────────────────────────
lines = []
n_img = len({r["image"] for r in native})
lines.append(f"GLOBAL — {n_img} images, agrandissement 4x")
lines.append(f"{'modèle':<12}{'PSNR dB':>9}{'SSIM':>8}{'netteté':>9}{'temps s':>9}")
P, S, H, T = (agg(native, k) for k in ("psnr", "ssim", "sharp_ratio", "seconds"))
for m in ORDER:
    lines.append(f"{LABEL[m]:<12}{P[m]:>9.2f}{S[m]:>8.4f}{H[m]:>9.2f}{T[m]:>9.1f}")

lines.append("")
cats = sorted({r["category"] for r in native})
for c in cats:
    sub = [r for r in native if r["category"] == c]
    k = len({r["image"] for r in sub})
    lines.append(f"{c.upper()} ({k} images)")
    P, S, H = (agg(sub, x) for x in ("psnr", "ssim", "sharp_ratio"))
    for m in ORDER:
        lines.append(f"  {LABEL[m]:<12}{P[m]:>9.2f}{S[m]:>8.4f}{H[m]:>9.2f}")
    lines.append("")

# Win count: how often each model is the best AI model on an image.
wins = defaultdict(int)
ai = [m for m in ORDER if m != "Lanczos (sans IA)"]
for img in sorted({r["image"] for r in native}):
    sub = {r["model"]: r for r in native if r["image"] == img}
    best = max((m for m in ai if m in sub), key=lambda m: sub[m]["ssim"],
               default=None)
    if best:
        wins[best] += 1
lines.append("MEILLEUR MODÈLE PAR IMAGE (SSIM)")
for m in ai:
    lines.append(f"  {LABEL[m]:<12}{wins[m]:>3} / {n_img}")

report = "\n".join(lines)
open(os.path.join(HERE, "report.txt"), "w").write(report)
print(report)


# ── Charts ───────────────────────────────────────────────────────────────
def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def line_chart(path, title, subtitle, xs, series, ylabel, xlabel,
               xticklabels=None, w=1100, h=620, ss=2):
    """series: list of (label, color, ys)."""
    W, H = w * ss, h * ss
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    L, R, T, B = 110 * ss, (w - 230) * ss, 108 * ss, (h - 78) * ss

    d.text((50 * ss, 30 * ss), title, font=font("Poppins-Bold.ttf", 25 * ss),
           fill=(16, 16, 20))
    d.text((50 * ss, 66 * ss), subtitle,
           font=font("Poppins-Regular.ttf", 14 * ss), fill=(110, 112, 120))

    allv = [v for _, _, ys in series for v in ys if v == v]
    lo, hi = min(allv), max(allv)
    pad = (hi - lo) * 0.18 or 1
    lo, hi = lo - pad, hi + pad

    f_t = font("Poppins-Regular.ttf", 13 * ss)
    for i in range(6):
        y = B - (B - T) * i / 5
        val = lo + (hi - lo) * i / 5
        d.line([(L, y), (R, y)], fill=(230, 232, 238), width=ss)
        d.text((L - 62 * ss, y - 9 * ss), f"{val:.2f}", font=f_t,
               fill=(120, 122, 130))
    n = len(xs)
    for i in range(n):
        x = L + (R - L) * (i / max(1, n - 1))
        lab = xticklabels[i] if xticklabels else str(xs[i])
        # textlength refuses multiline strings, so lay the lines out by hand.
        for j, part in enumerate(lab.split("\n")):
            tw = d.textlength(part, font=f_t)
            d.text((x - tw / 2, B + (16 + j * 17) * ss), part, font=f_t,
                   fill=(120, 122, 130))
    d.line([(L, T), (L, B)], fill=(40, 42, 50), width=2 * ss)
    d.line([(L, B), (R, B)], fill=(40, 42, 50), width=2 * ss)
    d.text((50 * ss, (T + B) / 2 - 40 * ss), ylabel,
           font=font("Poppins-Medium.ttf", 13 * ss), fill=(90, 92, 100))
    d.text(((L + R) / 2 - 60 * ss, B + 44 * ss), xlabel,
           font=font("Poppins-Medium.ttf", 13 * ss), fill=(90, 92, 100))

    for label, col, ys in series:
        pts = []
        for i, v in enumerate(ys):
            if v != v:
                continue
            x = L + (R - L) * (i / max(1, n - 1))
            y = B - (B - T) * (v - lo) / (hi - lo)
            pts.append((x, y))
        if len(pts) > 1:
            d.line(pts, fill=col, width=3 * ss, joint="curve")
        for (x, y) in pts:
            r = 5 * ss
            d.ellipse([x - r, y - r, x + r, y + r], fill="white", outline=col,
                      width=2 * ss)

    lx, ly = R + 26 * ss, T
    for i, (label, col, _) in enumerate(series):
        yy = ly + i * 30 * ss
        d.line([(lx, yy + 9 * ss), (lx + 28 * ss, yy + 9 * ss)], fill=col,
               width=4 * ss)
        d.text((lx + 38 * ss, yy), label,
               font=font("Poppins-Medium.ttf", 14 * ss), fill=(40, 42, 50))

    img.resize((w, h), Image.LANCZOS).save(path)
    print("wrote", path)


# 1. SSIM per category
cats_order = [c for c in ["Texte", "Graphique & trait",
                          "Bâtiment & architecture", "Visage",
                          "Nature & paysage"] if c in cats]
series = []
for m in ORDER:
    ys = []
    for c in cats_order:
        sub = [r[ "ssim"] for r in native
               if r["category"] == c and r["model"] == m]
        ys.append(mean(sub))
    series.append((LABEL[m], COLOR[m], ys))
line_chart(os.path.join(HERE, "chart-categories.png"),
           "Fidélité par type d'image (SSIM, plus haut = mieux)",
           "Agrandissement 4x — image réduite puis réagrandie, comparée à l'originale",
           list(range(len(cats_order))), series, "SSIM", "type d'image",
           xticklabels=[c.replace(" & ", " &\n") for c in cats_order])

# 2. Resolution sweep
if sweep:
    tiers = sorted({int(r["tier"][:-2]) for r in sweep})
    series = []
    for m in ORDER:
        ys = []
        for t in tiers:
            sub = [r["ssim"] for r in sweep
                   if r["model"] == m and r["tier"] == f"{t}px"]
            ys.append(mean(sub))
        series.append((LABEL[m], COLOR[m], ys))
    line_chart(os.path.join(HERE, "chart-resolution.png"),
               "Fidélité selon la taille de la source",
               "Mêmes images, 4 résolutions. L'axe donne la largeur de l'image d'origine.",
               tiers, series, "SSIM", "largeur de la source (px)",
               xticklabels=[f"{t}px\n→ {t//4}px en entrée" for t in tiers])

    series = []
    for m in ORDER:
        if m == "Lanczos (sans IA)":
            continue
        ys = []
        for t in tiers:
            sub = [r["seconds"] for r in sweep
                   if r["model"] == m and r["tier"] == f"{t}px"]
            ys.append(mean(sub))
        series.append((LABEL[m], COLOR[m], ys))
    line_chart(os.path.join(HERE, "chart-temps.png"),
               "Temps de calcul selon la taille de la source",
               "Processeur seul (pas de GPU). Les écarts relatifs se conservent sur GPU.",
               tiers, series, "secondes", "largeur de la source (px)",
               xticklabels=[f"{t}px" for t in tiers])

# 3. Sharpness ratio per category — the over-sharpening tell
series = []
for m in ORDER:
    ys = []
    for c in cats_order:
        sub = [r["sharp_ratio"] for r in native
               if r["category"] == c and r["model"] == m]
        ys.append(mean(sub))
    series.append((LABEL[m], COLOR[m], ys))
series.append(("Original = 1,0", (20, 20, 24), [1.0] * len(cats_order)))
line_chart(os.path.join(HERE, "chart-nettete.png"),
           "Sur-accentuation par type d'image",
           "Rapport de détail fin au détail de l'original. 1,0 = fidèle ; au-dessus = contraste ajouté.",
           list(range(len(cats_order))), series, "rapport", "type d'image",
           xticklabels=[c.replace(" & ", " &\n") for c in cats_order])
