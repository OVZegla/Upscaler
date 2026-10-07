"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import {
  scaleAtom,
  selectedModelIdAtom,
  progressAtom,
  customWidthAtom,
  useCustomWidthAtom,
  usePrintSizeAtom,
  printWidthCmAtom,
  printDpiAtom,
  allowHugeFactorsAtom,
  upscalePassAtom,
  etaTextAtom,
  panelSectionAtom,
  cutStripsAtom,
  stripCountAtom,
  stripOverlapCmAtom,
  stripResultAtom,
} from "../atoms/user-settings-atom";
import { estimatePrint, formatSize } from "@/lib/print-size";

const fontStack = "var(--symp-font, Geist, -apple-system, sans-serif)";

/* ── Icons ───────────────────────────────────────────────────────── */
const CloudUploadIcon = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16l-4-4-4 4" />
    <path d="M12 12v9" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    <path d="M16 16l-4-4-4 4" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const InfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);



const ScaleIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const StripsIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="4.5" height="16" rx="1" />
    <rect x="9.75" y="4" width="4.5" height="16" rx="1" />
    <rect x="16.5" y="4" width="4.5" height="16" rx="1" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
  </svg>
);

const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.1 9a3 3 0 1 1 4.2 2.7c-.8.4-1.3 1.1-1.3 2v.3" />
    <path d="M12 17h.01" />
  </svg>
);

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z" />
  </svg>
);

const WallWidthIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    {/* Two courses only: at 19px any more brickwork turns to mush. */}
    <g strokeWidth="1.7">
      <rect x="2.5" y="2.5" width="19" height="11" rx="1.2" />
      <path d="M2.5 8h19" />
      <path d="M10 2.5v5.5M15.5 8v5.5" />
    </g>
    {/* Width measurement, set well clear of the wall and drawn heavier so it
        still reads as an arrow at this size. */}
    <g strokeWidth="2">
      <path d="M3.5 19.5h17" />
      <path d="M6.5 16.5L3.5 19.5l3 3" />
      <path d="M17.5 16.5l3 3-3 3" />
    </g>
  </svg>
);




/** Rotating ring shown while a job runs. */
const Spinner = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    style={{ animation: "symp-spin 0.9s linear infinite", flexShrink: 0 }}
  >
    <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────────────── */
function SectionLabel({ children, info }: { children: React.ReactNode; info?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: "var(--ink-3)",
        textTransform: "uppercase",
      }}
    >
      <span>{children}</span>
      {info && (
        <span style={{ display: "inline-flex", opacity: 0.7 }}>
          <InfoIcon />
        </span>
      )}
    </div>
  );
}

function PillToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="checkbox"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: on ? "var(--accent)" : "var(--border-2)",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--bg-card)",
          transition: "left 0.18s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
}

/** −/+ stepper for a small count. Far easier to hit than a text field for
 *  someone who is not comfortable with a keyboard. */
function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const btn = (label: string, delta: number, disabled: boolean) => (
    <button
      onClick={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      disabled={disabled}
      aria-label={delta < 0 ? "Diminuer" : "Augmenter"}
      className={disabled ? undefined : "symp-press"}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        border: "1px solid var(--border-2)",
        background: "var(--bg-card)",
        color: disabled ? "var(--ink-3)" : "var(--ink)",
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.45 : 1,
        fontFamily: fontStack,
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {btn("−", -1, value <= min)}
      <span
        style={{
          minWidth: 28,
          textAlign: "center",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--ink)",
          fontFamily: "var(--symp-mono, monospace)",
        }}
      >
        {value}
      </span>
      {btn("+", 1, value >= max)}
    </div>
  );
}

/** Scale drawing of the cut: numbered strips with the shared material shown
 *  between them, so the layout is obvious without reading anything. */
function StripPreview({ count, overlap }: { count: number; overlap: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        gap: overlap ? 0 : 3,
        height: 46,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--border-2)",
        background: "var(--bg-card)",
        padding: 3,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <React.Fragment key={i}>
          {overlap && i > 0 && (
            <div
              title="recouvrement"
              style={{
                width: 7,
                flexShrink: 0,
                background:
                  "repeating-linear-gradient(45deg, var(--accent) 0 2px, transparent 2px 4px)",
                opacity: 0.55,
              }}
            />
          )}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 5,
              background: "var(--accent-tint)",
              border: "1px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--accent)",
              fontFamily: "var(--symp-mono, monospace)",
            }}
          >
            {i + 1}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/** Ordered best-first. The descriptions say what was measured, not what
 *  sounds good: on a 4x round-trip test the Compact model came out closer to
 *  the original than the other two, while running an order of magnitude
 *  faster. */
const MODE_CARDS = [
  {
    id: "4xLSDIRCompactC3",
    label: "Précision",
    sub: "Le plus fidèle aux détails d'origine, et de loin le plus rapide.",
    icon: <SparkleIcon />,
    badge: "Recommandé",
  },
];

/** The chain allows up to 256x (four x4 passes), so the old stop at 8x was
 *  the slider's, not the engine's. Measured, the model stops paying for itself
 *  past 8x on photographic content but line art holds up, so the stops go
 *  further and the panel says what it costs rather than refusing. */
/** The slider stops at 16x unless the user opens it up. The chain reaches
 *  256x, but past 8x the model already loses to a plain resize on anything
 *  photographic, so those factors are an escape hatch rather than a place to
 *  arrive by dragging too far. */
const SCALE_VALUES_BASE = [1, 2, 3, 4, 6, 8, 12, 16];
const SCALE_VALUES_HUGE = [24, 32, 48, 64, 128, 256];
/** Only a few get a label: fourteen under a 350px track is unreadable. */
const SCALE_TICKS_BASE = [1, 4, 8, 16];
const SCALE_TICKS_HUGE = [1, 4, 16, 64, 256];
/** Above this the measured advantage over a plain resize is gone. */
const SCALE_WARN_ABOVE = 8;

type LeftPanelProps = {
  imagePath: string;
  batchFolderPath: string;
  dimensions: { width: number | null; height: number | null };
  selectImageHandler: () => void;
  selectFolderHandler: () => void;
  resetImagePaths: () => void;
  validateImagePath: (path: string) => void;
  setImagePath: (path: string) => void;
  upscaylHandler: () => void;
  dragActive: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
};

const LeftPanel = ({
  imagePath,
  batchFolderPath,
  dimensions,
  selectImageHandler,
  upscaylHandler,
  dragActive,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
}: LeftPanelProps) => {
  const [scale, setScale] = useAtom(scaleAtom);
  const [selectedModelId, setSelectedModelId] = useAtom(selectedModelIdAtom);
  const [progress, setProgress] = useAtom(progressAtom);
  const [upscalePass, setUpscalePass] = useAtom(upscalePassAtom);
  const etaText = useAtomValue(etaTextAtom);
  const customWidth = useAtomValue(customWidthAtom);
  const useCustomWidth = useAtomValue(useCustomWidthAtom);
  const [usePrintSize, setUsePrintSize] = useAtom(usePrintSizeAtom);
  const [printWidthCm, setPrintWidthCm] = useAtom(printWidthCmAtom);
  const [printDpi, setPrintDpi] = useAtom(printDpiAtom);
  const [allowHuge, setAllowHuge] = useAtom(allowHugeFactorsAtom);

  const SCALE_VALUES = allowHuge
    ? [...SCALE_VALUES_BASE, ...SCALE_VALUES_HUGE]
    : SCALE_VALUES_BASE;
  const SCALE_TICK_AT = allowHuge ? SCALE_TICKS_HUGE : SCALE_TICKS_BASE;

  const MAX_BASE = SCALE_VALUES_BASE[SCALE_VALUES_BASE.length - 1];
  const toggleHuge = (on: boolean) => {
    setAllowHuge(on);
    if (!on && (parseInt(scale) || 4) > MAX_BASE) setScale(String(MAX_BASE));
  };

  // Target printed size -> pixel width for the upscaler. Kept separate from
  // customWidthAtom on purpose: that atom is owned by the "custom resolution"
  // setting, and writing to it from here would silently clobber the user's
  // own value. The pixel width is derived again when the job is sent.
  const printEstimate = estimatePrint(
    dimensions.width,
    dimensions.height,
    printWidthCm,
    printDpi,
  );

  const scaleInt = parseInt(scale) || 4;
  const scaleIdx = SCALE_VALUES.indexOf(scaleInt) >= 0 ? SCALE_VALUES.indexOf(scaleInt) : 2;
  const isUpscaling = progress.length > 0;

  // No percentage is shown. The binary reports per-run progress that does
  // not map cleanly onto a whole job, and a number that lies is worse than
  // no number: show which pass is running and that work is happening.

  const cancelHandler = () => {
    window.electron.send(ELECTRON_COMMANDS.STOP);
    setProgress("");
    // Must clear too: a cancelled chained job would otherwise leave a stale
    // pass count behind and skew the next job's progress.
    setUpscalePass(null);
  };

  const [cutStrips, setCutStrips] = useAtom(cutStripsAtom);
  const [stripCount, setStripCount] = useAtom(stripCountAtom);
  const [stripOverlapCm, setStripOverlapCm] = useAtom(stripOverlapCmAtom);
  const [stripResult, setStripResult] = useAtom(stripResultAtom);
  const section = useAtomValue(panelSectionAtom);

  // The rail's first two entries ARE the sizing mode, so choosing one sets it.

  // In print mode the job is only launchable once a real size is known —
  // otherwise the backend silently falls back to the scale factor.
  // Factor mode never estimated its own output. At the factors the slider now
  // reaches, a job can be physically impossible long before it is merely
  // unwise, and waiting minutes to find that out is the worst way to learn it.
  const factorEstimate = useMemo(() => {
    if (usePrintSize || !dimensions.width || !dimensions.height) return null;
    const width = dimensions.width * scaleInt;
    const height = dimensions.height * scaleInt;
    const megapixels = (width * height) / 1e6;
    return {
      width,
      height,
      megapixels,
      bytes: width * height * 3,
      // Heavy, but the user's call: show the weight and let them decide.
      heavy: megapixels > 400,
      // JPEG cannot address a side beyond this.
      exceedsJpegLimit: width > 65535 || height > 65535,
      // Genuinely out of reach: 16 gigapixels is ~64 GB as RGBA, and both the
      // DPI stamp and the strip cutter load the finished file whole.
      impossible: megapixels > 16000,
    };
  }, [dimensions, scaleInt, usePrintSize]);

  const hasSource = !!imagePath || !!batchFolderPath;
  const printSizeReady = !usePrintSize || (printWidthCm > 0 && !!printEstimate);
  const canUpscale =
    !isUpscaling && hasSource && printSizeReady && !factorEstimate?.impossible;

  const fileName = imagePath ? imagePath.split(/[\\/]/).pop() : "";

  const outputDimensions = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return null;
    if (usePrintSize) {
      return printEstimate
        ? { width: printEstimate.widthPx, height: printEstimate.heightPx }
        : null;
    }
    if (useCustomWidth && customWidth > 0) {
      return { width: customWidth, height: Math.round(customWidth * (dimensions.height / dimensions.width)) };
    }
    const factor = scaleInt;
    return { width: dimensions.width * factor, height: dimensions.height * factor };
  }, [dimensions, scaleInt, useCustomWidth, customWidth, usePrintSize, printEstimate]);


  return (
    <div
      style={{
        width: 372,
        minWidth: 372,
        maxWidth: 372,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        borderRight: "1px solid var(--border)",
        flexShrink: 0,
        overflow: "hidden",
        fontFamily: fontStack,
      }}
    >
      {/* Panel header, naming the section the rail selected. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 20px 0",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          {section === "upscale"
            ? "Upscale"
            : section === "print"
              ? "Taille du mur"
              : "Découpe en bandes"}
        </span>
      </div>

      <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "14px 20px 8px", display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Drop zone */}
        <div
          onClick={selectImageHandler}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          className={`symp-press${dragActive ? " symp-drop-active" : ""}`}
          style={{
            minHeight: 160,
            borderRadius: "var(--radius)",
            border: dragActive ? "2px solid var(--accent)" : "2px dashed var(--border-2)",
            background: dragActive ? "var(--accent-tint)" : "var(--bg-card)",
            transform: dragActive ? "scale(1.01)" : "scale(1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 20,
            cursor: "pointer",
            textAlign: "center",
            transition: "border 0.15s ease, background 0.15s ease",
          }}
        >
          {imagePath ? (
            <>
              <div style={{ color: "var(--accent)", display: "inline-flex" }}>
                <CheckIcon />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)", wordBreak: "break-all", maxWidth: "100%" }}>
                {fileName}
              </div>
              {dimensions.width && dimensions.height && (
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", display: "flex", gap: 8 }}>
                  <span style={{ fontFamily: "var(--symp-mono, monospace)", fontWeight: 600, color: "var(--ink-2)" }}>
                    {dimensions.width}×{dimensions.height}
                  </span>
                  {outputDimensions && (
                    <>
                      <span style={{ opacity: 0.4 }}>→</span>
                      <span style={{ fontFamily: "var(--symp-mono, monospace)", fontWeight: 700, color: "var(--accent)" }}>
                        {outputDimensions.width}×{outputDimensions.height}
                      </span>
                    </>
                  )}
                </div>
              )}
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Cliquez pour changer d'image
              </div>
            </>
          ) : (
            <>
              <div style={{ color: dragActive ? "var(--accent)" : "var(--ink-3)", display: "inline-flex" }}>
                <CloudUploadIcon />
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                Glissez-déposez votre image ici
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
                ou cliquez pour sélectionner un fichier
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectImageHandler();
                }}
                style={{
                  marginTop: 6,
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 16px",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: fontStack,
                }}
              >
                Sélectionner une image
              </button>
            </>
          )}
        </div>

        {/* Everything below depends on the section. Keyed on it so switching
            replays a short entrance; the drop zone above stays put. */}
        <div
          key={section}
          className="symp-section-in"
          style={{ display: "flex", flexDirection: "column", gap: 22 }}
        >

        {/* Taille d'impression */}
        <div className="symp-rise" style={{ ["--symp-delay" as any]: "40ms" }}>
          {section === "print" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              {/* Largeur + DPI */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Largeur du mur</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      value={printWidthCm}
                      onChange={(e) => setPrintWidthCm(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{
                        width: "100%",
                        padding: "7px 9px",
                        borderRadius: 8,
                        border: "1px solid var(--border-2)",
                        background: "var(--bg-card)",
                        color: "var(--ink)",
                        fontSize: 13.5,
                        fontWeight: 600,
                        fontFamily: "var(--symp-mono, monospace)",
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>cm</span>
                  </div>
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Résolution</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[300, 150].map((dpi) => (
                      <button
                        key={dpi}
                        onClick={() => setPrintDpi(dpi)}
                        style={{
                          padding: "7px 11px",
                          borderRadius: 8,
                          border: printDpi === dpi ? "1px solid transparent" : "1px solid var(--border-2)",
                          background: printDpi === dpi ? "var(--accent)" : "transparent",
                          color: printDpi === dpi ? "var(--accent-ink)" : "var(--ink-2)",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: fontStack,
                        }}
                      >
                        {dpi}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Résultat du calcul */}
              {printEstimate ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                    <span style={{ fontFamily: "var(--symp-mono, monospace)", fontWeight: 700, color: "var(--accent)" }}>
                      {printEstimate.widthPx.toLocaleString("fr-FR")} × {printEstimate.heightPx.toLocaleString("fr-FR")} px
                    </span>
                    <span style={{ marginLeft: 8, color: "var(--ink-3)" }}>
                      ({printWidthCm} × {printEstimate.heightCm.toFixed(0)} cm)
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    Facteur {printEstimate.factor.toFixed(1)}× · {printEstimate.megapixels.toFixed(0)} Mpx · ~{formatSize(printEstimate.estimatedBytes)}
                  </div>

                  {printEstimate.isHeavy && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 7,
                        padding: "9px 11px",
                        borderRadius: 9,
                        border: "1px solid var(--border-2)",
                        background: "var(--accent-tint)",
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.45 }}>
                        Traitement très gourmand à {printDpi} DPI. Passer à 150
                        DPI divise le poids par quatre. Il faudra réaugmenter la
                        résolution dans Photoshop.
                      </span>
                      {printDpi !== 150 && (
                        <button
                          onClick={() => setPrintDpi(150)}
                          style={{
                            alignSelf: "flex-start",
                            padding: "5px 11px",
                            borderRadius: 7,
                            border: "none",
                            background: "var(--accent)",
                            color: "var(--accent-ink)",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: fontStack,
                          }}
                        >
                          Passer à 150 DPI
                        </button>
                      )}
                    </div>
                  )}

                  {printEstimate.isOverStretched && (
                    <span style={{ fontSize: 11.5, color: "var(--red)", lineHeight: 1.45 }}>
                      Facteur {printEstimate.factor.toFixed(1)}× : au-delà de
                      8×, nos mesures montrent que l&apos;IA n&apos;apporte plus
                      rien. À 16× elle fait moins bien qu&apos;un simple
                      agrandissement, tout en prenant bien plus de temps. Il
                      faudrait repartir d&apos;une source plus grande.
                    </span>
                  )}

                  {printEstimate.exceedsJpegLimit && (
                    <span style={{ fontSize: 11.5, color: "var(--red)", lineHeight: 1.45 }}>
                      Au-delà de 65 535 px, le format JPG est impossible :
                      choisissez PNG.
                    </span>
                  )}
                </div>
              ) : (
                <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                  Chargez une image pour calculer la taille de sortie.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Scale slider — the "Upscale" section's only control. */}
        {section === "upscale" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionLabel info>Niveau d'upscale</SectionLabel>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{scaleInt}x</span>
            </div>
            <input
              type="range"
              min={0}
              max={SCALE_VALUES.length - 1}
              step={1}
              value={scaleIdx}
              onChange={(e) => setScale(String(SCALE_VALUES[parseInt(e.target.value)]))}
              style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div style={{ position: "relative", height: 14, marginTop: 4 }}>
              {SCALE_TICK_AT.map((v) => {
                const i = SCALE_VALUES.indexOf(v);
                const pct = (i / (SCALE_VALUES.length - 1)) * 100;
                return (
                  <span
                    key={v}
                    style={{
                      position: "absolute",
                      left: `${pct}%`,
                      transform: `translateX(${pct === 0 ? "0" : pct === 100 ? "-100%" : "-50%"})`,
                      fontSize: 10,
                      color: "var(--ink-3)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v}x
                  </span>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 600 }}>
                  Autoriser les très grands facteurs
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>
                  Ouvre le curseur jusqu&apos;à 256×. Utile pour un logo ou un
                  dessin au trait, pas pour une photo.
                </div>
              </div>
              <PillToggle on={allowHuge} onChange={toggleHuge} />
            </div>

            {factorEstimate && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
                <span style={{ fontFamily: "var(--symp-mono, monospace)", fontWeight: 700, color: "var(--accent)" }}>
                  {factorEstimate.width.toLocaleString("fr-FR")} × {factorEstimate.height.toLocaleString("fr-FR")} px
                </span>
                <span style={{ marginLeft: 8 }}>
                  {factorEstimate.megapixels.toFixed(0)} Mpx, environ{" "}
                  {formatSize(factorEstimate.bytes)}
                </span>
              </div>
            )}

            {factorEstimate?.impossible && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11.5,
                  lineHeight: 1.45,
                  color: "var(--ink-2)",
                  padding: "9px 11px",
                  borderRadius: 9,
                  border: "1px solid var(--border-2)",
                  background: "var(--red-tint)",
                }}
              >
                À cette taille le fichier ne pourra pas être écrit&nbsp;: la
                mémoire nécessaire dépasse ce qu&apos;une machine peut fournir.
                Choisissez un facteur plus bas.
              </div>
            )}

            {!factorEstimate?.impossible && factorEstimate?.exceedsJpegLimit && (
              <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45, color: "var(--red)" }}>
                Au-delà de 65 535 px de côté, le format JPG est impossible.
                Choisissez PNG dans les paramètres.
              </div>
            )}

            {!factorEstimate?.impossible && factorEstimate?.heavy && (
              <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45, color: "var(--ink-2)" }}>
                Traitement très gourmand. Prévoyez du temps et de l&apos;espace
                disque.
              </div>
            )}

            {!factorEstimate?.impossible && scaleInt > SCALE_WARN_ABOVE && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 11.5,
                  lineHeight: 1.45,
                  color: "var(--ink-2)",
                  padding: "9px 11px",
                  borderRadius: 9,
                  border: "1px solid var(--border-2)",
                  background: "var(--red-tint)",
                }}
              >
                <strong>L&apos;image sera plus grande, pas plus détaillée.</strong>{" "}
                L&apos;IA ne sait agrandir que par 4. Au-delà, elle repasse sur
                ce qu&apos;elle a elle-même inventé à la passe précédente&nbsp;:
                elle ajoute du détail plausible, pas du détail réel. Sur une
                photo, le résultat devient alors moins fidèle que si vous aviez
                simplement étiré l&apos;image, pour bien plus de temps et de
                poids. Les logos et dessins au trait tiennent mieux. Pour
                vraiment gagner en qualité, c&apos;est l&apos;image de départ
                qu&apos;il faut plus grande.
              </div>
            )}
          </div>
        )}

        {/* Mode — only worth showing while there is something to choose. */}
        {MODE_CARDS.length > 1 && (
        <div className="symp-rise" style={{ ["--symp-delay" as any]: "120ms" }}>
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>Mode</SectionLabel>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MODE_CARDS.map((m) => {
              const active = selectedModelId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className="symp-press"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 11,
                    padding: "12px 13px",
                    borderRadius: "var(--radius)",
                    border: active ? "1px solid transparent" : "1px solid var(--border)",
                    background: active ? "var(--accent)" : "var(--bg-card)",
                    color: active ? "var(--accent-ink)" : "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    boxShadow: active ? "var(--shadow)" : "none",
                    fontFamily: fontStack,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      marginTop: 1,
                      flexShrink: 0,
                      color: active ? "var(--accent-ink)" : "var(--accent)",
                    }}
                  >
                    {m.icon}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</span>
                      {m.badge && (
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: 999,
                            background: active ? "rgba(255,255,255,0.22)" : "var(--accent-tint)",
                            color: active ? "var(--accent-ink)" : "var(--accent)",
                          }}
                        >
                          {m.badge}
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 3,
                        fontSize: 11.5,
                        lineHeight: 1.45,
                        opacity: active ? 0.92 : 1,
                        color: active ? "var(--accent-ink)" : "var(--ink-3)",
                      }}
                    >
                      {m.sub}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* Découpe en bandes — its own section in the rail. */}
        {section === "strips" && (
        <div className="symp-rise" style={{ ["--symp-delay" as any]: "160ms" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
              <span style={{ color: "var(--ink-2)", display: "inline-flex", marginTop: 2, flexShrink: 0 }}><StripsIcon /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>Découper en bandes</span>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "var(--red-tint)",
                      color: "var(--red)",
                    }}
                  >
                    Bêta
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>
                  Découpe le fichier en bandes verticales numérotées. Le rendu
                  final dépend de la précision de celui qui manie la machine.
                </div>
              </div>
            </div>
            <PillToggle on={cutStrips} onChange={setCutStrips} />
          </div>

          {cutStrips && (
            <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 14 }}>
              <StripPreview count={stripCount} overlap={stripOverlapCm > 0} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Nombre de bandes</span>
                <Stepper value={stripCount} min={2} max={12} onChange={setStripCount} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Recouvrement</div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                    Matière partagée avec la bande suivante
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={stripOverlapCm}
                    onChange={(e) =>
                      setStripOverlapCm(
                        Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)),
                      )
                    }
                    style={{
                      width: 62,
                      padding: "6px 8px",
                      borderRadius: 8,
                      border: "1px solid var(--border-2)",
                      background: "var(--bg-card)",
                      color: "var(--ink)",
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "var(--symp-mono, monospace)",
                    }}
                  />
                  <span style={{ fontSize: 12, color: "var(--ink-3)" }}>cm</span>
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: "var(--ink-3)", lineHeight: 1.5 }}>
                {usePrintSize && printEstimate ? (
                  <>
                    Environ{" "}
                    <strong style={{ color: "var(--ink-2)" }}>
                      {(printWidthCm / stripCount + stripOverlapCm).toFixed(1)} cm
                    </strong>{" "}
                    par bande, recouvrement compris. L&apos;image complète est
                    enregistrée en plus des bandes.
                  </>
                ) : (
                  <>
                    Les bandes sont enregistrées dans un dossier «&nbsp;…_bandes&nbsp;»,
                    numérotées de gauche à droite. L&apos;image complète est gardée.
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        )}
        </div>
      </div>

      {/* Launch button (sticky) */}
      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--border)" }}>
        {!isUpscaling && stripResult && (
          <div
            className="symp-rise"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border-2)",
              background: "var(--accent-tint)",
            }}
          >
            <span style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.4, minWidth: 0 }}>
              {stripResult.count} bandes prêtes à imprimer.
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() =>
                  window.electron.send(
                    ELECTRON_COMMANDS.OPEN_FOLDER,
                    stripResult.folder,
                  )
                }
                className="symp-press"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: fontStack,
                }}
              >
                <FolderIcon />
                Ouvrir
              </button>
              <button
                onClick={() => setStripResult(null)}
                aria-label="Masquer"
                style={{
                  appearance: "none",
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  color: "var(--ink-3)",
                  cursor: "pointer",
                  display: "inline-flex",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={upscaylHandler}
          disabled={!canUpscale}
          className={canUpscale ? "symp-press" : undefined}
          style={{
            position: "relative",
            overflow: "hidden",
            width: "100%",
            height: 52,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            cursor: canUpscale ? "pointer" : "default",
            fontFamily: fontStack,
            opacity: canUpscale ? 1 : 0.85,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          {/* Light sweeping across the button: shows the app is working
              without implying a measurable amount of progress. */}
          {isUpscaling && (
            <span
              aria-hidden
              className="symp-progress-indeterminate"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "35%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                pointerEvents: "none",
              }}
            />
          )}
          {isUpscaling ? (
            <>
              <Spinner />
              <span>Upscale en cours, patientez…</span>
            </>
          ) : !hasSource ? (
            <span>Sélectionnez une image</span>
          ) : !printSizeReady ? (
            <span>Indiquez la taille du mur</span>
          ) : (
            <span>Lancer l'upscale</span>
          )}
        </button>

        {isUpscaling && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                color: "var(--ink-3)",
                fontFamily: "var(--symp-mono, monospace)",
              }}
            >
              {upscalePass && upscalePass.total > 1
                ? `Passe ${upscalePass.current} / ${upscalePass.total}`
                : "Traitement en cours"}
              {etaText && (
                <span style={{ marginLeft: 8, color: "var(--ink-2)" }}>
                  · {etaText}
                </span>
              )}
            </span>
            <button
              onClick={cancelHandler}
              style={{
                appearance: "none",
                background: "transparent",
                border: 0,
                padding: 0,
                fontSize: 11.5,
                color: "var(--ink-3)",
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: fontStack,
              }}
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;
