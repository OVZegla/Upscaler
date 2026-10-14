"""4x round-trip benchmark.

Protocol, the standard one used in the super-resolution literature:
  ground truth -> downscale 4x (Lanczos) -> upscale 4x -> compare to GT.

Metrics are computed on the Y (luma) channel with a `scale`-pixel border
crop, as PSNR and SSIM both are in published SR results, so the figures are
comparable to the ones papers quote. A third figure, the sharpness ratio,
is the Laplacian variance of the result over that of the ground truth: 1.0
means the result carries as much fine structure as the original, above 1.0
means the model is adding contrast the original never had.
"""
import json
import os
import subprocess
import sys
import time

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GT = os.path.join(HERE, "gt")
WORK = os.path.join(HERE, "work")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN = os.path.join(REPO, "resources/linux/bin/upscayl-bin")
MODELS_DIR = os.path.join(REPO, "resources/models")
SCALE = 4

# Only the shipped model is present by default. The two retired ones are the
# official Real-ESRGAN ncnn weights (see ../NOTICE for the checksums); drop
# realesrgan-x4plus.{param,bin} and realesr-general-x4v3.{param,bin} into
# resources/models under these names to reproduce the original comparison.
MODELS = ["4xLSDIRCompactC3"]
# MODELS = ["4xLSDIRCompactC3", "upscayl-standard-4x", "upscayl-lite-4x"]

CATEGORY = {
    "set14_001": "Nature & paysage",      # baboon, fur
    "set14_002": "Visage",                # barbara
    "set14_003": "Nature & paysage",      # boats
    "set14_004": "Nature & paysage",      # coastguard
    "set14_005": "Graphique & trait",     # comic / illustration
    "set14_006": "Visage",
    "set14_007": "Nature & paysage",      # flowers
    "set14_008": "Visage",                # foreman
    "set14_009": "Visage",                # lenna
    "set14_010": "Visage",                # man
    "set14_011": "Nature & paysage",      # monarch
    "set14_012": "Nature & paysage",      # peppers
    "set14_013": "Texte",                 # powerpoint book cover
    "set14_014": "Nature & paysage",      # zebra
    "set5_001": "Visage",                 # baby
    "set5_002": "Nature & paysage",       # bird
    "set5_003": "Nature & paysage",       # butterfly
    "set5_004": "Visage",                 # head
    "set5_005": "Visage",                 # woman
    "synth_texte": "Texte",
    "synth_graphique": "Graphique & trait",
    "synth_traits": "Graphique & trait",
}
for u in ("001", "002", "004", "006", "011", "020", "044", "076", "092", "099"):
    CATEGORY[f"urban_{u}"] = "Bâtiment & architecture"


# ── Metrics ──────────────────────────────────────────────────────────────
def to_y(rgb):
    """BT.601 luma on 0-255, as the SR literature uses."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return 16.0 + (65.481 * r + 128.553 * g + 24.966 * b) / 255.0


def gauss_kernel(size=11, sigma=1.5):
    ax = np.arange(size) - size // 2
    k = np.exp(-(ax ** 2) / (2 * sigma ** 2))
    return k / k.sum()


def blur(a, k):
    """Separable convolution, 'valid' in both directions."""
    n = len(k)
    out = np.empty((a.shape[0], a.shape[1] - n + 1))
    for i in range(n):
        col = a[:, i:i + out.shape[1]] * k[i]
        out = col if i == 0 else out + col
    res = np.empty((out.shape[0] - n + 1, out.shape[1]))
    for i in range(n):
        row = out[i:i + res.shape[0], :] * k[i]
        res = row if i == 0 else res + row
    return res


def ssim(a, b):
    k = gauss_kernel()
    C1, C2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    mu_a, mu_b = blur(a, k), blur(b, k)
    saa = blur(a * a, k) - mu_a ** 2
    sbb = blur(b * b, k) - mu_b ** 2
    sab = blur(a * b, k) - mu_a * mu_b
    m = ((2 * mu_a * mu_b + C1) * (2 * sab + C2)) / \
        ((mu_a ** 2 + mu_b ** 2 + C1) * (saa + sbb + C2))
    return float(m.mean())


def psnr(a, b):
    mse = float(np.mean((a - b) ** 2))
    if mse <= 1e-12:
        return 99.0
    return float(20 * np.log10(255.0) - 10 * np.log10(mse))


def lap_var(a):
    lap = (-4 * a[1:-1, 1:-1] + a[:-2, 1:-1] + a[2:, 1:-1]
           + a[1:-1, :-2] + a[1:-1, 2:])
    return float(lap.var())


def compare(gt_img, out_img):
    g = np.asarray(gt_img.convert("RGB"), dtype=np.float64)
    o = np.asarray(out_img.convert("RGB"), dtype=np.float64)
    h = min(g.shape[0], o.shape[0])
    w = min(g.shape[1], o.shape[1])
    g, o = g[:h, :w], o[:h, :w]
    gy, oy = to_y(g), to_y(o)
    c = SCALE
    gy, oy = gy[c:-c, c:-c], oy[c:-c, c:-c]
    return {
        "psnr": psnr(gy, oy),
        "ssim": ssim(gy, oy),
        "sharp_ratio": lap_var(oy) / max(lap_var(gy), 1e-9),
    }


# ── Runner ───────────────────────────────────────────────────────────────
def upscale(model, src, dst):
    t = time.time()
    r = subprocess.run(
        [BIN, "-i", src, "-o", dst, "-m", MODELS_DIR, "-n", model,
         "-s", str(SCALE), "-f", "png"],
        capture_output=True,
    )
    return time.time() - t, r.returncode


def prepare(name, gt_path, target_w=None):
    """Writes the GT (optionally resized) and its 4x-downscaled input."""
    im = Image.open(gt_path).convert("RGB")
    if target_w:
        if im.width < target_w:
            return None
        im = im.resize((target_w, round(im.height * target_w / im.width)),
                       Image.LANCZOS)
    w, h = im.width - im.width % SCALE, im.height - im.height % SCALE
    im = im.crop((0, 0, w, h))
    gp = os.path.join(WORK, f"{name}__gt.png")
    sp = os.path.join(WORK, f"{name}__in.png")
    im.save(gp)
    im.resize((w // SCALE, h // SCALE), Image.LANCZOS).save(sp)
    return gp, sp, (w, h)


def run_case(name, gt_path, target_w=None, tier=""):
    prep = prepare(name, gt_path, target_w)
    if prep is None:
        return []
    gp, sp, (w, h) = prep
    gt_img = Image.open(gp)
    rows = []

    base = gt_img.resize((w // SCALE, h // SCALE), Image.LANCZOS) \
                 .resize((w, h), Image.LANCZOS)
    rows.append(dict(image=name, tier=tier, model="Lanczos (sans IA)",
                     seconds=0.0, out_w=w, out_h=h, in_w=w // SCALE,
                     **compare(gt_img, base)))

    for model in MODELS:
        dst = os.path.join(WORK, f"{name}__{model}.png")
        secs, rc = upscale(model, sp, dst)
        if rc != 0 or not os.path.exists(dst):
            print(f"  !! {name} {model} rc={rc}", flush=True)
            continue
        out = Image.open(dst)
        rows.append(dict(image=name, tier=tier, model=model, seconds=secs,
                         out_w=out.width, out_h=out.height, in_w=w // SCALE,
                         **compare(gt_img, out)))
        os.remove(dst)
    os.remove(gp)
    os.remove(sp)
    return rows


def main():
    os.makedirs(WORK, exist_ok=True)
    results = []
    out_path = os.path.join(HERE, "results.json")

    names = sorted(n[:-4] for n in os.listdir(GT) if n.endswith(".png"))
    print(f"=== main run: {len(names)} images ===", flush=True)
    for i, name in enumerate(names, 1):
        t = time.time()
        rows = run_case(name, os.path.join(GT, f"{name}.png"), tier="native")
        for r in rows:
            r["category"] = CATEGORY.get(name, "Autre")
        results += rows
        json.dump(results, open(out_path, "w"), indent=1)
        print(f"[{i}/{len(names)}] {name} ({time.time()-t:.0f}s)", flush=True)

    # Resolution sweep: same picture, four source sizes.
    sweep = ["urban_020", "set14_013", "synth_graphique", "set14_009"]
    tiers = [256, 512, 1024, 1600]
    print("=== resolution sweep ===", flush=True)
    for name in sweep:
        for tw in tiers:
            rows = run_case(f"{name}@{tw}", os.path.join(GT, f"{name}.png"),
                            target_w=tw, tier=f"{tw}px")
            for r in rows:
                r["category"] = CATEGORY.get(name, "Autre")
                r["sweep_base"] = name
            results += rows
            json.dump(results, open(out_path, "w"), indent=1)
            print(f"  {name} @{tw} -> {len(rows)} rows", flush=True)

    print("DONE", len(results), flush=True)


if __name__ == "__main__":
    main()
