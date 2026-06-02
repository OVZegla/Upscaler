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

const SCALE_OPTIONS = ["2", "4", "8"];

const OPTION_TOGGLES = [
  { label: "Réduction du bruit", defaultOn: true },
  { label: "Netteté intelligente", defaultOn: true },
  { label: "Préservation des détails", defaultOn: true },
  { label: "Optimisation impression", defaultOn: false },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--symp-ink-3, #6F6F75)", textTransform: "uppercase", marginBottom: 8 }}>
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
        padding: "20px",
        gap: 0,
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <span style={{ color: "var(--symp-ink-3, #6F6F75)", display: "inline-flex" }}>
          <GearIcon />
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--symp-ink, #0E0E0F)", letterSpacing: "-0.01em" }}>
          Réglages
        </span>
      </div>

      <div style={{ marginBottom: 24 }}>
        <SectionLabel>Facteur d'upscale</SectionLabel>
        <div style={{ display: "flex", gap: 6 }}>
          {SCALE_OPTIONS.map((s) => {
            const active = scale === s;
            return (
              <button
                key={s}
                onClick={() => setScale(s)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  borderRadius: 8,
                  border: active ? "none" : "1px solid var(--symp-line-2, rgba(14,14,15,0.14))",
                  background: active ? "var(--symp-ink, #0E0E0F)" : "transparent",
                  color: active ? "#fff" : "var(--symp-ink-2, #3A3A3D)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                ×{s}
              </button>
            );
          })}
        </div>
      </div>

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
                  background: active ? "var(--symp-accent-tint, rgba(0,85,164,0.08))" : "var(--symp-bg-2, #F2F0EC)",
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

      <div style={{ marginBottom: 24 }}>
        <SectionLabel>Options</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {OPTION_TOGGLES.map((opt, i) => (
            <label key={opt.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
              <span style={{ fontSize: 12.5, color: "var(--symp-ink, #0E0E0F)", fontWeight: 500 }}>{opt.label}</span>
              <input
                type="checkbox"
                checked={toggles[i]}
                onChange={(e) => {
                  const next = [...toggles];
                  next[i] = e.target.checked;
                  setToggles(next);
                }}
                className="toggle toggle-sm"
              />
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <button
          onClick={upscaylHandler}
          style={{
            width: "100%",
            background: "var(--symp-ink, #0E0E0F)",
            color: "var(--symp-ink-inv, #FFFFFF)",
            borderRadius: 10,
            padding: "14px 0",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "-0.01em",
            border: "none",
            cursor: "pointer",
          }}
        >
          Lancer l'upscale
        </button>
      </div>
    </div>
  );
};

export default RightPanel;
