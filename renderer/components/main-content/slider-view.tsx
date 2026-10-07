"use client";
import React, { useCallback, useRef, useState } from "react";
import {
  ReactCompareSlider,
  ReactCompareSliderHandle,
} from "react-compare-slider";
import { useAtom } from "jotai";
import { userFileUrl } from "@/lib/asset-url";
import { panAtom, zoomAtom } from "@/atoms/user-settings-atom";

/**
 * Before/after wipe, sharing the zoom and pan of the side-by-side view.
 *
 * The zoom here used to be a Tailwind class built at runtime
 * (`group-hover:scale-[${n}%]`), which Tailwind never generates, so the
 * comparison could not be zoomed at all. Both halves now take the same
 * transform as the two panes, which is what makes a wipe worth anything:
 * the cursor has to cross the *same* detail on both sides.
 */

function Half({
  imagePath,
  label,
  align,
  factor,
  pannable,
  pan,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  boxRef,
  dragging,
}: {
  imagePath: string;
  label: string;
  align: "left" | "right";
  factor: number;
  pannable: boolean;
  pan: { x: number; y: number };
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  boxRef?: React.Ref<HTMLDivElement>;
  dragging: boolean;
}) {
  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-sunken)",
        touchAction: "none",
        cursor: pannable ? (dragging ? "grabbing" : "grab") : "default",
      }}
    >
      <img
        src={userFileUrl(imagePath)}
        alt={label}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: `translate(${pan.x * 100}%, ${pan.y * 100}%) scale(${factor})`,
          transformOrigin: "center center",
          imageRendering: factor > 1 ? "pixelated" : "auto",
          transition: dragging ? "none" : "transform 0.14s ease-out",
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: 10,
          [align]: 10,
          padding: "3px 9px",
          borderRadius: 7,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          background: "rgba(11,18,32,0.62)",
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        {label}
      </span>
    </div>
  );
}

const SliderView = ({
  imagePath,
  upscaledImagePath,
}: {
  imagePath: string;
  upscaledImagePath: string;
}) => {
  const [zoom] = useAtom(zoomAtom);
  const [pan, setPan] = useAtom(panAtom);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pan: typeof pan } | null>(null);
  const [dragging, setDragging] = useState(false);

  const isFit = zoom === "fit";
  const factor = isFit ? 1 : (zoom as number) / 100;

  const down = useCallback(
    (e: React.PointerEvent) => {
      if (isFit) return;
      e.stopPropagation();
      drag.current = { x: e.clientX, y: e.clientY, pan };
      setDragging(true);
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    },
    [isFit, pan],
  );

  const move = useCallback(
    (e: React.PointerEvent) => {
      const d = drag.current;
      const el = box.current;
      if (!d || !el) return;
      e.stopPropagation();
      setPan({
        x: d.pan.x + (e.clientX - d.x) / el.clientWidth,
        y: d.pan.y + (e.clientY - d.y) / el.clientHeight,
      });
    },
    [setPan],
  );

  const up = useCallback((e: React.PointerEvent) => {
    drag.current = null;
    setDragging(false);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <ReactCompareSlider
      style={{ height: "100%", width: "100%" }}
      /* Zoomed in, the image area belongs to panning and only the handle
         moves the divider. Fitted, there is nothing to pan, so the whole
         area keeps moving the divider rather than feeling dead. */
      onlyHandleDraggable={!isFit}
      handle={
        <ReactCompareSliderHandle
          /* It now carries the whole job of moving the divider, so it needs
             to be worth aiming at. */
          buttonStyle={{
            width: 44,
            height: 44,
            backdropFilter: "none",
            background: "rgba(255,255,255,0.92)",
            color: "#0B1220",
            border: 0,
            boxShadow: "0 2px 10px rgba(11,18,32,0.35)",
          }}
          linesStyle={{ width: 2, opacity: 0.85 }}
        />
      }
      itemOne={
        <Half
          imagePath={imagePath}
          label="Avant"
          align="left"
          factor={factor}
          pannable={!isFit}
          pan={pan}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          boxRef={box}
          dragging={dragging}
        />
      }
      itemTwo={
        <Half
          imagePath={upscaledImagePath}
          label="Après"
          align="right"
          factor={factor}
          pannable={!isFit}
          pan={pan}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          dragging={dragging}
        />
      }
    />
  );
};

export default SliderView;
