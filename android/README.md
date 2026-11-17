# Symp's Upscale for Android (nail-printing machines)

A separate, deliberately minimal build for the Android board of an automatic
nail-art machine. One screen: choose an image, press **Upscale ×2**, compare
before and after with a slider (pinch to zoom, double tap to zoom in or out),
save. No scale to choose, no settings, and no network: everything runs on the
device.

## How it works

- **A small, fast model trained to imitate the desktop one.** The desktop
  model (4xLSDIRCompactC3: 18 convolutions of 64 channels, x4) proved too
  slow on a machine's processor. The app ships a student of it instead:
  6 convolutions of 32 channels that enlarge x2 directly, trained to
  reproduce what the desktop model produces (`tools/distill/`).
- **ONNX Runtime** runs it on the CPU, so it works on boards with no usable
  GPU driver.
- **Tiles without seams.** 256-pixel tiles read with a margin as wide as the
  model's reach (6 pixels for the shipped model, 18 for the desktop one), so
  a tile sees exactly what it would inside the whole image. Image edges are
  mirrored, as the desktop engine does.

### What the speed costs

Measured on Set5 and Set14 (images halved, enlarged x2, compared with the
original; `tools/distill/evaluate.py`), against the desktop model run the
way the first version of this app ran it:

| | speed | fine detail kept (1.0 = original) | PSNR-Y |
|---|---|---|---|
| bicubic | | 0.16 | 31.58 dB |
| desktop model | 1x | 0.96 | 31.56 dB |
| **shipped model** | **~9x** (model alone; ~12x against the first version's 128-pixel tiles) | **0.42** | 32.41 dB |
| larger student (32 ch, 8 conv) | ~7x | 0.44 | 32.51 dB |

The shipped model is clearly sharper than a plain enlargement and softer
than the desktop model. PSNR alone would rank it above the desktop model,
which is why it is not the measure used to choose: it rewards caution, and
the desktop model's sharper edges score as error wherever they differ from
the original by a pixel. The larger student gained too little detail for its
cost to be kept.

### Reproducing the model

```
python3 tools/ncnn_to_onnx.py ../resources/models/4xLSDIRCompactC3.param \
    ../resources/models/4xLSDIRCompactC3.bin models/desktop-4xLSDIRCompactC3.onnx
python3 tools/distill/make_dataset.py models/desktop-4xLSDIRCompactC3.onnx data/
python3 tools/distill/train.py data/ 32 4 5000 app/src/main/assets/upscale.onnx
```

Training images are only ones whose rights stand in nobody's way: the
scikit-image sample photos marked public domain or CC0, and several hundred
nail-art-like images drawn by `make_dataset.py`. The evaluation sets are
fetched for measuring and never trained on.

`core/` holds the upscaling with no Android dependency, and its tests run
the real models on a plain JVM against an image produced by the **desktop
engine itself** (ncnn, x4, averaged to x2). The converted desktop model
reproduces it at 54.8 dB. The shipped model scores 32.4 dB against it,
where bilinear scores 29.7, and runs about 10x faster in the same pipeline.

## Building

```
cd android
gradle :core:test               # no Android SDK needed
gradle :app:assembleRelease     # needs ANDROID_HOME or local.properties
```

CI (`.github/workflows/build-android.yml`) does both and publishes the APK as
the `symps-upscale-android` artifact.

## Installing on a machine

The APK is meant to be sideloaded: copy it to the device and open it
(allow "install unknown apps" for the file manager when asked).

It is signed with the CI runner's debug key, which changes from one build to
the next. Installing a newer build over an older one is therefore refused:
uninstall the app first. A fixed release key, kept as a repository secret,
would remove that step; it has not been set up.

## Limits

- Android 5.0 or later, ARM (arm64-v8a, armeabi-v7a).
- Inputs up to 2048 × 2048 pixels. Larger images are refused with a message:
  they are already large enough to print, and the result would not fit in the
  memory such boards give an app.
- Results are saved as PNG in *Pictures › Symp's Upscale*.
