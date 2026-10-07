"use client";
import React, { useCallback, useRef } from "react";
import { userFileUrl } from "@/lib/asset-url";

/**
 * A pannable, zoomable image pane.
 *
 * The previous "zoom" was a Tailwind class built at runtime
 * (`group-hover:scale-[${n}%]`), which Tailwind cannot generate — it scans
 * source statically, so that class never existed and the control did nothing.
 * This applies a real transform.
 *
 * Above 200% the browser's smoothing is turned off: the whole point of
 * zooming past 1:1 here is to inspect what the model actually produced, and
 * interpolated pixels would hide exactly that.
 */

export type Pan = { x: number; y: number };

const PIXELATE_ABOVE = 200;

export default function ZoomView({
  imagePath,
  zoom,
  pan,
  setPan,
  setZoom,
  onDimensions,
  onError,
  minZoom = 25,
  maxZoom = 1600,
}: {
  imagePath: string;
  /** Percentage, or "fit" to letterbox the whole image. */
  zoom: number | "fit";
  pan: Pan;
  setPan: (p: Pan) => void;
  setZoom?: (z: number) => void;
  onDimensions?: (d: { width: number; height: number }) => void;
  onError?: () => void;
  minZoom?: number;
  maxZoom?: number;
}) {
  const dragging = useRef<{ x: number; y: number; pan: Pan } | null>(null);
  const isFit = zoom === "fit";

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isFit) return;
      dragging.current = { x: e.clientX, y: e.clientY, pan };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [isFit, pan],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragging.current;
      if (!d) return;
      setPan({
        x: d.pan.x + (e.clientX - d.x),
        y: d.pan.y + (e.clientY - d.y),
      });
    },
    [setPan],
  );

  const endDrag = useCallback((e: React.PointerEvent) => {
    dragging.current = null;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!setZoom) return;
      // Only take over the wheel when the user means to zoom, so a trackpad
      // two-finger scroll still behaves like scrolling elsewhere.
      if (!e.ctrlKey && !e.metaKey && !e.altKey) return;
      const current = isFit ? 100 : (zoom as number);
      const next = Math.round(current * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
      setZoom(Math.min(maxZoom, Math.max(minZoom, next)));
    },
    [setZoom, isFit, zoom, minZoom, maxZoom],
  );

  const factor = isFit ? 1 : (zoom as number) / 100;

  return (
    <div
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
        cursor: isFit ? "default" : dragging.current ? "grabbing" : "grab",
        touchAction: "none",
        background: "var(--bg-sunken)",
      }}
    >
      <img
        src={userFileUrl(imagePath)}
        alt=""
        draggable={false}
        onError={onError}
        onLoad={(e) =>
          onDimensions?.({
            width: e.currentTarget.naturalWidth,
            height: e.currentTarget.naturalHeight,
          })
        }
        style={
          isFit
            ? { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }
            : {
                maxWidth: "none",
                maxHeight: "none",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${factor})`,
                transformOrigin: "center center",
                imageRendering:
                  (zoom as number) > PIXELATE_ABOVE ? "pixelated" : "auto",
                // Panning must track the cursor exactly; a transition here
                // would make the image lag behind the hand.
                transition: dragging.current ? "none" : "transform 0.12s ease-out",
              }
        }
      />
    </div>
  );
}
