/**
 * Cross-backend image URL helpers.
 *
 * Electron registers custom `file://` and `public://` protocols; Tauri does
 * not, so under Tauri we use the asset protocol (`convertFileSrc`) for user
 * files and plain root-relative URLs for bundled frontend assets.
 */

import { sanitizePath } from "@common/sanitize-path";
import { isTauri } from "./tauri-electron-shim";

/** URL for a user's image on disk (input/output). Pass the RAW path. */
export function userFileUrl(rawPath: string): string {
  if (!rawPath) return "";
  if (isTauri()) {
    return (window as any).__TAURI__.core.convertFileSrc(rawPath);
  }
  return "file:///" + sanitizePath(rawPath);
}

/** URL for a bundled frontend asset (e.g. "logo.png"). */
export function publicAssetUrl(relPath: string): string {
  const clean = relPath.replace(/^\/+/, "");
  if (isTauri()) return "/" + clean;
  return "public:///" + clean;
}
