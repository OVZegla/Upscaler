export const MODELS = {
  // 4xLSDIRCompactC3 by Philip Hofmann (Phhofm), CC BY 4.0 — SRVGGNet
  // "Compact" architecture. Measured as both more faithful and far faster
  // than the two models below; see NOTICE for the full attribution.
  "4xLSDIRCompactC3": {
    id: "4xLSDIRCompactC3",
  },
  "upscayl-standard-4x": {
    id: "upscayl-standard-4x",
  },
  "upscayl-lite-4x": {
    id: "upscayl-lite-4x",
  },
};

export type ModelId = keyof typeof MODELS;
