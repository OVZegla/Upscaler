"use client";
import React, { useMemo, useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import {
  scaleAtom,
  doubleUpscaylAtom,
  customWidthAtom,
  useCustomWidthAtom,
} from "../atoms/user-settings-atom";
import { userFileUrl } from "@/lib/asset-url";
import ImageViewer from "./main-content/image-viewer";
import SliderView from "./main-content/slider-view";

const fontStack = "var(--symp-font, Geist, -apple-system, sans-serif)";

const ImagePlaceholderIcon = () => (
  <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

type PreviewPanelProps = {
  imagePath: string;
  upscaledImagePath: string;
  dimensions: { width: number | null; height: number | null };
  doubleUpscaylCounter: number;
  setDimensions: (d: { width: number; height: number }) => void;
  zoomAmount: string;
  showComparison?: boolean;
  fileInfo?: { size?: number; format?: string };
};

function useFileSize(filePath: string) {
  const [size, setSize] = useState<number | null>(null);
  useEffect(() => {
    if (!filePath) { setSize(null); return; }
    try {
      const fs = (window as any).require("fs");
      setSize(fs.statSync(filePath).size);
    } catch { setSize(null); }
  }, [filePath]);
  return size;
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["o", "Ko", "Mo", "Go"];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function megapixels(w?: number | null, h?: number | null) {
  if (!w || !h) return null;
  return (w * h) / 1e6;
}

const PreviewPanel = ({
  imagePath,
  upscaledImagePath,
  dimensions,
  setDimensions,
  zoomAmount,
  showComparison,
}: PreviewPanelProps) => {
  const scale = useAtomValue(scaleAtom);
  const inputSize = useFileSize(imagePath);
  const outputSize = useFileSize(upscaledImagePath);
  const doubleUpscayl = useAtomValue(doubleUpscaylAtom);
  const customWidth = useAtomValue(customWidthAtom);
  const useCustomWidth = useAtomValue(useCustomWidthAtom);

  const scaleInt = parseInt(scale) || 4;

  const outputDimensions = useMemo(() => {
    if (!dimensions.width || !dimensions.height) return null;
    if (useCustomWidth && customWidth > 0) {
      return {
        width: customWidth,
        height: Math.round(customWidth * (dimensions.height / dimensions.width)),
        factor: customWidth / dimensions.width,
      };
    }
    const factor = doubleUpscayl ? scaleInt * scaleInt : scaleInt;
    return {
      width: dimensions.width * factor,
      height: dimensions.height * factor,
      factor,
    };
  }, [dimensions, scaleInt, doubleUpscayl, useCustomWidth, customWidth]);

  const fileName = imagePath ? imagePath.split(/[\\/]/).pop() : "";
  const ext = imagePath ? (imagePath.split(".").pop() || "").toUpperCase() : "";

  const beforeMP = megapixels(dimensions.width, dimensions.height);
  const afterMP = outputDimensions ? megapixels(outputDimensions.width, outputDimensions.height) : null;


  const placeholder = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: "var(--ink-3)",
        background: "var(--bg)",
        borderRadius: 10,
        minHeight: 0,
      }}
    >
      <ImagePlaceholderIcon />
      <span style={{ fontSize: 12.5 }}>Aucune image</span>
    </div>
  );

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        overflow: "hidden",
        fontFamily: fontStack,
        minWidth: 0,
      }}
    >
      {/* Comparison slider (shown when Prévisualisations is active and upscaled image exists) */}
      {showComparison && imagePath && upscaledImagePath ? (
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <SliderView
            imagePath={imagePath}
            upscaledImagePath={upscaledImagePath}
            zoomAmount={zoomAmount}
          />
        </div>
      ) : showComparison && imagePath && !upscaledImagePath ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: 13, fontFamily: fontStack }}>
          Lancez l'upscale pour voir la comparaison
        </div>
      ) : null}

      {/* Before / After columns (hidden when comparison active) */}
      {!showComparison && <div style={{ flex: 1, display: "flex", gap: 16, padding: 20, overflow: "hidden", minHeight: 0 }}>
        {/* AVANT */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--ink-3)", textTransform: "uppercase" }}>
            Avant
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              boxShadow: "var(--shadow)",
              overflow: "hidden",
              display: "flex",
              minHeight: 0,
            }}
          >
            {imagePath ? (
              <ImageViewer imagePath={imagePath} setDimensions={setDimensions} />
            ) : (
              placeholder
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "var(--symp-mono, monospace)", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
              {dimensions.width && dimensions.height ? `${dimensions.width}×${dimensions.height} px` : "— px"}
            </span>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {beforeMP !== null ? `${beforeMP.toFixed(2)} MP` : "—"}
              {inputSize ? <span style={{ marginLeft: 8, opacity: 0.7 }}>{formatBytes(inputSize)}</span> : null}
            </span>
          </div>
        </div>

        {/* APRÈS (ESTIMÉ) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "var(--red)", textTransform: "uppercase" }}>
            Après (estimé)
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              boxShadow: "var(--shadow)",
              overflow: "hidden",
              display: "flex",
              minHeight: 0,
              position: "relative",
            }}
          >
            {upscaledImagePath ? (
              <img
                src={userFileUrl(upscaledImagePath)}
                draggable={false}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            ) : (
              placeholder
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontFamily: "var(--symp-mono, monospace)", fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>
              {outputDimensions ? `${outputDimensions.width}×${outputDimensions.height} px` : "— px"}
            </span>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {afterMP !== null && outputDimensions
                ? `${afterMP.toFixed(2)} MP (${outputDimensions.factor}x)`
                : "—"}
              {outputSize ? (
                <span style={{ marginLeft: 8, opacity: 0.7 }}>{formatBytes(outputSize)}</span>
              ) : null}
            </span>
          </div>
        </div>
      </div>}

      {/* Bottom status bar */}
      <div
        style={{
          height: 40,
          minHeight: 40,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-card)",
          fontSize: 12.5,
          color: "var(--ink-3)",
        }}
      >
        <span style={{ color: imagePath ? "var(--ink-2)" : "var(--ink-3)", fontWeight: imagePath ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 320 }}>
          {imagePath ? fileName : "Aucune image chargée"}
        </span>
        <span style={{ opacity: 0.4 }}>|</span>
        <span>Format : {imagePath ? (ext || "—") : "—"}</span>
      </div>
    </div>
  );
};

export default PreviewPanel;
