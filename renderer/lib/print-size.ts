/**
 * Wall-printing size maths.
 *
 * Print shops think in centimetres, not pixels: "a 3.20 m wall at 300 DPI".
 * This converts that into the pixel width the upscaler must produce, and
 * flags jobs that are too heavy to run (or that would push the AI into
 * inventing detail).
 */

const CM_PER_INCH = 2.54;

/** Pixels needed to print `cm` centimetres at `dpi`. */
export function cmToPixels(cm: number, dpi: number): number {
  if (!cm || !dpi || cm <= 0 || dpi <= 0) return 0;
  return Math.round((cm / CM_PER_INCH) * dpi);
}

/** Physical centimetres that `px` pixels cover at `dpi`. */
export function pixelsToCm(px: number, dpi: number): number {
  if (!px || !dpi || dpi <= 0) return 0;
  return (px / dpi) * CM_PER_INCH;
}

/** Output pixels beyond which a job is "heavy" and 150 DPI is worth offering.
 *  ~400 MP ≈ 1.2 GB as flat 8-bit RGB, before the upscaler's own working set. */
const HEAVY_MEGAPIXELS = 400;

/** Above this upscale factor the model stops recovering detail and starts
 *  inventing it — worth warning about regardless of machine capacity. */
const MAX_SANE_FACTOR = 8;

/** Hard limit of the JPEG format on either dimension. */
const JPEG_MAX_DIMENSION = 65535;

export type PrintEstimate = {
  /** Output width in pixels. */
  widthPx: number;
  /** Output height in pixels (source aspect ratio preserved). */
  heightPx: number;
  /** Printed height in cm, derived from the source aspect ratio. */
  heightCm: number;
  /** Upscale factor required from the source. */
  factor: number;
  megapixels: number;
  /** Rough flat 8-bit RGB size of the result, in bytes. */
  estimatedBytes: number;
  /** Output is large enough that dropping to 150 DPI is worth offering. */
  isHeavy: boolean;
  /** Required factor is high enough that the model will hallucinate detail. */
  isOverStretched: boolean;
  /** Exceeds what the JPEG container can represent. */
  exceedsJpegLimit: boolean;
};

/**
 * Works out the output size for a target printed width.
 *
 * `sourceWidth`/`sourceHeight` are the source image's pixel dimensions; they
 * set the aspect ratio and the upscale factor. Returns null when the source
 * dimensions aren't known yet.
 */
export function estimatePrint(
  sourceWidth: number | null,
  sourceHeight: number | null,
  widthCm: number,
  dpi: number,
): PrintEstimate | null {
  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
    return null;
  }
  const widthPx = cmToPixels(widthCm, dpi);
  if (widthPx <= 0) return null;

  const ratio = sourceHeight / sourceWidth;
  const heightPx = Math.round(widthPx * ratio);
  const megapixels = (widthPx * heightPx) / 1e6;

  return {
    widthPx,
    heightPx,
    heightCm: widthCm * ratio,
    factor: widthPx / sourceWidth,
    megapixels,
    estimatedBytes: widthPx * heightPx * 3,
    isHeavy: megapixels > HEAVY_MEGAPIXELS,
    isOverStretched: widthPx / sourceWidth > MAX_SANE_FACTOR,
    exceedsJpegLimit:
      widthPx > JPEG_MAX_DIMENSION || heightPx > JPEG_MAX_DIMENSION,
  };
}

/** Human-readable byte size, e.g. "3,3 Go". */
export function formatSize(bytes: number): string {
  const units = ["o", "Ko", "Mo", "Go"];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 100 || i === 0 ? 0 : 1).replace(".", ",")} ${units[i]}`;
}
