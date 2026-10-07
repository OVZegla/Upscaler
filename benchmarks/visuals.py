"""Regenerates a handful of outputs and lays them out as 1:1 crops, so the
numbers can be checked by eye."""
import os
import subprocess

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
GT = os.path.join(HERE, "gt")
WORK = os.path.join(HERE, "vis")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIN = os.path.join(REPO, "resources/linux/bin/upscayl-bin")
MODELS_DIR = os.path.join(REPO, "resources/models")
FONTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "renderer/fonts/poppins")
SCALE = 4

MODELS = [("4xLSDIRCompactC3", "Précision"),
          ("upscayl-standard-4x", "Classique"),
          ("upscayl-lite-4x", "Léger")]

# name, crop box on the ground truth, caption
CASES = [
    ("synth_texte", (20, 150, 420, 300), "Texte — corps 14 à 7 px"),
    ("synth_graphique", (430, 90, 830, 240), "Graphique — courbes fines et repères"),
    ("urban_006", (300, 240, 700, 390), "Bâtiment — motif répété"),
    ("set14_009", (150, 150, 430, 255), "Visage — peau et contours doux"),
    ("set14_013", (40, 300, 440, 450), "Texte imprimé — couverture"),
]


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def build(name, box, caption):
    os.makedirs(WORK, exist_ok=True)
    im = Image.open(os.path.join(GT, f"{name}.png")).convert("RGB")
    w, h = im.width - im.width % SCALE, im.height - im.height % SCALE
    im = im.crop((0, 0, w, h))
    src = os.path.join(WORK, f"{name}__in.png")
    im.resize((w // SCALE, h // SCALE), Image.LANCZOS).save(src)

    panels = [("Original", im)]
    lanc = im.resize((w // SCALE, h // SCALE), Image.LANCZOS) \
             .resize((w, h), Image.LANCZOS)
    panels.append(("Lanczos", lanc))
    for model, label in MODELS:
        dst = os.path.join(WORK, f"{name}__{model}.png")
        if not os.path.exists(dst):
            subprocess.run([BIN, "-i", src, "-o", dst, "-m", MODELS_DIR,
                            "-n", model, "-s", str(SCALE), "-f", "png"],
                           capture_output=True)
        if os.path.exists(dst):
            panels.append((label, Image.open(dst).convert("RGB")))

    x0, y0, x1, y1 = box
    x1, y1 = min(x1, w), min(y1, h)
    cw, ch = x1 - x0, y1 - y0
    LBL, PAD = 26, 8
    W = PAD + len(panels) * (cw + PAD)
    H = 34 + LBL + ch + PAD
    canvas = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(canvas)
    d.text((PAD, 8), caption, font=font("Poppins-Bold.ttf", 16),
           fill=(16, 16, 20))
    f = font("Poppins-Medium.ttf", 13)
    for i, (label, img) in enumerate(panels):
        crop = img.crop((x0, y0, x1, y1))
        x = PAD + i * (cw + PAD)
        canvas.paste(crop, (x, 34 + LBL))
        col = (0, 85, 164) if label == "Précision" else (16, 16, 20)
        d.text((x + 2, 34 + 4), label, font=f, fill=col)
        d.rectangle([x, 34 + LBL, x + cw - 1, 34 + LBL + ch - 1],
                    outline=(205, 207, 214))
    out = os.path.join(HERE, f"visuel-{name}.png")
    canvas.save(out)
    print("wrote", out, canvas.size)


for name, box, caption in CASES:
    build(name, box, caption)
