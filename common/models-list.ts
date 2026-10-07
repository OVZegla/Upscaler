export const MODELS = {
  // 4xLSDIRCompactC3 by Philip Hofmann (Phhofm), CC BY 4.0 — SRVGGNet
  // "Compact" architecture. Measured as both more faithful and far faster
  // than the two models below; see NOTICE for the full attribution.
  "4xLSDIRCompactC3": {
    id: "4xLSDIRCompactC3",
  },
  "upscayl-lite-4x": {
    id: "upscayl-lite-4x",
  },
};

export type ModelId = keyof typeof MODELS;

/** Models that used to ship and no longer do. A stored preference naming one
 *  must be migrated, otherwise the backend is asked for a model file that is
 *  not on disk and the job fails with nothing useful on screen. */
export const RETIRED_MODEL_IDS = ["upscayl-standard-4x"];

export const DEFAULT_MODEL_ID = "4xLSDIRCompactC3";
