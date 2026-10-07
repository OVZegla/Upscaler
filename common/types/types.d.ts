import { ImageFormat } from "@electron/types/types";

export type ImageUpscaylPayload = {
  imagePath: string;
  outputPath: string;
  scale: string;
  model: string;
  gpuId: string;
  saveImageAs: ImageFormat;
  overwrite: boolean;
  compression: string;
  noImageProcessing: boolean;
  customWidth: string;
  useCustomWidth: boolean;
  tileSize: number;
  ttaMode: boolean;
  copyMetadata: boolean;
  /** Output resolution in DPI, written into the saved file's metadata so
   *  Photoshop/the RIP opens it at the intended physical size. Null keeps
   *  the file's default (no density written). */
  outputDpi: number | null;
  /** Number of vertical strips ("lés") the finished image is cut into for
   *  hanging. Null or 1 means no cutting. */
  stripCount: number | null;
  /** Material shared between two adjacent strips, in centimetres. */
  stripOverlapCm: number | null;
};

export type DoubleUpscaylPayload = {
  model: string;
  /**
   * The path to the image to upscale.
   */
  imagePath: string;
  outputPath: string;
  scale: string;
  gpuId: string;
  saveImageAs: ImageFormat;
  compression: string;
  noImageProcessing: boolean;
  customWidth: string;
  useCustomWidth: boolean;
  tileSize: number;
  ttaMode: boolean;
  copyMetadata: boolean;
  /** Output resolution in DPI, written into the saved file's metadata so
   *  Photoshop/the RIP opens it at the intended physical size. Null keeps
   *  the file's default (no density written). */
  outputDpi: number | null;
  /** Number of vertical strips ("lés") the finished image is cut into for
   *  hanging. Null or 1 means no cutting. */
  stripCount: number | null;
  /** Material shared between two adjacent strips, in centimetres. */
  stripOverlapCm: number | null;
};

export type BatchUpscaylPayload = {
  batchFolderPath: string;
  outputPath: string;
  model: string;
  gpuId: string;
  saveImageAs: ImageFormat;
  scale: string;
  compression: string;
  noImageProcessing: boolean;
  customWidth: string;
  useCustomWidth: boolean;
  tileSize: number;
  ttaMode: boolean;
  copyMetadata: boolean;
  /** Output resolution in DPI, written into the saved file's metadata so
   *  Photoshop/the RIP opens it at the intended physical size. Null keeps
   *  the file's default (no density written). */
  outputDpi: number | null;
};
