"use client";
import React, { useState, useRef, useEffect } from "react";

type TopBarProps = {
  selectedTab: number;
  setSelectedTab: (tab: number) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  zoomAmount: string;
  setZoomAmount: (z: string) => void;
  showComparison: boolean;
  setShowComparison: (v: boolean) => void;
};

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const ZOOM_OPTIONS = [
  { label: "Ajuster à l'écran", value: "fit" },
  { label: "50%", value: "50" },
  { label: "100%", value: "100" },
  { label: "200%", value: "200" },
];

const fontStack = "var(--symp-font, Geist, -apple-system, sans-serif)";

const TopBar = ({
  selectedTab,
  setSelectedTab,
  theme,
  setTheme,
  zoomAmount,
  setZoomAmount,
  showComparison,
  setShowComparison,
}: TopBarProps) => {
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const zoomWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (zoomWrapRef.current && !zoomWrapRef.current.contains(e.target as Node)) {
        setShowZoomMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const navButtonStyle = (active: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 12px",
    borderRadius: 9,
    border: "none",
    background: active ? "var(--accent-tint)" : "transparent",
    color: active ? "var(--accent)" : "var(--ink-2)",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: fontStack,
    transition: "background 0.15s ease, color 0.15s ease",
  });

  return (
    <div
      style={{
        height: 56,
        minHeight: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 20px",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border)",
        fontFamily: fontStack,
        flexShrink: 0,
        zIndex: 30,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <img
          src="public:///logo.png"
          alt="Symp's Upscale"
          style={{ height: 40, width: "auto", objectFit: "contain" }}
          draggable={false}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Prévisualisations — toggle comparison view + zoom dropdown */}
      <div ref={zoomWrapRef} style={{ position: "relative" }}>
        <button
          style={navButtonStyle(showComparison)}
          onClick={() => {
            setShowComparison(!showComparison);
            setShowZoomMenu((v) => !v);
          }}
        >
          <EyeIcon />
          <span>Prévisualisations</span>
          <ChevronDown />
        </button>
        {showZoomMenu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              minWidth: 180,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              boxShadow: "var(--shadow)",
              padding: 6,
              zIndex: 100,
            }}
          >
            {ZOOM_OPTIONS.map((opt) => {
              const active = zoomAmount === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setZoomAmount(opt.value);
                    setShowZoomMenu(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    borderRadius: 7,
                    border: "none",
                    background: active ? "var(--accent-tint)" : "transparent",
                    color: active ? "var(--accent)" : "var(--ink-2)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: fontStack,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Paramètres — toggle on/off */}
      <button
        style={navButtonStyle(selectedTab === 1)}
        onClick={() => setSelectedTab(selectedTab === 1 ? 0 : 1)}
      >
        <GearIcon />
        <span>Paramètres</span>
      </button>

      {/* Theme toggle */}
      <button
        aria-label="Toggle theme"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 38,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          color: "var(--ink-2)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>

    </div>
  );
};

export default TopBar;
