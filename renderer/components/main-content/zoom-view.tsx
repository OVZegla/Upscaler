"use client";
import React, { useCallback, useRef, useState } from "react";
import { userFileUrl } from "@/lib/asset-url";

/**
 * A pannable, zoomable image pane.
 *
 * Zoom is a multiplier on the *fitted* size, not an absolute pixel scale, and
 * pan is a fraction of the pane rather than a pixel offset. That is what lets
 * the "avant" and "après" panes frame the same part of the picture: they hold
 * images of wildly different resolutions — 1254px against 20064px is normal
 * here — so a shared pixel offset would land them in completely different
 * places, which is exactly what it did.
 *
 * Smoothing is turned off once a pane is drawn above its own native
 * resolution, so going past 1:1 shows the pixels the model produced rather
 * than the browser's interpolation of them. That threshold is per pane: at the
 * same zoom the small image is past 1:1 long before the large one.
 */

export type Pan = { x: number; y: number };

export default function ZoomView({
  imagePath,
  zoom,
  pan,
  setPan,
  setZoom,
  onDimensions,
  onError,
  minZoom = 100,
  maxZoom = 1600,
}: {
  imagePath: string;
  /** "fit", or a percentage of the fitted size: 400 means four times into it. */
  zoom: number | "fit";
  pan: Pan;
  setPan: (p: Pan) => void;
  setZoom?: (z: number) => void;
  onDimensions?: (d: { width: number; height: number }) => void;
  onError?: () => void;
  minZoom?: number;
  maxZoom?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pan: Pan } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const isFit = zoom === "fit";
  const factor = isFit ? 1 : (zoom as number) / 100;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isFit) return;
      drag.current = { x: e.clientX, y: e.clientY, pan };
      setIsDragging(true);
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    },
    [isFit, pan],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      const el = box.current;
      if (!d || !el) return;
      // Pixels dragged become a fraction of this pane, so the other pane —
      // same size on screen, different resolution — moves by the same amount.
      setPan({
        x: d.pan.x + (e.clientX - d.x) / el.clientWidth,
        y: d.pan.y + (e.clientY - d.y) / el.clientHeight,
      });
    },
    [setPan],
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    drag.current = null;
    setIsDragging(false);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!setZoom) return;
      // Only hijack the wheel when the user clearly means to zoom.
      if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
      const current = isFit ? 100 : (zoom as number);
      const next = Math.round(current * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      setZoom(Math.min(maxZoom, Math.max(minZoom, next)));
    },
    [setZoom, isFit, zoom, minZoom, maxZoom],
  );

  // Past its own native resolution, interpolation would hide the very detail
  // the zoom exists to inspect.
  const el = box.current;
  const drawnWider =
    natural && el
      ? (Math.min(el.clientWidth / natural.w, el.clientHeight / natural.h) *
          factor) >
        1
      : false;

  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={onWheel}
      onDoubleClick={() => setPan({ x: 0, y: 0 })}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: isFit ? "default" : isDragging ? "grabbing" : "grab",
        touchAction: "none",
        background: "var(--bg-sunken)",
      }}
    >
      <img
        src={userFileUrl(imagePath)}
        alt=""
        draggable={false}
        onError={onError}
        onLoad={(e) => {
          setNatural({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          });
          onDimensions?.({
            width: e.currentTarget.naturalWidth,
            height: e.currentTarget.naturalHeight,
          });
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          // Translate is in percent of the pane and applied after the scale,
          // so one drag moves both panes over the same part of the picture.
          transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${factor})`,
          transformOrigin: "center center",
          imageRendering: drawnWider ? "pixelated" : "auto",
          transition: isDragging ? "none" : "transform 0.14s ease-out",
        }}
      />
    </div>
  );
}
