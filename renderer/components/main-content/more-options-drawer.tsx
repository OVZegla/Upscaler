import { translationAtom } from "@/atoms/translations-atom";
import {
  lensSizeAtom,
  userStatsAtom,
  viewTypeAtom,
} from "@/atoms/user-settings-atom";
import { useAtom, useAtomValue } from "jotai";
import { useState, useEffect } from "react";
import useSystemInfo from "../hooks/use-system-info";

const LEFT_NAV_WIDTH = 220;
const DRAWER_WIDTH = 380;

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const MoreOptionsDrawer = ({
  zoomAmount,
  setZoomAmount,
  resetImagePaths,
}: {
  zoomAmount: string;
  setZoomAmount: (arg: any) => void;
  resetImagePaths: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [viewType, setViewType] = useAtom(viewTypeAtom);
  const [lensSize, setLensSize] = useAtom(lensSizeAtom);
  const t = useAtomValue(translationAtom);
  const userStats = useAtomValue(userStatsAtom);
  const { systemInfo } = useSystemInfo();

  useEffect(() => {
    if (!localStorage.getItem("zoomAmount")) {
      localStorage.setItem("zoomAmount", zoomAmount);
    } else {
      setZoomAmount(localStorage.getItem("zoomAmount"));
    }
  }, []);

  return (
    <>
      {/* Trigger button: always visible at left edge of center content */}
      <div
        onDoubleClick={(e) => e.stopPropagation()}
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          left: LEFT_NAV_WIDTH,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 60,
          cursor: "pointer",
          background: "var(--symp-panel, #FFFFFF)",
          border: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
          borderLeft: "none",
          borderRadius: "0 8px 8px 0",
          padding: "12px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "2px 0 8px rgba(0,0,0,0.06)",
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--symp-bg-2, #F2F0EC)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--symp-panel, #FFFFFF)")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: "var(--symp-ink-2, #3A3A3D)",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
        </svg>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 49 }}
          onClick={() => setOpen(false)}
          onDoubleClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Drawer: slides in from left, after the nav */}
      <div
        onDoubleClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: open ? LEFT_NAV_WIDTH + 36 : -(DRAWER_WIDTH + 10),
          top: 0,
          zIndex: 50,
          height: "100vh",
          width: DRAWER_WIDTH,
          background: "var(--symp-panel, #FFFFFF)",
          borderRight: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
          boxShadow: open ? "4px 0 24px rgba(0,0,0,0.10)" : "none",
          transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Reset button */}
          <button
            style={{
              width: "100%",
              background: "#0055A4",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "12px 0",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
            onClick={resetImagePaths}
          >
            {t("APP.MORE_OPTIONS_DRAWER.RESET_BUTTON_TITLE")}
          </button>

          {/* Lens / Slider toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--symp-ink, #0E0E0F)" }}>
              {t("APP.MORE_OPTIONS_DRAWER.LENS_VIEW_TITLE")}
            </span>
            <div
              onClick={() => setViewType(viewType === "slider" ? "lens" : "slider")}
              style={{
                width: 36,
                height: 20,
                borderRadius: 10,
                background: viewType === "slider" ? "#0055A4" : "rgba(14,14,15,0.18)",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s ease",
                flexShrink: 0,
              }}
            >
              <div style={{
                position: "absolute",
                top: 2,
                left: viewType === "slider" ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.18s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--symp-ink, #0E0E0F)" }}>
              {t("APP.MORE_OPTIONS_DRAWER.SLIDER_VIEW_TITLE")}
            </span>
          </div>

          {/* Zoom slider */}
          {viewType !== "lens" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--symp-ink-2, #3A3A3D)" }}>
                {t("APP.MORE_OPTIONS_DRAWER.ZOOM_AMOUNT_TITLE")} ({zoomAmount}%)
              </span>
              <input
                type="range"
                min="100"
                max="1000"
                step={10}
                value={parseInt(zoomAmount)}
                onChange={(e) => {
                  setZoomAmount(e.target.value);
                  localStorage.setItem("zoomAmount", e.target.value);
                }}
                style={{ width: "100%", accentColor: "#0055A4" }}
              />
            </div>
          )}

          {/* Stats */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--symp-ink-3, #6F6F75)", marginBottom: 12 }}>
              Stats
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: t("APP.MORE_OPTIONS_DRAWER.TOTAL_UPSCAYLS"), value: userStats.totalUpscayls },
                { label: t("APP.MORE_OPTIONS_DRAWER.TOTAL_BATCH_UPSCAYLS"), value: userStats.batchUpscayls },
                { label: t("APP.MORE_OPTIONS_DRAWER.TOTAL_IMAGE_UPSCAYLS"), value: userStats.imageUpscayls },
                { label: t("APP.MORE_OPTIONS_DRAWER.TOTAL_DOUBLE_UPSCAYLS"), value: userStats.doubleUpscayls },
                { label: t("APP.MORE_OPTIONS_DRAWER.AVERAGE_UPSCAYL_TIME"), value: formatDuration(userStats.averageUpscaylTime / 1000) },
                { label: t("APP.MORE_OPTIONS_DRAWER.LAST_UPSCAYL_DURATION"), value: formatDuration(userStats.lastUpscaylDuration / 1000) },
                { label: t("APP.MORE_OPTIONS_DRAWER.LAST_USED_AT"), value: new Date(userStats.lastUsedAt).toLocaleString() },
              ].map((stat, i, arr) => (
                <div key={stat.label} style={{
                  padding: "10px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--symp-line, rgba(14,14,15,0.08))" : "none",
                }}>
                  <div style={{ fontSize: 11, color: "var(--symp-ink-3, #6F6F75)", marginBottom: 2 }}>{stat.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--symp-ink, #0E0E0F)" }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MoreOptionsDrawer;
