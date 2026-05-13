import React, { useEffect, useState } from "react";
import { ELECTRON_COMMANDS } from "@common/electron-commands";
import useLogger from "../hooks/use-logger";

function ProgressBar({
  progress,
  doubleUpscaylCounter,
  batchMode,
  resetImagePaths,
}: {
  progress: string;
  doubleUpscaylCounter: number;
  batchMode: boolean;
  resetImagePaths: () => void;
}) {
  const [batchProgress, setBatchProgress] = useState(0);
  const logit = useLogger();

  useEffect(() => {
    const progressString = progress.trim().replace(/\n/g, "");
    if (progressString.includes("Successful")) {
      setBatchProgress((prev) => prev + 1);
    }
  }, [progress]);

  const stopHandler = () => {
    window.electron.send(ELECTRON_COMMANDS.STOP);
    logit("🛑 Stopping Upscayl");
  };

  const numericPct = (() => {
    const m = progress.match(/(\d+(?:\.\d+)?)%/);
    return m ? parseFloat(m[1]) : null;
  })();

  const phase = (() => {
    if (!progress || progress === "Hold on...") return "Loading model";
    if (progress.includes("convert") || progress.includes("Convert"))
      return "Scaling and converting";
    if (progress.includes("Successful")) return "Finalizing";
    if (numericPct !== null) {
      if (numericPct < 10) return "Loading model";
      if (numericPct < 30) return "Tiling input";
      if (numericPct < 75) return "Inferring";
      if (numericPct < 95) return "Scaling and converting";
      return "Finalizing";
    }
    return progress;
  })();

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        gap: 36,
        background: "var(--symp-bg, #FAF9F7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Tile preview area */}
      <div
        style={{
          position: "relative",
          width: "min(580px, 86%)",
          aspectRatio: "3 / 2",
          borderRadius: 12,
          background:
            "repeating-linear-gradient(135deg, #d6d3cc 0 6px, #c6c3bc 6px 11px)",
          overflow: "hidden",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.4) inset, 0 16px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Sweep light */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: 220,
            background:
              "linear-gradient(90deg, transparent, rgba(232,76,38,0.16) 50%, transparent)",
            animation: "symp-sweep 1.8s ease-in-out infinite",
            mixBlendMode: "screen",
            pointerEvents: "none",
            borderRadius: 12,
          }}
        />
        {/* Tile grid overlay */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 600 400"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {[1, 2, 3].map((i) => (
            <line
              key={"v" + i}
              x1={(600 / 4) * i}
              y1="0"
              x2={(600 / 4) * i}
              y2="400"
              stroke="rgba(232,76,38,0.4)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
          {[1, 2].map((i) => (
            <line
              key={"h" + i}
              x1="0"
              y1={(400 / 3) * i}
              x2="600"
              y2={(400 / 3) * i}
              stroke="rgba(232,76,38,0.4)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}
        </svg>

        {batchMode && batchProgress > 0 && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              fontFamily: "var(--symp-mono, monospace)",
              fontSize: 10,
              fontWeight: 600,
              color: "rgba(58,58,61,0.8)",
              background: "rgba(255,255,255,0.6)",
              padding: "4px 8px",
              borderRadius: 6,
              backdropFilter: "blur(8px)",
            }}
          >
            {batchProgress} done
          </div>
        )}
      </div>

      {/* Status + progress */}
      <div
        style={{
          width: "min(580px, 86%)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 18,
                background: "var(--symp-accent, #E84C26)",
                transform: "skewX(-15deg)",
                borderRadius: 1,
                animation: "symp-pulse 1.2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "var(--symp-ink, #0E0E0F)",
              }}
            >
              {phase}
            </span>
          </div>
          {numericPct !== null && (
            <span
              style={{
                fontFamily: "var(--symp-mono, monospace)",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--symp-ink, #0E0E0F)",
              }}
            >
              {numericPct.toFixed(1).padStart(4, "0")}%
            </span>
          )}
        </div>

        {/* Progress track */}
        <div
          style={{
            width: "100%",
            height: 6,
            borderRadius: 999,
            background: "var(--symp-bg-2, #F2F0EC)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width:
                numericPct !== null
                  ? numericPct + "%"
                  : progress.includes("Successful")
                  ? "100%"
                  : "30%",
              height: "100%",
              background:
                "linear-gradient(90deg, var(--symp-accent, #E84C26), var(--symp-accent-2, #FF6A3D))",
              transition: "width 0.12s linear",
              boxShadow: "0 0 12px rgba(232,76,38,0.5)",
            }}
          />
        </div>

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--symp-mono, monospace)",
            fontSize: 10.5,
            color: "var(--symp-ink-3, #6F6F75)",
          }}
        >
          <span>
            {doubleUpscaylCounter > 0
              ? `pass ${doubleUpscaylCounter}`
              : "processing"}
          </span>
          <button
            onClick={stopHandler}
            style={{
              appearance: "none",
              background: "transparent",
              border: 0,
              padding: 0,
              color: "var(--symp-ink-3, #6F6F75)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 10.5,
              textDecoration: "underline",
            }}
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProgressBar;
