"use client";
import React, { useEffect, useState } from "react";
import { publicAssetUrl } from "@/lib/asset-url";

/**
 * Launch animation.
 *
 * The app takes a moment to wake up (webview, shim, settings); showing the
 * mark instead of a bare window makes that wait feel deliberate. It is purely
 * decorative: it sits on top of an app that is already interactive, dismisses
 * itself, and can be clicked away.
 */

const TOTAL_MS = 1750;
const FADE_MS = 420;

export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const [logo, setLogo] = useState("");

  // The asset URL depends on the runtime (Tauri vs Electron), which isn't
  // known during the static export — resolve it once mounted.
  useEffect(() => setLogo(publicAssetUrl("logo.png")), []);

  useEffect(() => {
    // Someone who asked for less motion gets a much shorter, still splash.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const hold = reduced ? 350 : TOTAL_MS;

    const t1 = setTimeout(() => setPhase("out"), hold);
    const t2 = setTimeout(() => setPhase("gone"), hold + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      onClick={() => setPhase("out")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        background: "var(--bg, #F4F6FA)",
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      {logo && (
        <img
          src={logo}
          alt=""
          draggable={false}
          className="symp-splash-logo"
          style={{ width: "min(360px, 56vw)", height: "auto", objectFit: "contain" }}
        />
      )}

      {/* A thin rule filling left to right: the upscale, in one gesture. */}
      <div
        style={{
          width: "min(360px, 56vw)",
          height: 3,
          borderRadius: 999,
          background: "var(--border-2, rgba(26,26,46,0.14))",
          overflow: "hidden",
        }}
      >
        <div
          className="symp-splash-bar"
          style={{
            height: "100%",
            width: "100%",
            borderRadius: 999,
            background: "linear-gradient(90deg, #0A2F7A, #D01217)",
            transformOrigin: "left center",
          }}
        />
      </div>
    </div>
  );
}
