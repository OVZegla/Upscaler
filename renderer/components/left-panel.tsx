"use client";
import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  scaleAtom,
  selectedModelIdAtom,
  doubleUpscaylAtom,
  progressAtom,
  customWidthAtom,
  useCustomWidthAtom,
} from "../atoms/user-settings-atom";

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

const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const PrinterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9V2h12v7" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
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
          background: "#fff",
          transition: "left 0.18s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
}

const MODE_CARDS = [
  { id: "upscayl-lite-4x", label: "Rapide", sub: "Traitement plus rapide", icon: <BoltIcon /> },
  { id: "upscayl-standard-4x", label: "Standard", sub: "Meilleure qualité", icon: <ClockIcon /> },
];

const SCALE_VALUES = [1, 2, 4, 6, 8];
const SCALE_TICKS = ["1x", "2x", "4x", "6x", "8x"];

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
  const [doubleUpscayl, setDoubleUpscayl] = useAtom(doubleUpscaylAtom);
  const progress = useAtomValue(progressAtom);
  const customWidth = useAtomValue(customWidthAtom);
  const useCustomWidth = useAtomValue(useCustomWidthAtom);

  const [printOptim, setPrintOptim] = useState(false);
  const [smartSharpen, setSmartSharpen] = useState(true);

  const scaleInt = parseInt(scale) || 4;
  const scaleIdx = SCALE_VALUES.indexOf(scaleInt) >= 0 ? SCALE_VALUES.indexOf(scaleInt) : 2;
  const isUpscaling = progress.length > 0;

  const fileName = imagePath ? imagePath.split(/[\\/]/).pop() : "";

  const outputDimensions = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return null;
    if (useCustomWidth && customWidth > 0) {
      return { width: customWidth, height: Math.round(customWidth * (dimensions.height / dimensions.width)) };
    }
    const factor = doubleUpscayl ? scaleInt * scaleInt : scaleInt;
    return { width: dimensions.width * factor, height: dimensions.height * factor };
  }, [dimensions, scaleInt, doubleUpscayl, useCustomWidth, customWidth]);

  // progress percentage parse
  const pctMatch = progress.match(/(\d+(?:\.\d+)?)%/);
  const pct = pctMatch ? parseFloat(pctMatch[1]) : null;

  return (
    <div
      style={{
        width: 420,
        minWidth: 420,
        maxWidth: 420,
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
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Drop zone */}
        <div
          onClick={selectImageHandler}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          style={{
            minHeight: 160,
            borderRadius: "var(--radius)",
            border: dragActive ? "2px solid var(--accent)" : "2px dashed var(--border-2)",
            background: dragActive ? "var(--accent-tint)" : "var(--bg-card)",
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
                  background: "linear-gradient(135deg, #4F46E5, #3B82F6)",
                  color: "#fff",
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

        {/* Scale slider */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel info>Niveau d'upscale</SectionLabel>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>{scaleInt}x</span>
          </div>
          <input
            type="range"
            min={0}
            max={4}
            step={1}
            value={scaleIdx}
            onChange={(e) => setScale(String(SCALE_VALUES[parseInt(e.target.value)]))}
            style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {SCALE_TICKS.map((tick) => (
              <span key={tick} style={{ fontSize: 10, color: "var(--ink-3)" }}>{tick}</span>
            ))}
          </div>
        </div>

        {/* Double upscale */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ marginBottom: 4 }}>
              <SectionLabel info>Double Upscale</SectionLabel>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.4 }}>
              Applique deux passes d'upscaling pour un résultat ultra-détaillé
            </div>
          </div>
          <PillToggle on={doubleUpscayl} onChange={setDoubleUpscayl} />
        </div>

        {/* Mode */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>Mode</SectionLabel>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {MODE_CARDS.map((m) => {
              const active = selectedModelId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "14px 14px",
                    borderRadius: "var(--radius)",
                    border: active ? "1px solid transparent" : "1px solid var(--border)",
                    background: active ? "linear-gradient(135deg, #4F46E5, #3B82F6)" : "var(--bg-card)",
                    color: active ? "#fff" : "var(--ink)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    boxShadow: active ? "var(--shadow)" : "none",
                  }}
                >
                  <span style={{ display: "inline-flex", color: active ? "#fff" : "var(--accent)" }}>{m.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</span>
                  <span style={{ fontSize: 11.5, opacity: active ? 0.9 : 1, color: active ? "#fff" : "var(--ink-3)" }}>{m.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options d'amélioration */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <SectionLabel>Options d'amélioration</SectionLabel>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                <span style={{ color: "var(--ink-2)", display: "inline-flex", marginTop: 2, flexShrink: 0 }}><PrinterIcon /></span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Optimisation d'impression</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>Améliore le contraste et les détails pour l'impression.</div>
                </div>
              </div>
              <PillToggle on={printOptim} onChange={setPrintOptim} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
                <span style={{ color: "var(--ink-2)", display: "inline-flex", marginTop: 2, flexShrink: 0 }}><SparkleIcon /></span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }}>Netteté intelligente</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>Renforce intelligemment les détails sans artefacts.</div>
                </div>
              </div>
              <PillToggle on={smartSharpen} onChange={setSmartSharpen} />
            </div>
          </div>
        </div>
      </div>

      {/* Launch button (sticky) */}
      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={upscaylHandler}
          disabled={isUpscaling}
          style={{
            width: "100%",
            height: 52,
            background: "linear-gradient(135deg, #4F46E5, #3B82F6)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            cursor: isUpscaling ? "default" : "pointer",
            fontFamily: fontStack,
            opacity: isUpscaling ? 0.85 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {isUpscaling ? (
            <span>{pct !== null ? `Traitement… ${pct.toFixed(0)}%` : progress}</span>
          ) : (
            <span>Lancer l'upscale</span>
          )}
        </button>
        {isUpscaling && (
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 6, borderRadius: 999, background: "var(--border-2)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: pct !== null ? `${pct}%` : "40%",
                  background: "linear-gradient(135deg, #4F46E5, #3B82F6)",
                  borderRadius: 999,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            {pct !== null && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>
                {pct.toFixed(0)}%
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftPanel;
