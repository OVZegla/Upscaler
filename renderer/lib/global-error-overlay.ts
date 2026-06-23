/**
 * Global error overlay.
 *
 * The React <ErrorBoundary> only catches errors thrown during the React render
 * phase. It cannot catch:
 *   - errors thrown while a module is being evaluated (before React mounts),
 *   - errors thrown inside async code / event handlers / effects,
 *   - unhandled promise rejections.
 *
 * Any of those, under Tauri, surface as a silent black screen (the WebView
 * paints its background colour but nothing renders). This overlay installs
 * window.onerror / unhandledrejection handlers that paint the actual error
 * straight into the DOM, so a crash is always *visible* instead of black.
 *
 * Installed as early as possible from _app.tsx, before anything else runs.
 */

let installed = false;

function paint(title: string, detail: string): void {
  if (typeof document === "undefined") return;

  let host = document.getElementById("__global_error_overlay__");
  if (!host) {
    host = document.createElement("div");
    host.id = "__global_error_overlay__";
    host.setAttribute(
      "style",
      [
        "position:fixed",
        "inset:0",
        "z-index:2147483647",
        "background:#0B0B0C",
        "color:#F4F3F0",
        "font-family:monospace",
        "padding:32px",
        "overflow:auto",
        "white-space:pre-wrap",
        "word-break:break-word",
        "font-size:12px",
        "line-height:1.5",
      ].join(";"),
    );
    // Ensure it's attached even if <body> isn't ready yet.
    (document.body || document.documentElement).appendChild(host);
  }

  const block = document.createElement("div");
  block.setAttribute(
    "style",
    "margin-bottom:20px;border-left:3px solid #FC8181;padding-left:14px",
  );
  const heading = document.createElement("div");
  heading.setAttribute(
    "style",
    "color:#FC8181;font-weight:700;font-size:14px;margin-bottom:8px",
  );
  heading.textContent = title;
  const body = document.createElement("div");
  body.setAttribute("style", "color:#C9C7C2");
  body.textContent = detail;
  block.appendChild(heading);
  block.appendChild(body);
  host.appendChild(block);
}

export function installGlobalErrorOverlay(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event: ErrorEvent) => {
    const err = event.error;
    const detail =
      err instanceof Error
        ? `${err.name}: ${err.message}\n\n${err.stack ?? ""}`
        : `${event.message}\n  at ${event.filename}:${event.lineno}:${event.colno}`;
    paint("Erreur JavaScript", detail);
  });

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const detail =
      reason instanceof Error
        ? `${reason.name}: ${reason.message}\n\n${reason.stack ?? ""}`
        : String(reason);
    paint("Promesse rejetée (non gérée)", detail);
  });
}
