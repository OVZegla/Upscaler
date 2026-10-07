"""Synthesises the two categories the standard SR benchmarks lack: text at a
range of point sizes, and a line chart with smooth curves. Both are rendered
with supersampling so the ground truth looks like real vector output rather
than aliased drawing."""
import math
import os

from PIL import Image, ImageDraw, ImageFont

FONTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "renderer/fonts/poppins")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gt")
SS = 3  # supersampling factor


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def finish(img, w, h, path):
    img.resize((w, h), Image.LANCZOS).save(path)
    print("wrote", path, (w, h))


# ── 1. Text at many sizes ────────────────────────────────────────────────
def text_panel(w=768, h=768, out="synth_texte"):
    K = w / 768.0
    img = Image.new("RGB", (w * SS, h * SS), "white")
    d = ImageDraw.Draw(img)
    LINE = ("Impression grand format — 1234567890"
            " ABCDEFGHIJ abcdefghij éèàçù")
    y = int(26 * K) * SS
    for pt in (56, 42, 32, 24, 18, 14, 11, 9, 7):
        f = font("Poppins-Regular.ttf", int(pt * K) * SS)
        d.text((int(24 * K) * SS, y), f"{pt}px  {LINE}", font=f, fill=(20, 20, 24))
        y += int(pt * 1.55 * K) * SS
    # Bold block, then reversed text: the hardest case for an upscaler.
    y += int(14 * K) * SS
    for pt in (28, 18, 12, 9):
        f = font("Poppins-Bold.ttf", int(pt * K) * SS)
        d.text((int(24 * K) * SS, y), f"GRAS {pt}px — Symp's Upscale", font=f,
               fill=(0, 46, 122))
        y += int(pt * 1.6 * K) * SS
    d.rectangle([int(20 * K) * SS, y, (w - int(20 * K)) * SS, (h - int(20 * K)) * SS], fill=(14, 20, 40))
    y += int(16 * K) * SS
    for pt in (22, 15, 10):
        f = font("Poppins-Medium.ttf", int(pt * K) * SS)
        d.text((int(34 * K) * SS, y), f"Texte inversé {pt}px — 0123456789", font=f,
               fill=(255, 255, 255))
        y += int(pt * 1.7 * K) * SS
    finish(img, w, h, f"{OUT}/{out}.png")


# ── 2. Line chart with smooth curves ─────────────────────────────────────
def chart(w=1024, h=768, out="synth_graphique"):
    K = w / 1024.0
    img = Image.new("RGB", (w * SS, h * SS), "white")
    d = ImageDraw.Draw(img)
    S = max(1, int(round(SS * K)))
    L, R, T, B = 90 * S, (w - 40) * S, 70 * S, (h - 70) * S

    f_title = font("Poppins-Bold.ttf", 26 * S)
    f_lab = font("Poppins-Regular.ttf", 13 * S)
    f_leg = font("Poppins-Medium.ttf", 14 * S)

    d.text((L, 24 * S), "Rendement par passe d'agrandissement",
           font=f_title, fill=(16, 16, 20))

    # Grid + axes: thin lines are what kills a bad upscaler.
    for i in range(11):
        y = T + (B - T) * i / 10
        d.line([(L, y), (R, y)], fill=(222, 224, 230), width=max(1, S // 2))
        d.text((L - 46 * S, y - 9 * S), f"{100 - i * 10}", font=f_lab,
               fill=(110, 112, 120))
    for i in range(13):
        x = L + (R - L) * i / 12
        d.line([(x, T), (x, B)], fill=(238, 239, 243), width=max(1, S // 2))
        d.text((x - 8 * S, B + 14 * S), f"{i}", font=f_lab, fill=(110, 112, 120))
    d.line([(L, T), (L, B)], fill=(40, 42, 50), width=2 * S)
    d.line([(L, B), (R, B)], fill=(40, 42, 50), width=2 * S)

    series = [
        ("Précision", (0, 85, 164), lambda t: 0.5 + 0.42 * math.sin(t * 2.4)),
        ("Classique", (208, 18, 23), lambda t: 0.5 + 0.34 * math.sin(t * 3.7 + 1.1)),
        ("Léger", (22, 140, 92), lambda t: 0.5 + 0.26 * math.sin(t * 1.6 + 2.3)
         + 0.12 * math.cos(t * 6.0)),
    ]
    for name, col, fn in series:
        pts = []
        N = 600
        for k in range(N + 1):
            t = k / N * math.pi * 2
            x = L + (R - L) * k / N
            y = B - (B - T) * max(0.02, min(0.98, fn(t)))
            pts.append((x, y))
        d.line(pts, fill=col, width=3 * S, joint="curve")
        # Markers every 50 points — small filled circles, a classic failure case.
        for k in range(0, N + 1, 50):
            x, y = pts[k]
            r = 5 * S
            d.ellipse([x - r, y - r, x + r, y + r], fill="white", outline=col,
                      width=2 * S)

    lx, ly = R - 210 * S, T + 16 * S
    d.rectangle([lx - 14 * S, ly - 12 * S, R - 12 * S, ly + 86 * S],
                fill="white", outline=(214, 216, 222), width=max(1, S))
    for i, (name, col, _) in enumerate(series):
        yy = ly + i * 26 * S
        d.line([(lx, yy + 8 * S), (lx + 30 * S, yy + 8 * S)], fill=col,
               width=3 * S)
        d.text((lx + 40 * S, yy), name, font=f_leg, fill=(40, 42, 50))

    finish(img, w, h, f"{OUT}/{out}.png")


# ── 3. Flat line art: logo-like shapes, the vector case ──────────────────
def lineart(w=768, h=768):
    img = Image.new("RGB", (w * SS, h * SS), "white")
    d = ImageDraw.Draw(img)
    S = SS
    cx, cy = w * S / 2, h * S / 2
    for i in range(14):
        r = (40 + i * 24) * S
        d.ellipse([cx - r, cy - r * 0.72, cx + r, cy + r * 0.72],
                  outline=(0, 60, 150) if i % 2 else (210, 20, 25),
                  width=max(1, int(2.2 * S)))
    for a in range(0, 360, 9):
        rad = math.radians(a)
        d.line([(cx, cy),
                (cx + math.cos(rad) * 350 * S, cy + math.sin(rad) * 250 * S)],
               fill=(30, 32, 40), width=max(1, S))
    d.rectangle([60 * S, 60 * S, (w - 60) * S, (h - 60) * S],
                outline=(16, 16, 20), width=3 * S)
    finish(img, w, h, f"{OUT}/synth_traits.png")


import sys
if len(sys.argv) > 1 and sys.argv[1] == 'big':
    text_panel(1536, 1536, 'sweepsrc_texte')
    chart(2048, 1536, 'sweepsrc_graphique')
else:
    text_panel()
    chart()
    lineart()
