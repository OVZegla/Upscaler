"use client";
import React from "react";

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
  </svg>
);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const NAV_ITEMS = [
  { id: 0, label: "Nouveau traitement", icon: <SparkleIcon /> },
  { id: 1, label: "Paramètres", icon: <GearIcon /> },
];

type LeftNavProps = {
  selectedTab: number;
  setSelectedTab: (tab: number) => void;
  version: string | null;
};

const LeftNav = ({ selectedTab, setSelectedTab, version }: LeftNavProps) => {
  const isMac = typeof window !== "undefined" && window.electron?.platform === "mac";

  return (
    <div
      style={{
        width: 220,
        minWidth: 220,
        maxWidth: 220,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--symp-panel, #FFFFFF)",
        borderRight: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
        padding: "16px 0",
        flexShrink: 0,
      }}
    >
      {isMac && <div style={{ height: 28 }} className="mac-titlebar" />}

      <div style={{ padding: "0 16px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <img
            src="/sympsupscale.png"
            alt="logo"
            style={{ width: 40, height: 40, borderRadius: 8, flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.04em", color: "var(--symp-ink, #0E0E0F)", lineHeight: 1.2 }}>
              SYMP'S UPSCALE
            </div>
            {version && (
              <div style={{ fontSize: 11, color: "var(--symp-ink-3, #6F6F75)", marginTop: 2 }}>
                v{version}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 8px", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = selectedTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                border: "none",
                background: active ? "var(--symp-accent-tint, rgba(0,85,164,0.08))" : "transparent",
                color: active ? "var(--symp-accent, #0055A4)" : "var(--symp-ink-2, #3A3A3D)",
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                boxShadow: active ? "inset 2px 0 0 var(--symp-accent, #0055A4)" : "none",
                transition: "background 0.15s ease, color 0.15s ease",
              }}
            >
              <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LeftNav;
