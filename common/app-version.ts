/**
 * Single source of truth for the version shown in the interface.
 *
 * It used to be written out in several places, and they drifted: the packaged
 * bundle still announced 1.1.0 to Windows long after the app called itself
 * 1.5. Anything user-facing reads it from here; the manifests (package.json,
 * Cargo.toml, tauri.conf.json) must be kept in step with it.
 */

/** Full version, as the manifests carry it. */
export const APP_VERSION = "2.0.0";

/** Short form for display — "2.0" reads better than "2.0.0" on a splash. */
export const APP_VERSION_SHORT = "2.0";
