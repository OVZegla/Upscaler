"""Builds the training set for the fast Android model.

Inputs are images a nail machine might be given, and targets are what the
shipped model makes of them. The fast model is trained to imitate the shipped
one (distillation), so no ground-truth high-resolution photos are needed, and
the only images used are ones nobody's rights stand in the way of:

  - the scikit-image sample photos marked public domain or CC0 (NASA,
    SpaceX, and photographers who waived their rights), and
  - several hundred images drawn here, in the manner of nail art: gradients,
    French tips, flowers, dots, glitter, marble, animal print, lettering.

Each image is enlarged by the shipped ONNX model exactly as the app does it
(mirror-padded, x4, then each 2x2 block averaged), and saved with it.

Usage: python3 make_dataset.py <teacher.onnx> <out_dir>
"""
import io
import os
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import skimage.data as skd

RNG = np.random.default_rng(2026)
PAD = 18

# Each one's docstring states its terms: public domain or CC0, nothing else.
FREE_PHOTOS = ["astronaut", "chelsea", "coffee", "rocket", "brick", "grass",
               "gravel", "hubble_deep_field", "retina", "camera", "text"]


def rgb(a):
    a = np.asarray(a)
    if a.ndim == 2:
        a = np.stack([a] * 3, 2)
    return Image.fromarray(a[..., :3].astype(np.uint8))


def tint(im):
    """Gives a grey photo a random colour cast, so texture comes in colours."""
    a = np.asarray(im).astype(np.float32) / 255
    c = RNG.uniform(0.35, 1.0, 3)
    lo = RNG.uniform(0, 0.25, 3)
    return Image.fromarray(np.clip((lo + a * (c - lo)) * 255, 0, 255).astype(np.uint8))


def hue_shift(im):
    hsv = np.asarray(im.convert("HSV")).copy()
    hsv[..., 0] = (hsv[..., 0].astype(int) + int(RNG.integers(0, 256))) % 256
    return Image.fromarray(hsv, "HSV").convert("RGB")


def photos():
    out = []
    for name in FREE_PHOTOS:
        im = rgb(getattr(skd, name)())
        grey = np.ptp(np.asarray(im).astype(int).std(2)) == 0
        for scale in (1.0, 0.7, 0.5, 0.35):
            w, h = int(im.width * scale), int(im.height * scale)
            if min(w, h) < 96:
                continue
            s = im.resize((w, h), Image.LANCZOS)
            for _ in range(4):
                cw, ch = min(256, w), min(256, h)
                x, y = int(RNG.integers(0, w - cw + 1)), int(RNG.integers(0, h - ch + 1))
                c = s.crop((x, y, x + cw, y + ch))
                c = tint(c) if grey else (hue_shift(c) if RNG.random() < 0.5 else c)
                out.append(c)
    return out


def colour():
    return tuple(int(v) for v in RNG.integers(0, 256, 3))


def gradient(w, h):
    a, b = np.array(colour(), float), np.array(colour(), float)
    t = np.linspace(0, 1, h)[:, None, None] if RNG.random() < 0.5 else np.linspace(0, 1, w)[None, :, None]
    g = a + (b - a) * t
    return Image.fromarray(np.broadcast_to(g, (h, w, 3)).astype(np.uint8))


def marble(w, h):
    n = RNG.normal(size=(h // 8 + 2, w // 8 + 2))
    n = np.asarray(Image.fromarray(((n - n.min()) / np.ptp(n) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)) / 255
    yy, xx = np.mgrid[0:h, 0:w]
    v = (np.sin((xx * RNG.uniform(0.02, 0.08) + yy * RNG.uniform(0.01, 0.05)) + n * RNG.uniform(4, 10)) + 1) / 2
    a, b = np.array(colour(), float), np.array(colour(), float)
    return Image.fromarray((a + (b - a) * v[..., None]).astype(np.uint8))


def nail_art():
    w, h = int(RNG.integers(128, 288)), int(RNG.integers(128, 288))
    im = marble(w, h) if RNG.random() < 0.35 else gradient(w, h)
    d = ImageDraw.Draw(im)
    kind = RNG.integers(0, 6)
    if kind == 0:  # French tip
        r = int(RNG.integers(h // 4, h // 2))
        d.ellipse([-w // 3, h - r, w + w // 3, h + r], fill=colour())
        d.arc([-w // 3, h - r, w + w // 3, h + r], 180, 360, fill=colour(), width=int(RNG.integers(1, 4)))
    elif kind == 1:  # flowers
        for _ in range(int(RNG.integers(1, 5))):
            cx, cy, r = int(RNG.integers(0, w)), int(RNG.integers(0, h)), int(RNG.integers(8, 40))
            pc = colour()
            for k in range(int(RNG.integers(4, 8))):
                ang = k * 2 * np.pi / 6
                px, py = cx + np.cos(ang) * r * 0.7, cy + np.sin(ang) * r * 0.7
                d.ellipse([px - r / 2, py - r / 2, px + r / 2, py + r / 2], fill=pc, outline=colour())
            d.ellipse([cx - r / 4, cy - r / 4, cx + r / 4, cy + r / 4], fill=colour())
    elif kind == 2:  # dots and stripes
        for _ in range(int(RNG.integers(5, 40))):
            x, y, r = int(RNG.integers(0, w)), int(RNG.integers(0, h)), int(RNG.integers(1, 9))
            d.ellipse([x - r, y - r, x + r, y + r], fill=colour())
        for _ in range(int(RNG.integers(0, 6))):
            y = int(RNG.integers(0, h))
            d.line([(0, y), (w, y + int(RNG.integers(-40, 40)))], fill=colour(), width=int(RNG.integers(1, 6)))
    elif kind == 3:  # animal print
        for _ in range(int(RNG.integers(10, 40))):
            x, y = int(RNG.integers(0, w)), int(RNG.integers(0, h))
            rx, ry = int(RNG.integers(3, 14)), int(RNG.integers(3, 12))
            d.ellipse([x - rx, y - ry, x + rx, y + ry], outline=(20, 15, 10), width=int(RNG.integers(2, 5)))
    elif kind == 4:  # lettering
        for _ in range(int(RNG.integers(1, 4))):
            txt = "".join(RNG.choice(list("ABCDEFGHIJKLMNOPQRSTUVWXYZ♥ love nails 0123456789"), int(RNG.integers(3, 10))))
            size = int(RNG.integers(10, 40))
            try:
                f = ImageFont.load_default(size)
            except TypeError:
                f = ImageFont.load_default()
            d.text((int(RNG.integers(0, w // 2)), int(RNG.integers(0, h - 10))), txt, fill=colour(), font=f)
    else:  # geometric
        for _ in range(int(RNG.integers(2, 8))):
            pts = [(int(RNG.integers(0, w)), int(RNG.integers(0, h))) for _ in range(3)]
            d.polygon(pts, fill=colour() if RNG.random() < 0.6 else None, outline=colour())

    if RNG.random() < 0.5:  # glitter
        a = np.asarray(im).astype(np.int16)
        m = RNG.random((h, w)) < RNG.uniform(0.002, 0.03)
        a[m] = np.clip(a[m] + RNG.integers(60, 200), 0, 255)
        im = Image.fromarray(a.astype(np.uint8))
    if RNG.random() < 0.5:
        im = im.filter(ImageFilter.GaussianBlur(float(RNG.uniform(0.3, 1.2))))
    return im


def jpeg(im):
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=int(RNG.integers(55, 92)))
    return Image.open(io.BytesIO(buf.getvalue())).convert("RGB")


def teacher_x2(session, im):
    x = np.asarray(im).astype(np.float32) / 255
    xp = np.pad(x, ((PAD, PAD), (PAD, PAD), (0, 0)), mode="reflect")
    y = session.run(None, {"input": xp.transpose(2, 0, 1)[None]})[0][0].transpose(1, 2, 0)
    y = y[PAD * 4:-PAD * 4, PAD * 4:-PAD * 4]
    h, w = x.shape[:2]
    y = y.reshape(h * 2, 2, w * 2, 2, 3).mean((1, 3))
    return np.clip(np.round(y * 255), 0, 255).astype(np.uint8)


def main(teacher, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    images = photos() + [nail_art() for _ in range(320)]
    images = [jpeg(im) if RNG.random() < 0.3 else im for im in images]
    so = ort.SessionOptions()
    so.intra_op_num_threads = os.cpu_count()
    session = ort.InferenceSession(teacher, so)
    for i, im in enumerate(images):
        lr = np.asarray(im)
        hr = teacher_x2(session, im)
        np.savez(os.path.join(out_dir, f"{i:04d}.npz"), lr=lr, hr=hr)
        if i % 50 == 0:
            print(f"{i}/{len(images)}", flush=True)
    print(f"done: {len(images)} pairs")


if __name__ == "__main__":
    main(*sys.argv[1:3])
