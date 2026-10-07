"""Screens candidate models on the categories where the current default is
weakest: smooth natural content and faces, where plain Lanczos still matches
or beats it. Same 4x round-trip protocol as the main benchmark."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import run as R  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
# The binary refuses any model directory not literally named "models", so the
# candidates live one level down. Populate it from upscayl/custom-models.
CAND_DIR = os.path.join(HERE, "candroot", "models")

# The weak ground: every Nature & paysage and Visage image from the main run.
IMAGES = [n for n, c in R.CATEGORY.items()
          if c in ("Nature & paysage", "Visage")]

CANDIDATES = [
    "RealESRGAN_General_x4_v3",
    "RealESRGAN_General_WDN_x4_v3",
    "4xNomos8kSC",
    "4xLSDIR",
    "4xLSDIRplusC",
    "uniscale_restore",
    "4x_NMKD-Siax_200k",
    "4x_NMKD-Superscale-SP_178000_G",
]

# The incumbent, run from the repo as usual, for a like-for-like comparison.
INCUMBENT = "4xLSDIRCompactC3"


def run_one(model, models_dir, src, dst):
    import subprocess
    import time
    t = time.time()
    r = subprocess.run([R.BIN, "-i", src, "-o", dst, "-m", models_dir,
                        "-n", model, "-s", "4", "-f", "png"],
                       capture_output=True)
    return time.time() - t, r.returncode


def main():
    from PIL import Image
    os.makedirs(R.WORK, exist_ok=True)
    out_path = os.path.join(HERE, "results-candidates.json")
    results = []

    for i, name in enumerate(sorted(IMAGES), 1):
        gt_path = os.path.join(R.GT, f"{name}.png")
        if not os.path.exists(gt_path):
            continue
        prep = R.prepare(name, gt_path)
        if prep is None:
            continue
        gp, sp, (w, h) = prep
        gt_img = Image.open(gp)
        cat = R.CATEGORY[name]

        base = gt_img.resize((w // 4, h // 4), Image.LANCZOS) \
                     .resize((w, h), Image.LANCZOS)
        results.append(dict(image=name, category=cat, model="Lanczos",
                            seconds=0.0, **R.compare(gt_img, base)))

        jobs = [(INCUMBENT, R.MODELS_DIR)] + \
               [(m, CAND_DIR) for m in CANDIDATES]
        for model, mdir in jobs:
            dst = os.path.join(R.WORK, f"{name}__{model}.png")
            secs, rc = run_one(model, mdir, sp, dst)
            if rc != 0 or not os.path.exists(dst):
                print(f"  !! {name} {model} rc={rc}", flush=True)
                continue
            results.append(dict(image=name, category=cat, model=model,
                                seconds=secs,
                                **R.compare(gt_img, Image.open(dst))))
            os.remove(dst)
        os.remove(gp)
        os.remove(sp)
        json.dump(results, open(out_path, "w"), indent=1)
        print(f"[{i}/{len(IMAGES)}] {name}", flush=True)

    print("DONE", len(results), flush=True)


if __name__ == "__main__":
    main()
