# Model benchmark

Why Symp's Upscale ships exactly one AI model, and how that was decided.

Everything here is reproducible: the scripts, the raw measurements and the
protocol are all in this directory. The test images are not — they are
third-party material fetched by `fetch_corpus.sh`.

## Protocol

The standard super-resolution round trip:

> ground truth → downscale 4x (Lanczos) → upscale 4x with the model →
> compare against the ground truth

PSNR and SSIM are computed on the Y (luma) channel with a 4-pixel border
crop, which is what published SR results use, so the figures are comparable
to the ones papers quote. A third figure, the **sharpness ratio**, is the
Laplacian variance of the result divided by that of the ground truth: 1.0
means the result carries as much fine structure as the original, above 1.0
means the model is adding contrast that was never there.

Timings are wall-clock on CPU (software Vulkan). Absolute numbers mean little
— a real GPU is far faster — but the ratios between models hold.

## Corpus

32 images in five categories:

| Category | Source |
| --- | --- |
| Visage (8) | Set5, Set14 |
| Nature & paysage (9) | Set5, Set14 |
| Bâtiment & architecture (10) | Urban100 |
| Texte (2) | Set14 (`ppt3`) + a synthetic panel, type from 56px down to 7px |
| Graphique & trait (3) | Set14 (`comic`) + a synthetic line chart and radial line art |

The three synthetic images exist because the standard sets contain almost no
text and no vector-style graphics, and those are exactly what a print shop
enlarges. Being synthetic, their ground truth is exact.

```sh
./benchmarks/fetch_corpus.sh      # Set5 / Set14 / Urban100
python3 benchmarks/make_synth.py  # text, chart, line art
python3 benchmarks/run.py         # main run     -> results.json
python3 benchmarks/sweep2.py      # resolution   -> results-sweep.json
python3 benchmarks/screen.py      # candidates   -> results-candidates.json
python3 benchmarks/analyse.py     # tables + charts
```

## What the measurements decided

### Two inherited models were retired

| Model | PSNR | SSIM | Best on | Time |
| --- | --- | --- | --- | --- |
| 4xLSDIRCompactC3 | **25.02** | **0.7452** | **20 / 32** | **1.7 s** |
| upscayl-lite-4x | 23.62 | 0.7365 | 12 / 32 | 2.8 s |
| upscayl-standard-4x | 23.79 | 0.7185 | **0 / 32** | 35.3 s |

`upscayl-standard-4x` was never the most faithful on a single image, and lost
to each of the other two on 26 of 30 in a paired comparison. A controlled
resolution sweep (the same picture at 256/512/1024/1280 px) agreed at every
one of twelve tiers, and showed the speed gap widening with size: 12x at
256 px, 26x at 1280 px — which is the regime wall-sized jobs run in.

`upscayl-lite-4x` was slower than the default on **32 of 32** images while
scoring lower overall, despite being twice the size. Its one category win
(smooth natural content) evaporates on inspection: plain Lanczos scores
higher still there. It was not restoring more, it was softening more.

Together they were ~33 MB of a 37 MB download. The Windows installer went
from 37 MB to about 7 MB.

### No replacement was worth adding

Eight candidates were screened on the 17 images where the default is weakest
(faces, smooth nature) — `results-candidates.json`:

| Model | SSIM (17 img) | Licence |
| --- | --- | --- |
| Lanczos (no AI) | 0.7491 | — |
| 4xLSDIR | 0.7463 | CC BY 4.0 claimed, **not confirmed at source** |
| RealESRGAN_General_x4_v3 | 0.7451 | BSD 3-Clause ✅ |
| **4xLSDIRCompactC3** (shipped) | 0.7417 | **CC BY 4.0 ✅** |
| uniscale_restore | 0.7336 | CC BY-NC — commercial use barred |
| 4xNomos8kSC | 0.7270 | CC BY 4.0 claimed, not confirmed |
| RealESRGAN_General_WDN_x4_v3 | 0.7264 | BSD 3-Clause ✅ |
| 4xLSDIRplusC | 0.7229 | CC BY 4.0 claimed, not confirmed |
| 4x_NMKD-Siax_200k | 0.7076 | WTFPL claimed |
| 4x_NMKD-Superscale-SP_178000_G | 0.6782 | WTFPL claimed |

The best candidate beats the shipped model by 0.005 on a deliberately
unfavourable subset, while being 33 MB instead of 1.2 and roughly 17x slower,
with a licence that could not be confirmed at the author's own source.

## A caveat that matters more than any of the numbers

**On smooth content, SSIM and PSNR are poor judges, and they disagree with
the eye.**

Both metrics compare pixel to pixel. A model that recreates plausible grass —
but not *those* blades — is penalised. Interpolation invents nothing, so it is
never wrong; it is merely blurry. Blurry-and-never-wrong scores better than
sharp-and-nearly-right.

On the zebra image the metric gives Lanczos 0.714 against the shipped model's
0.638, a wide margin. Looked at side by side, the Lanczos result is mush:
the stripes blur together and the grass is a flat green field. Nobody would
choose it to print on a wall. Run `visuals.py` and `vis_cand.py` to generate
the 1:1 crops and judge for yourself.

So the metrics were trusted where they agree with inspection — text,
graphics, architecture, where the differences are large and visible — and
treated as unreliable on smooth natural content, where the decision was made
by looking.

## Provenance, settled by checksum

Both retired models turned out to be official Real-ESRGAN weights that
Upscayl had renamed without shipping a licence for them:

```
upscayl-standard-4x  md5 b37a46b08c1997a5652e7373926ca3cf  == realesrgan-x4plus
upscayl-lite-4x      md5 c293d2d74943652274dbcee2b80ff78a  == realesr-general-x4v3
```

verified against `xinntao/Real-ESRGAN-ncnn-vulkan` release v0.2.0. Both are
BSD 3-Clause, © 2021 Xintao Wang. See `NOTICE`.

## Gotchas, if you reproduce this

- `upscayl-bin` requires the model directory to be **named** `models`. Point
  `-m` at any other directory and every run fails with exit code 255 and
  "Unknown model dir type".
- Run the timings with nothing else competing for the CPU.
- `python3 -I` drops the script's directory from `sys.path`, so the modules
  here re-add it explicitly.
