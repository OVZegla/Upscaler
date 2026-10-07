"use client";
import React, { useEffect, useState } from "react";
import { publicAssetUrl } from "@/lib/asset-url";
import { APP_VERSION_SHORT } from "@common/app-version";

/**
 * Launch animation.
 *
 * The app takes a moment to wake up (webview, shim, settings); showing the
 * mark instead of a bare window makes that wait feel deliberate. It is purely
 * decorative: it sits on top of an app that is already interactive, dismisses
 * itself, and can be clicked away.
 */

const TOTAL_MS = 2200;
const FADE_MS = 420;

export default function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const [logo, setLogo] = useState("");
  const [dark, setDark] = useState(false);

  // The asset URL depends on the runtime (Tauri vs Electron), which isn't
  // known during the static export — resolve it once mounted.
  //
  // The theme is read straight from storage rather than from the atom: this
  // screen is mounted outside the jotai Provider, deliberately, so that it
  // shows even if the app below fails to start.
  useEffect(() => {
    let isDark = false;
    try {
      isDark = JSON.parse(localStorage.getItem("theme") ?? '"light"') === "dark";
    } catch {
      /* storage can be unavailable; light is the safe default */
    }
    setDark(isDark);
    setLogo(publicAssetUrl(isDark ? "logo-dark.png" : "logo.png"));
  }, []);

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
        gap: 22,
        background: dark ? "#0B0F17" : "#F6F7F9",
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
          background: dark ? "rgba(238,242,248,0.18)" : "rgba(11,18,32,0.16)",
          overflow: "hidden",
        }}
      >
        <div
          className="symp-splash-bar"
          style={{
            height: "100%",
            width: "100%",
            borderRadius: 999,
            background: dark
              ? "linear-gradient(90deg, #5B8DEF, #FF5C62)"
              : "linear-gradient(90deg, #0A2F7A, #D01217)",
            transformOrigin: "left center",
          }}
        />
      </div>

      {/* The release, arriving last so it reads as the point of the screen. */}
      <div
        className="symp-splash-version"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginTop: -8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: dark ? "#7A869A" : "#78839A",
          }}
        >
          Version
        </span>
        <span
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            background: dark
              ? "linear-gradient(90deg, #5B8DEF, #FF5C62)"
              : "linear-gradient(90deg, #0A2F7A, #D01217)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {APP_VERSION_SHORT}
        </span>
      </div>
    </div>
  );
}
