/**
 * Compatibility shim: recreates the Electron `window.electron` API on top of
 * Tauri's `invoke`/`event` system, so the renderer keeps working unchanged
 * when the app is packaged with Tauri instead of Electron.
 *
 * Active only when running inside Tauri (`window.__TAURI__` present) and when
 * a real Electron preload has NOT already populated `window.electron`.
 */

import { ELECTRON_COMMANDS } from "@common/electron-commands";

type AnyFn = (...args: any[]) => any;

// Electron command string -> Tauri command name (for send/invoke)
const COMMAND_TO_TAURI: Record<string, string> = {
  [ELECTRON_COMMANDS.UPSCAYL]: "upscale_image",
  [ELECTRON_COMMANDS.DOUBLE_UPSCAYL]: "double_upscale_image",
  [ELECTRON_COMMANDS.FOLDER_UPSCAYL]: "batch_upscale_image",
  [ELECTRON_COMMANDS.STOP]: "stop_upscale",
  [ELECTRON_COMMANDS.OPEN_FOLDER]: "open_folder",
  [ELECTRON_COMMANDS.GET_MODELS_LIST]: "get_custom_models_list",
  [ELECTRON_COMMANDS.PASTE_IMAGE]: "paste_image",
  [ELECTRON_COMMANDS.SELECT_FILE]: "select_file",
  [ELECTRON_COMMANDS.SELECT_FOLDER]: "select_folder",
  [ELECTRON_COMMANDS.SELECT_CUSTOM_MODEL_FOLDER]: "select_custom_models_folder",
  "get-gpu-info": "get_gpu_info",
  "get-app-version": "get_app_version",
};

// Commands whose single argument is forwarded as a bare string/object `payload`.
const PAYLOAD_COMMANDS = new Set<string>([
  ELECTRON_COMMANDS.UPSCAYL,
  ELECTRON_COMMANDS.DOUBLE_UPSCAYL,
  ELECTRON_COMMANDS.FOLDER_UPSCAYL,
  ELECTRON_COMMANDS.OPEN_FOLDER,
  ELECTRON_COMMANDS.GET_MODELS_LIST,
  ELECTRON_COMMANDS.PASTE_IMAGE,
]);

// Electron command string -> Tauri event slug (for on/off). Must match
// src-tauri/src/events.rs.
const COMMAND_TO_EVENT: Record<string, string> = {
  [ELECTRON_COMMANDS.UPSCAYL_PROGRESS]: "upscayl-progress",
  [ELECTRON_COMMANDS.UPSCAYL_DONE]: "upscayl-done",
  [ELECTRON_COMMANDS.UPSCAYL_ERROR]: "upscayl-error",
  [ELECTRON_COMMANDS.UPSCAYL_WARNING]: "upscayl-warning",
  [ELECTRON_COMMANDS.DOUBLE_UPSCAYL_PROGRESS]: "double-upscayl-progress",
  [ELECTRON_COMMANDS.DOUBLE_UPSCAYL_DONE]: "double-upscayl-done",
  [ELECTRON_COMMANDS.FOLDER_UPSCAYL_PROGRESS]: "folder-upscayl-progress",
  [ELECTRON_COMMANDS.FOLDER_UPSCAYL_DONE]: "folder-upscayl-done",
  [ELECTRON_COMMANDS.SCALING_AND_CONVERTING]: "scaling-and-converting",
  [ELECTRON_COMMANDS.CUSTOM_MODEL_FILES_LIST]: "custom-model-files-list",
  [ELECTRON_COMMANDS.METADATA_ERROR]: "metadata-error",
  [ELECTRON_COMMANDS.PASTE_IMAGE_SAVE_SUCCESS]: "paste-image-save-success",
  [ELECTRON_COMMANDS.PASTE_IMAGE_SAVE_ERROR]: "paste-image-save-error",
  [ELECTRON_COMMANDS.OS]: "os",
};

function detectPlatform(): "mac" | "win" | "linux" {
  if (typeof navigator === "undefined") return "linux";
  const p = `${navigator.platform} ${navigator.userAgent}`;
  if (/Mac|iPhone|iPad/i.test(p)) return "mac";
  if (/Win/i.test(p)) return "win";
  return "linux";
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && !!(window as any).__TAURI__;
}

export function installTauriElectronShim(): void {
  if (typeof window === "undefined") return;
  const tauri = (window as any).__TAURI__;
  // Only activate under Tauri, and never clobber a real Electron preload.
  if (!tauri || (window as any).electron) return;

  // Guard against an unexpected __TAURI__ shape: a hard throw here would abort
  // _app.tsx module evaluation and leave the user staring at a black screen.
  const core = tauri.core;
  const eventApi = tauri.event;
  if (!core?.invoke || !eventApi?.listen) {
    console.error(
      "[tauri-shim] __TAURI__ present but core.invoke/event.listen missing; shim not installed.",
      { hasCore: !!core, hasEvent: !!eventApi },
    );
    return;
  }

  const invoke = core.invoke as (cmd: string, args?: any) => Promise<any>;
  const listen = eventApi.listen as (
    event: string,
    handler: (e: any) => void,
  ) => Promise<() => void>;

  // Track unlisten handles so `off` can detach a previously registered fn.
  const unlisteners = new Map<string, Map<AnyFn, Promise<() => void>>>();

  const toTauriArgs = (command: string, payload: any) => {
    if (PAYLOAD_COMMANDS.has(command)) return { payload };
    return payload === undefined ? undefined : payload;
  };

  const electron = {
    platform: detectPlatform(),

    send: (command: string, payload?: any) => {
      const tauriCmd = COMMAND_TO_TAURI[command];
      if (!tauriCmd) {
        console.warn("[tauri-shim] unmapped send command:", command);
        return;
      }
      invoke(tauriCmd, toTauriArgs(command, payload)).catch((err) =>
        console.error(`[tauri-shim] send ${command} failed:`, err),
      );
    },

    invoke: (command: string, payload?: any) => {
      const tauriCmd = COMMAND_TO_TAURI[command];
      if (!tauriCmd) {
        console.warn("[tauri-shim] unmapped invoke command:", command);
        return Promise.resolve(null);
      }
      return invoke(tauriCmd, toTauriArgs(command, payload));
    },

    on: (command: string, func: AnyFn) => {
      const slug = COMMAND_TO_EVENT[command] ?? command;
      if (!unlisteners.has(slug)) unlisteners.set(slug, new Map());
      const promise = listen(slug, (e: any) => func(e, e.payload));
      unlisteners.get(slug)!.set(func, promise);
    },

    off: (command: string, func: AnyFn) => {
      const slug = COMMAND_TO_EVENT[command] ?? command;
      const map = unlisteners.get(slug);
      const promise = map?.get(func);
      if (promise) {
        promise.then((un) => un()).catch(() => {});
        map!.delete(func);
      }
    },

    getSystemInfo: async () => invoke("get_system_info"),
    getAppVersion: async () => invoke("get_app_version"),

    // Drag-and-drop: Tauri's WebView does NOT add .path to HTML File objects.
    // Instead, Tauri fires a "tauri://drag-drop" event with the OS paths.
    // We listen for it, cache the paths, and re-dispatch a synthetic DOM
    // "drop" event carrying real File objects that our drag-handler can use.
    //
    // getPathForFile looks up the path by File.name (best-effort; only the
    // file name is available from the HTML File API, not the full path).
    getPathForFile: (file: File) => {
      return (window as any).__tauriDropPaths__?.[file.name] ?? (file as any).path ?? "";
    },
  };

  // Cache: filename → full OS path from Tauri's drop event.
  (window as any).__tauriDropPaths__ = {} as Record<string, string>;

  listen("tauri://drag-drop", (e: any) => {
    const paths: string[] = e.payload?.paths ?? [];
    if (!paths.length) return;

    // Update the cache (keyed by base filename for getPathForFile lookups).
    const cache = (window as any).__tauriDropPaths__ as Record<string, string>;
    paths.forEach((p) => {
      const name = p.replace(/\\/g, "/").split("/").pop() ?? p;
      cache[name] = p;
    });

    // Build synthetic File objects and re-fire a "drop" event on the element
    // under the pointer so existing onDrop handlers receive them.
    const buildFiles = async () => {
      const files: File[] = [];
      for (const p of paths) {
        try {
          const name = p.replace(/\\/g, "/").split("/").pop() ?? p;
          // Fetch from asset protocol to get the actual bytes.
          const url = tauri.core.convertFileSrc(p);
          const res = await fetch(url);
          const blob = await res.blob();
          const f = new File([blob], name, { type: blob.type });
          // Stash the path directly on the File object too (belt+suspenders).
          (f as any).path = p;
          files.push(f);
        } catch {
          // If fetch fails (network/perms) we still emit with a minimal File.
          const name = p.replace(/\\/g, "/").split("/").pop() ?? p;
          const f = new File([], name);
          (f as any).path = p;
          files.push(f);
        }
      }

      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));

      const target = document.elementFromPoint(
        e.payload?.position?.x ?? window.innerWidth / 2,
        e.payload?.position?.y ?? window.innerHeight / 2,
      ) ?? document.body;

      const synth = new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      target.dispatchEvent(synth);
    };

    buildFiles().catch(() => {});
  }).catch(() => {});

  (window as any).electron = electron;
  console.log("[tauri-shim] window.electron installed (platform:", electron.platform, ")");
}
