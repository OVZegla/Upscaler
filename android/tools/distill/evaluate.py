"""Measures what the fast model gives up, and what it gains.

Two questions, answered on images none of the models was trained on (the
standard Set5 and Set14 super-resolution sets, fetched for measuring only):

  Quality: each image is halved (Lanczos), enlarged x2 again, and compared
  with the original, as PSNR on luma with a 2-pixel border left out, the way
  published super-resolution results are measured. A plain bicubic
  enlargement and the shipped model are measured the same way.

  Speed: time to enlarge one 512 x 512 input, model alone, on this machine's
  CPU, with each model padded as the app pads it (its receptive radius). The
  ratio between models is what carries over to a tablet's processor; the
  absolute times do not.

Usage: python3 evaluate.py <eval_dir> <teacher.onnx> <student.onnx>...
"""
import glob
import os
import sys
import time

import numpy as np
import onnxruntime as ort
from PIL import Image


def luma(a):
    return 16 + (65.481 * a[..., 0] + 128.553 * a[..., 1] + 24.966 * a[..., 2]) / 255


def psnr_y(a, b, border=2):
    ya, yb = luma(a.astype(np.float64)), luma(b.astype(np.float64))
    d = (ya - yb)[border:-border, border:-border]
    return 10 * np.log10(255 ** 2 / np.mean(d ** 2))


def session(path):
    so = ort.SessionOptions()
    so.intra_op_num_threads = os.cpu_count()
    s = ort.InferenceSession(path, so)
    meta = s.get_modelmeta().custom_metadata_map
    scale = int(meta.get("scale", 4))
    pad = int(meta.get("receptive_radius", 18))
    return s, scale, pad


def run(model, lr):
    s, scale, pad = model
    x = lr.astype(np.float32) / 255
    xp = np.pad(x, ((pad, pad), (pad, pad), (0, 0)), mode="reflect")
    y = s.run(None, {"input": xp.transpose(2, 0, 1)[None]})[0][0].transpose(1, 2, 0)
    y = y[pad * scale:-pad * scale, pad * scale:-pad * scale]
    if scale == 4:
        h, w = x.shape[:2]
        y = y.reshape(h * 2, 2, w * 2, 2, 3).mean((1, 3))
    return np.clip(np.round(y * 255), 0, 255)


def main(eval_dir, *models):
    names = ["actuel"] + [os.path.basename(m).replace(".onnx", "") for m in models[1:]]
    loaded = [session(m) for m in models]
    scores = {n: [] for n in ["bicubique"] + names}
    vs_teacher = {n: [] for n in names[1:]}
    for f in sorted(glob.glob(os.path.join(eval_dir, "*.png"))):
        gt = Image.open(f).convert("RGB")
        gt = gt.crop((0, 0, gt.width // 2 * 2, gt.height // 2 * 2))
        lr = gt.resize((gt.width // 2, gt.height // 2), Image.LANCZOS)
        g = np.asarray(gt)
        scores["bicubique"].append(psnr_y(np.asarray(lr.resize(gt.size, Image.BICUBIC)), g))
        outs = [run(m, np.asarray(lr)) for m in loaded]
        for n, o in zip(names, outs):
            scores[n].append(psnr_y(o, g))
        for n, o in zip(names[1:], outs[1:]):
            mse = np.mean((o - outs[0]) ** 2)
            vs_teacher[n].append(10 * np.log10(255 ** 2 / mse))

    probe = np.asarray(Image.open(sorted(glob.glob(os.path.join(eval_dir, "*.png")))[0])
                       .convert("RGB").resize((512, 512)))
    times = {}
    for n, m in zip(names, loaded):
        run(m, probe)
        t = time.perf_counter()
        for _ in range(3):
            run(m, probe)
        times[n] = (time.perf_counter() - t) / 3

    print(f"{'':28s}{'PSNR-Y vs original':>20s}{'vs actuel':>12s}{'512px':>9s}{'vitesse':>9s}")
    print(f"{'bicubique':28s}{np.mean(scores['bicubique']):17.2f} dB")
    for n in names:
        vt = f"{np.mean(vs_teacher[n]):9.2f} dB" if n in vs_teacher else " " * 12
        print(f"{n:28s}{np.mean(scores[n]):17.2f} dB{vt}{times[n]:8.2f}s{times[names[0]] / times[n]:8.1f}x")


if __name__ == "__main__":
    main(*sys.argv[1:])
