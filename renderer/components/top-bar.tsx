"use client";
import React, { useState, useRef, useEffect } from "react";
import { publicAssetUrl } from "@/lib/asset-url";

type TopBarProps = {
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

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.2-4.2M8 11h6M11 8v6" />
  </svg>
);

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

/** Zoom is a multiplier on the fitted size: 100% is the whole picture,
 *  400% is four times into it. Both panes use the same value, which is what
 *  keeps them framing the same detail despite very different resolutions. */
const ZOOM_STOPS = [100, 200, 400, 800, 1600];
const ZOOM_MIN = ZOOM_STOPS[0];
const ZOOM_MAX = ZOOM_STOPS[ZOOM_STOPS.length - 1];

/** Slider position <-> zoom, on a log scale: a linear 25..1600 slider would
 *  spend four fifths of its travel above 400%. */
const toSlider = (z: number) =>
  ((Math.log(z) - Math.log(ZOOM_MIN)) /
    (Math.log(ZOOM_MAX) - Math.log(ZOOM_MIN))) *
  1000;
const fromSlider = (v: number) =>
  Math.round(
    Math.exp(
      Math.log(ZOOM_MIN) +
        (v / 1000) * (Math.log(ZOOM_MAX) - Math.log(ZOOM_MIN)),
    ),
  );

const fontStack = "var(--symp-font, Geist, -apple-system, sans-serif)";

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "5px 9px",
  borderRadius: 7,
  border: `1px solid ${active ? "transparent" : "var(--border-2)"}`,
  background: active ? "var(--accent)" : "transparent",
  color: active ? "var(--accent-ink)" : "var(--ink-2)",
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: fontStack,
});

const TopBar = ({
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
          src={publicAssetUrl(theme === "dark" ? "logo-dark.png" : "logo.png")}
          alt="Symp's Upscale"
          /* Must sit inside the 56px bar: at full height it was clipped top
             and bottom. The dark variant exists because the navy mark
             disappears against a near-black background. */
          style={{ height: 34, width: "auto", objectFit: "contain" }}
          draggable={false}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Prévisualisations — toggle comparison view + zoom dropdown */}
      <div ref={zoomWrapRef} style={{ position: "relative" }}>
        <button
          style={navButtonStyle(zoomAmount !== "fit")}
          onClick={() => setShowZoomMenu((v) => !v)}
          title="Zoom et déplacement dans l'aperçu"
        >
          <SearchIcon />
          <span>
            Zoom
            <span style={{ marginLeft: 6, opacity: 0.75, fontFamily: "var(--symp-mono, monospace)" }}>
              {zoomAmount === "fit" ? "ajusté" : `${zoomAmount}\u202f%`}
            </span>
          </span>
          <ChevronDown />
        </button>
        {showZoomMenu && (
          <div
            className="symp-menu-in"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 264,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "var(--shadow-pop)",
              padding: 14,
              zIndex: 100,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                Zoom
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--accent)", fontFamily: "var(--symp-mono, monospace)" }}>
                {zoomAmount === "fit" ? "Ajusté" : `${zoomAmount}\u202f%`}
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={toSlider(zoomAmount === "fit" ? 100 : Number(zoomAmount))}
              onChange={(e) => setZoomAmount(String(fromSlider(Number(e.target.value))))}
              style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
              <button
                onClick={() => setZoomAmount("fit")}
                className="symp-press"
                style={chipStyle(zoomAmount === "fit")}
              >
                Ajuster
              </button>
              {ZOOM_STOPS.map((z) => (
                <button
                  key={z}
                  onClick={() => setZoomAmount(String(z))}
                  className="symp-press"
                  style={chipStyle(zoomAmount === String(z))}
                >
                  {z}&#8239;%
                </button>
              ))}
            </div>

            <p style={{ marginTop: 10, fontSize: 11, lineHeight: 1.45, color: "var(--ink-3)" }}>
              Glissez l&apos;image pour vous déplacer, double-clic pour recentrer.
              Au-delà de 200&#8239;% les pixels ne sont plus lissés.
            </p>
          </div>
        )}
      </div>

      {/* Comparaison — its own control. It used to share a button with the
          zoom menu, so opening the zoom silently switched the view. */}
      <button
        style={navButtonStyle(showComparison)}
        onClick={() => setShowComparison(!showComparison)}
        title="Superposer avant et après avec un curseur"
      >
        <EyeIcon />
        <span>Comparaison</span>
      </button>

      {/* Theme toggle — a track with a sliding thumb, so the state is
          visible at rest rather than only implied by which icon shows. */}
      <button
        aria-label={theme === "light" ? "Passer en thème sombre" : "Passer en thème clair"}
        title={theme === "light" ? "Thème sombre" : "Thème clair"}
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: 62,
          height: 32,
          padding: 3,
          borderRadius: 999,
          border: "1px solid var(--border-2)",
          background: "var(--bg-sunken)",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            left: theme === "light" ? 3 : 32,
            width: 26,
            height: 24,
            borderRadius: 999,
            background: "var(--bg-card)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
            transition: "left 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          }}
        />
        <span
          aria-hidden
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 29,
            height: 24,
            color: theme === "light" ? "var(--accent)" : "var(--ink-3)",
          }}
        >
          <SunIcon />
        </span>
        <span
          aria-hidden
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 29,
            height: 24,
            color: theme === "dark" ? "var(--accent)" : "var(--ink-3)",
          }}
        >
          <MoonIcon />
        </span>
      </button>

    </div>
  );
};

export default TopBar;
