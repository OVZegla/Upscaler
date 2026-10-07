"use client";
import React, { useEffect, useState } from "react";
import { publicAssetUrl } from "@/lib/asset-url";
import { useAtomValue } from "jotai";
import { themeAtom } from "@/atoms/user-settings-atom";

interface SympLogoProps {
  /** Height of the mark, in pixels. */
  size?: number;
  /** Kept for callers that only want the square app icon, without the wordmark. */
  subtitle?: boolean;
  className?: string;
}

/**
 * The Symp's Upscale mark.
 *
 * `logo.png` is the full wordmark (bracket + "Symp's Upscale"); `icone.png` is
 * the square app icon. Both are bundled frontend assets, so their URL has to go
 * through `publicAssetUrl` — Electron serves them over a `public://` protocol
 * that does not exist under Tauri, where a hard-coded one silently 404s.
 */
const SympLogo = ({ size = 28, subtitle = true, className }: SympLogoProps) => {
  const [src, setSrc] = useState("");
  const theme = useAtomValue(themeAtom);

  // Resolved after mount: the runtime isn't known during the static export.
  useEffect(() => {
    setSrc(
      publicAssetUrl(
        subtitle ? (theme === "dark" ? "logo-dark.png" : "logo.png") : "icone.png",
      ),
    );
  }, [subtitle, theme]);

  if (!src) {
    // Hold the layout so nothing jumps when the image resolves.
    return (
      <span
        className={className}
        aria-hidden
        style={{ display: "inline-block", height: size * 1.6, width: subtitle ? size * 3.5 : size * 1.6 }}
      />
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt="Symp's Upscale"
      draggable={false}
      style={{
        height: subtitle ? size * 1.6 : size * 1.1,
        width: "auto",
        objectFit: "contain",
        userSelect: "none",
      }}
    />
  );
};

export default SympLogo;
