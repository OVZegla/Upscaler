"""1:1 crops on the smooth content where the metrics say plain interpolation
wins. The metrics punish invented detail, so this is the check that matters."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run as R
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
CAND = os.path.join(HERE, "candroot", "models")
FONTS = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "renderer/fonts/poppins")
W = os.path.join(HERE, "vis2"); os.makedirs(W, exist_ok=True)

PANELS = [("Original", None, None), ("Lanczos", None, None),
          ("Notre modèle", "4xLSDIRCompactC3", R.MODELS_DIR),
          ("4xLSDIR", "4xLSDIR", CAND),
          ("RealESRGAN gen v3", "RealESRGAN_General_x4_v3", CAND)]

CASES = [("set14_014", (120, 60, 420, 230), "Zèbre — rayures fines et herbe"),
         ("set14_004", (60, 40, 300, 180), "Eau et bateau — surface lisse"),
         ("set5_001", (120, 120, 400, 280), "Visage de bébé — peau et cheveux")]

def f(n, s): return ImageFont.truetype(os.path.join(FONTS, n), s)

for name, box, cap in CASES:
    im = Image.open(os.path.join(R.GT, f"{name}.png")).convert("RGB")
    w, h = im.width - im.width % 4, im.height - im.height % 4
    im = im.crop((0, 0, w, h))
    src = os.path.join(W, f"{name}__in.png")
    im.resize((w//4, h//4), Image.LANCZOS).save(src)
    imgs = []
    for label, model, mdir in PANELS:
        if model is None:
            imgs.append((label, im if label == "Original"
                         else im.resize((w//4, h//4), Image.LANCZOS).resize((w, h), Image.LANCZOS)))
            continue
        dst = os.path.join(W, f"{name}__{model}.png")
        if not os.path.exists(dst):
            subprocess.run([R.BIN, "-i", src, "-o", dst, "-m", mdir, "-n", model,
                            "-s", "4", "-f", "png"], capture_output=True)
        if os.path.exists(dst):
            imgs.append((label, Image.open(dst).convert("RGB")))
    x0, y0, x1, y1 = box; x1, y1 = min(x1, w), min(y1, h)
    cw, ch = x1-x0, y1-y0
    canvas = Image.new("RGB", (8 + len(imgs)*(cw+8), 34+26+ch+8), "white")
    d = ImageDraw.Draw(canvas)
    d.text((8, 8), cap, font=f("Poppins-Bold.ttf", 16), fill=(16,16,20))
    for i, (label, img) in enumerate(imgs):
        x = 8 + i*(cw+8)
        canvas.paste(img.crop((x0,y0,x1,y1)), (x, 60))
        d.text((x+2, 38), label, font=f("Poppins-Medium.ttf", 13),
               fill=(0,85,164) if label=="Notre modèle" else (16,16,20))
        d.rectangle([x,60,x+cw-1,60+ch-1], outline=(205,207,214))
    canvas.save(os.path.join(HERE, f"visuel-cand-{name}.png"))
    print("wrote", name, canvas.size)
