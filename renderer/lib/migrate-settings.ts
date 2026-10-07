/**
 * Settings migrations that must happen before anything reads them.
 *
 * These run against localStorage directly, at module load, rather than from a
 * React effect. `atomWithStorage` does not read storage synchronously: on the
 * first render an atom holds its default, and the stored value arrives
 * afterwards. A migration written as an effect therefore inspected the
 * default, found nothing to do, and was then overwritten by the stored value
 * it was supposed to replace — which is exactly how an install kept asking
 * for a model that no longer ships.
 */

import { DEFAULT_MODEL_ID, RETIRED_MODEL_IDS } from "@common/models-list";

const MODEL_KEY = "selectedModelId";

/** Reads a jotai-stored value, which is JSON-encoded. */
function readStored(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode, blocked storage — nothing to do but carry on */
  }
}

export function migrateSettings() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return;
  }

  // A preference naming a model we no longer ship sends the backend after a
  // file that is not on disk. Only ids we actually retired are reset: an
  // unrecognised id may be one of the user's own custom models.
  const model = readStored(MODEL_KEY);
  if (typeof model === "string" && RETIRED_MODEL_IDS.includes(model)) {
    writeStored(MODEL_KEY, DEFAULT_MODEL_ID);
  }
}
