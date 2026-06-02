"use client";
import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  scaleAtom,
  selectedModelIdAtom,
  doubleUpscaylAtom,
  customWidthAtom,
  useCustomWidthAtom,
} from "../atoms/user-settings-atom";

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const MODEL_LIST = [
  { id: "upscayl-lite-4x", label: "Lite", sub: "Plus rapide" },
  { id: "upscayl-standard-4x", label: "Standard", sub: "Équilibré" },
  { id: "high-fidelity-4x", label: "High Fidelity", sub: "Haute qualité" },
  { id: "remacri-4x", label: "Remacri", sub: "Détails fins" },
  { id: "ultrasharp-4x", label: "Ultra Sharp", sub: "Ultra net" },
  { id: "digital-art-4x", label: "Digital Art", sub: "Art digital" },
];

const OPTION_TOGGLES = [
  { label: "Réduction du bruit", defaultOn: true },
  { label: "Netteté intelligente", defaultOn: true },
  { label: "Préservation des détails", defaultOn: true },
  { label: "Optimisation impression", defaultOn: false },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--symp-ink-3, #6F6F75)", textTransform: "uppercase", marginBottom: 10 }}>
      {children}
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
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? "#0055A4" : "rgba(14,14,15,0.18)",
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
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.18s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
}

type RightPanelProps = {
  upscaylHandler: () => Promise<void> | void;
  imagePath: string;
  batchFolderPath: string;
  dimensions: { width: number | null; height: number | null };
};

const RightPanel = ({ upscaylHandler, imagePath, batchFolderPath, dimensions }: RightPanelProps) => {
  const [scale, setScale] = useAtom(scaleAtom);
  const [selectedModelId, setSelectedModelId] = useAtom(selectedModelIdAtom);
  const [doubleUpscayl, setDoubleUpscayl] = useAtom(doubleUpscaylAtom);
  const customWidth = useAtomValue(customWidthAtom);
  const useCustomWidth = useAtomValue(useCustomWidthAtom);
  const [toggles, setToggles] = useState(OPTION_TOGGLES.map((o) => o.defaultOn));

  const scaleInt = parseInt(scale) || 4;

  const outputDimensions = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return null;
    if (useCustomWidth && customWidth > 0) {
      return {
        width: customWidth,
        height: Math.round(customWidth * (dimensions.height / dimensions.width)),
      };
    }
    const factor = doubleUpscayl ? scaleInt * scaleInt : scaleInt;
    return {
      width: dimensions.width * factor,
      height: dimensions.height * factor,
    };
  }, [dimensions, scale, doubleUpscayl, useCustomWidth, customWidth]);

  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        maxWidth: 300,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--symp-panel, #FFFFFF)",
        borderLeft: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <span style={{ color: "var(--symp-ink-3, #6F6F75)", display: "inline-flex" }}>
            <GearIcon />
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--symp-ink, #0E0E0F)", letterSpacing: "-0.01em" }}>
            Réglages
          </span>
        </div>

        {/* Scale slider 1–16 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <SectionLabel>Facteur d'upscale</SectionLabel>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0055A4", marginBottom: 10 }}>
              ×{scale}{doubleUpscayl ? `² = ×${scaleInt * scaleInt}` : ""}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={scaleInt}
            onChange={(e) => setScale(e.target.value)}
            style={{ width: "100%", accentColor: "#0055A4", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {["×1", "×4", "×8", "×12", "×16"].map((l) => (
              <span key={l} style={{ fontSize: 9, color: "var(--symp-ink-3, #6F6F75)" }}>{l}</span>
            ))}
          </div>
          {scaleInt >= 6 && (
            <p style={{ fontSize: 10, color: "#C0392B", marginTop: 6 }}>
              ⚠ Valeurs élevées : traitement très lent
            </p>
          )}
        </div>

        {/* Double upscale toggle */}
        {!batchFolderPath && (
          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--symp-ink, #0E0E0F)" }}>Double Upscale</div>
              <div style={{ fontSize: 10, color: "var(--symp-ink-3, #6F6F75)" }}>Applique le modèle deux fois</div>
            </div>
            <PillToggle on={doubleUpscayl} onChange={setDoubleUpscayl} />
          </div>
        )}

        {/* Model grid */}
        <div style={{ marginBottom: 20 }}>
          <SectionLabel>Modèle</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {MODEL_LIST.map((m) => {
              const active = selectedModelId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  style={{
                    borderRadius: 8,
                    padding: "8px 10px",
                    border: active ? "1.5px solid #0055A4" : "1px solid var(--symp-line, rgba(14,14,15,0.08))",
                    background: active ? "rgba(0,85,164,0.08)" : "var(--symp-bg-2, #F2F0EC)",
                    color: active ? "#0055A4" : "var(--symp-ink, #0E0E0F)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                    minWidth: 0,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 11, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</div>
                  <div style={{ fontSize: 9, color: active ? "#0055A4" : "var(--symp-ink-3, #6F6F75)", marginTop: 2, opacity: 0.8 }}>{m.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Option toggles */}
        <div>
          <SectionLabel>Options</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {OPTION_TOGGLES.map((opt, i) => (
              <div
                key={opt.label}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
              >
                <span style={{ fontSize: 12, color: "var(--symp-ink, #0E0E0F)", fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {opt.label}
                </span>
                <PillToggle
                  on={toggles[i]}
                  onChange={(v) => {
                    const next = [...toggles];
                    next[i] = v;
                    setToggles(next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dimensions display + launch button */}
      <div style={{ padding: "12px 16px 20px", borderTop: "1px solid var(--symp-line, rgba(14,14,15,0.08))" }}>
        {dimensions.width && dimensions.height && outputDimensions && (
          <div style={{ marginBottom: 12, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "var(--symp-ink-3, #6F6F75)", marginBottom: 4 }}>Taille de sortie</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontFamily: "var(--symp-mono, monospace)", fontSize: 13, fontWeight: 700, color: "var(--symp-ink-2, #3A3A3D)" }}>
                {dimensions.width}×{dimensions.height}
              </span>
              <span style={{ fontSize: 14, color: "#0055A4", fontWeight: 700 }}>→</span>
              <span style={{ fontFamily: "var(--symp-mono, monospace)", fontSize: 15, fontWeight: 700, color: "#0055A4" }}>
                {outputDimensions.width}×{outputDimensions.height}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={upscaylHandler}
          style={{
            width: "100%",
            background: "#C0392B",
            color: "#FFFFFF",
            borderRadius: 10,
            padding: "14px 0",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "-0.01em",
            border: "none",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#A93226")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#C0392B")}
        >
          Lancer l'upscale
        </button>
      </div>
    </div>
  );
};

export default RightPanel;
