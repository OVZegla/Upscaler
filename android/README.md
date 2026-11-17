# Symp's Upscale for Android (nail-printing machines)

A separate, deliberately minimal build for the Android board of an automatic
nail-art machine. One screen: choose an image, press **Upscale ×2**, compare
before and after with a slider, save. No scale to choose, no zoom, no
settings, and no network: everything runs on the device.

## How it works

- **Same model as the desktop app.** `tools/ncnn_to_onnx.py` reads the exact
  weights the desktop app ships (`resources/models/4xLSDIRCompactC3.*`, ncnn
  format) and writes them, unchanged, as an ONNX graph of the same
  architecture: `app/src/main/assets/upscale.onnx`. It refuses any layer it
  does not expect and checks that every byte of weights was used.
- **ONNX Runtime** runs it on the CPU, so it works on boards with no usable
  GPU driver.
- **×2 from a ×4 model.** Each tile is enlarged ×4 and every 2×2 block is
  averaged into one pixel.
- **Tiles without seams.** 128-pixel tiles read with an 18-pixel margin, the
  reach of the model's 18 stacked 3×3 convolutions, so a tile sees exactly
  what it would inside the whole image. Image edges are mirrored, as the
  desktop engine does.

`core/` holds all of that with no Android dependency, and its tests run the
real model on a plain JVM against an image produced by the **desktop engine
itself** (ncnn, ×4, averaged to ×2): 54.9 dB PSNR, where a plain bicubic
enlargement scores 30.7 against the same reference. They also check that the
tiled result matches the untiled one to within one level, among others.

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
