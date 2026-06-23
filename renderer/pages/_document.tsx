import { Html, Head, Main, NextScript } from "next/document";

/**
 * Custom document.
 *
 * The inline script below is the *first* thing that runs in the page, before
 * any /_next bundle loads. Its only job is to make failures visible:
 *
 *   - If a bundle/CSS asset 404s (the classic Tauri "black screen" — wrong
 *     asset path so the JS never executes), the React app and the JS-bundle
 *     error overlay never load, so nothing would otherwise be shown. This
 *     inline handler listens in the *capture* phase (the only way to catch
 *     resource-load errors) and paints the exact failing URL.
 *   - It also catches early window errors / unhandled rejections.
 *
 * Being inline and dependency-free, it is guaranteed to run even when every
 * external asset fails. It self-removes its marker once React mounts.
 */
const diagnosticScript = `
(function () {
  function paint(title, detail) {
    try {
      var host = document.getElementById("__boot_diag__");
      if (!host) {
        host = document.createElement("div");
        host.id = "__boot_diag__";
        host.setAttribute("style", "position:fixed;inset:0;z-index:2147483647;background:#0B0B0C;color:#F4F3F0;font-family:monospace;font-size:12px;line-height:1.5;padding:32px;overflow:auto;white-space:pre-wrap;word-break:break-word");
        (document.body || document.documentElement).appendChild(host);
      }
      var b = document.createElement("div");
      b.setAttribute("style", "margin-bottom:18px;border-left:3px solid #FC8181;padding-left:14px");
      var h = document.createElement("div");
      h.setAttribute("style", "color:#FC8181;font-weight:700;font-size:14px;margin-bottom:6px");
      h.textContent = title;
      var d = document.createElement("div");
      d.setAttribute("style", "color:#C9C7C2");
      d.textContent = detail;
      b.appendChild(h); b.appendChild(d); host.appendChild(b);
    } catch (e) {}
  }
  // Capture phase catches resource (script/link/img) load failures, which do
  // NOT bubble to window in the normal phase.
  window.addEventListener("error", function (e) {
    var t = e.target || e.srcElement;
    if (t && (t.src || t.href)) {
      paint("Asset introuvable (404 / chemin invalide)", (t.tagName || "?") + " -> " + (t.src || t.href) + "\\n\\nC'est la cause de l'ecran noir : le bundle ne se charge pas.");
    } else if (e.message) {
      paint("Erreur JavaScript", e.message + "\\n  " + (e.filename || "") + ":" + (e.lineno || "") + ":" + (e.colno || ""));
    }
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    paint("Promesse rejetee", (r && r.stack) ? (r.message + "\\n\\n" + r.stack) : String(r));
  });
  // <base href="./"> is only needed under Electron, which loads from a file://
  // URL and relies on relative asset resolution. Under Tauri the app is served
  // from the protocol root (tauri://localhost/), where a base href can
  // misdirect path resolution and break loading. Inject it ONLY for file://.
  try {
    if (location.protocol === "file:") {
      var base = document.createElement("base");
      base.setAttribute("href", "./");
      document.head.insertBefore(base, document.head.firstChild);
    }
  } catch (e) {}
})();
`;

export default function Document() {
  return (
    <Html>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: diagnosticScript }} />
      </Head>
      <body style={{ backgroundColor: "#171717" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
