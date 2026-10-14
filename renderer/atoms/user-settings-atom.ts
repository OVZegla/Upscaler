import { ImageFormat } from "@/lib/valid-formats";
import {
  DEFAULT_MODEL_ID,
  ModelId,
  RETIRED_MODEL_IDS,
} from "@common/models-list";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const customModelsPathAtom = atomWithStorage<string | null>(
  "customModelsPath",
  null,
);

/** Default for new installs. 4xLSDIRCompactC3 measured both more faithful
 *  and markedly faster than the models it replaced. */
export const selectedModelIdAtom = atomWithStorage<ModelId | string>(
  "selectedModelId",
  DEFAULT_MODEL_ID,
);

/**
 * Migrates a stored choice naming a model that no longer ships.
 *
 * Without this, an install that had picked a retired model keeps asking the
 * backend for a file that is not on disk: the run fails with nothing useful
 * on screen, and the setting looks fine. Only ids we actually retired are
 * reset — an unknown id may well be one of the user's own custom models.
 */
export const migrateRetiredModelAtom = atom(null, (get, set) => {
  if (RETIRED_MODEL_IDS.includes(get(selectedModelIdAtom) as string)) {
    set(selectedModelIdAtom, DEFAULT_MODEL_ID);
  }
});
export const doubleUpscaylAtom = atomWithStorage("doubleUpscayl", false);
export const gpuIdAtom = atomWithStorage("gpuId", "");
export const saveImageAsAtom = atomWithStorage<ImageFormat>(
  "saveImageAs",
  "png",
);

export const scaleAtom = atomWithStorage<string>("scale", "4");

export const batchModeAtom = atom<boolean>(false);

/**
 * The path to the last folder the user saved an image to.
 * Reset to "" if rememberOutputFolder is false.
 */
export const savedOutputPathAtom = atomWithStorage<string | null>(
  "savedOutputPath",
  null,
);

export const progressAtom = atom<string>("");

/** Which pass of a chained upscale is running, so progress can be shown
 *  across the whole job instead of restarting at 0% on each pass. */
export type UpscalePass = { current: number; total: number } | null;
export const upscalePassAtom = atom(null as UpscalePass);

export const rememberOutputFolderAtom = atomWithStorage<boolean>(
  "rememberOutputFolder",
  false,
);

export const dontShowCloudModalAtom = atomWithStorage<boolean>(
  "dontShowCloudModal",
  false,
);

export const noImageProcessingAtom = atomWithStorage<boolean>(
  "noImageProcessing",
  false,
);

export const compressionAtom = atomWithStorage<number>("compression", 0);

export const overwriteAtom = atomWithStorage("overwrite", false);

export const turnOffNotificationsAtom = atomWithStorage(
  "turnOffNotifications",
  false,
);

export const ttaModeAtom = atomWithStorage("ttaMode", false);

export const viewTypeAtom = atomWithStorage<"slider" | "lens">(
  "viewType",
  "slider",
);

export const lensSizeAtom = atomWithStorage<number>("lensSize", 100);

export const customWidthAtom = atomWithStorage<number>("customWidth", 0);

export const useCustomWidthAtom = atomWithStorage<boolean>(
  "useCustomWidth",
  false,
);

export const tileSizeAtom = atomWithStorage<number | null>("tileSize", null);

// ── Print sizing (wall printing) ──────────────────────────────────────
// Lets the user think in centimetres instead of pixels: target physical
// width + output DPI drive the pixel width handed to the upscaler.
export const usePrintSizeAtom = atomWithStorage<boolean>(
  "usePrintSize",
  false,
);

/** Target printed width, in centimetres. */
export const printWidthCmAtom = atomWithStorage<number>("printWidthCm", 320);

/** Output resolution. 300 is the house standard; 150 is the fallback for
 *  jobs that would otherwise be too heavy (still re-scalable afterwards). */
export const printDpiAtom = atomWithStorage<number>("printDpi", 300);

// ── Découpe en bandes (lés) ───────────────────────────────────────────
// A roll printer has no width limit, but a wall is still hung in strips.
// The app cuts the finished file so nobody has to do it in Photoshop.
export const cutStripsAtom = atomWithStorage<boolean>("cutStrips", false);

/** How many vertical strips the finished image is split into. */
export const stripCountAtom = atomWithStorage<number>("stripCount", 3);

/** Material shared between two adjacent strips, in centimetres. */
export const stripOverlapCmAtom = atomWithStorage<number>("stripOverlapCm", 2);

/** Folder the last job's strips were written to, so the UI can offer to
 *  open it. Null until a cut job finishes. */
export const stripResultAtom = atom(
  null as { folder: string; count: number } | null,
);

// CLIENT SIDE ONLY
export const showSidebarAtom = atomWithStorage("showSidebar", true);

export const autoUpdateAtom = atomWithStorage("autoUpdate", true);

export const enableContributionAtom = atomWithStorage(
  "enableContribution",
  true,
);

export const userStatsAtom = atomWithStorage("userStats", {
  totalUpscayls: 0,
  doubleUpscayls: 0,
  batchUpscayls: 0,
  imageUpscayls: 0,
  averageUpscaylTime: 0,
  lastUpscaylDuration: 0,
  lastUsedAt: 0,
});

export const copyMetadataAtom = atomWithStorage<boolean>(
  "copyMetadata",
  false,
);

// ── Preview view state ────────────────────────────────────────────────
// Shared so the "avant" and "après" panes zoom and pan together: comparing
// two images that move independently tells you nothing.

/** Preview zoom. "fit" letterboxes; a number is a percentage. */
export const zoomAtom = atomWithStorage<number | "fit">("previewZoom", "fit");

/** Pan offset in screen pixels, reset whenever a new image is loaded. */
export const panAtom = atom({ x: 0, y: 0 });

/** Theme, remembered between launches — it used to reset to light on every
 *  start, which made choosing it pointless. */
export const themeAtom = atomWithStorage<"light" | "dark">("theme", "light");

/** Human-readable time remaining for the running job, or null when it cannot
 *  yet be estimated honestly. */
export const etaTextAtom = atom(null as string | null);

/** Which settings section the left rail is showing. "upscale" and "print" are
 *  the two sizing modes; "strips" is an add-on that applies on top of either. */
export type PanelSection = "upscale" | "print" | "strips";
export const panelSectionAtom = atom("upscale" as PanelSection);

/** Opens the factor slider past 16x, up to the chain's full 256x reach.
 *  Off by default: those factors are an escape hatch for line art, not a
 *  setting anyone should land on by dragging too far. */
export const allowHugeFactorsAtom = atomWithStorage<boolean>(
  "allowHugeFactors",
  false,
);
