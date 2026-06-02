"use client";
import React, { useState } from "react";
import { useAtom } from "jotai";
import { scaleAtom, selectedModelIdAtom } from "../atoms/user-settings-atom";

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

const SCALE_MARKS = [
  { value: "2", label: "×2" },
  { value: "4", label: "×4" },
  { value: "8", label: "×8" },
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

type RightPanelProps = {
  upscaylHandler: () => Promise<void> | void;
  imagePath: string;
  batchFolderPath: string;
};

const RightPanel = ({ upscaylHandler, imagePath, batchFolderPath }: RightPanelProps) => {
  const [scale, setScale] = useAtom(scaleAtom);
  const [selectedModelId, setSelectedModelId] = useAtom(selectedModelIdAtom);
  const [toggles, setToggles] = useState(OPTION_TOGGLES.map((o) => o.defaultOn));

  const scaleIndex = SCALE_MARKS.findIndex((m) => m.value === scale);
  const sliderValue = scaleIndex >= 0 ? scaleIndex : 1;

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
      }}
    >
      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <span style={{ color: "var(--symp-ink-3, #6F6F75)", display: "inline-flex" }}>
            <GearIcon />
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--symp-ink, #0E0E0F)", letterSpacing: "-0.01em" }}>
            Réglages
          </span>
        </div>

        {/* Scale slider */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionLabel>Facteur d'upscale</SectionLabel>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--symp-accent, #0055A4)" }}>
              ×{scale}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={2}
            step={1}
            value={sliderValue}
            onChange={(e) => setScale(SCALE_MARKS[Number(e.target.value)].value)}
            style={{ width: "100%", accentColor: "#0055A4", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {SCALE_MARKS.map((m) => (
              <span key={m.value} style={{ fontSize: 10, color: "var(--symp-ink-3, #6F6F75)", fontWeight: 500 }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>

        {/* Model grid */}
        <div style={{ marginBottom: 24 }}>
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
                    padding: 10,
                    border: active ? "1.5px solid var(--symp-accent, #0055A4)" : "1px solid var(--symp-line, rgba(14,14,15,0.08))",
                    background: active ? "rgba(0,85,164,0.08)" : "var(--symp-bg-2, #F2F0EC)",
                    color: active ? "var(--symp-accent, #0055A4)" : "var(--symp-ink, #0E0E0F)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.3 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: active ? "var(--symp-accent, #0055A4)" : "var(--symp-ink-3, #6F6F75)", marginTop: 2, opacity: 0.8 }}>{m.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Option toggles */}
        <div style={{ marginBottom: 8 }}>
          <SectionLabel>Options</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {OPTION_TOGGLES.map((opt, i) => {
              const on = toggles[i];
              return (
                <label key={opt.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                  <span style={{ fontSize: 12.5, color: "var(--symp-ink, #0E0E0F)", fontWeight: 500 }}>{opt.label}</span>
                  {/* Custom toggle */}
                  <div
                    onClick={() => {
                      const next = [...toggles];
                      next[i] = !next[i];
                      setToggles(next);
                    }}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: on ? "#0055A4" : "rgba(14,14,15,0.15)",
                      position: "relative",
                      cursor: "pointer",
                      transition: "background 0.2s ease",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 3,
                        left: on ? 21 : 3,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.2s ease",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      }}
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed launch button at bottom */}
      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--symp-line, rgba(14,14,15,0.08))" }}>
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
