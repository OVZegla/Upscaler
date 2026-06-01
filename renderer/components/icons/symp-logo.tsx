import React from "react";

interface SympLogoProps {
  size?: number;
  subtitle?: boolean;
  color?: string;
  accent?: string;
  className?: string;
}

const SympLogo = ({
  size = 28,
  subtitle = true,
  color,
  className,
}: SympLogoProps) => {
  const ink = color || "var(--symp-ink, #0E0E0F)";
  const NAVY = "#1A1B78";
  const RED = "#D20A14";

  // Scale factor — all coords are designed at size=48
  const s = size / 48;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: size * 0.18,
        userSelect: "none",
      }}
    >
      {/* Arrow icon — matches the app icon design */}
      <svg
        width={size * 1.15}
        height={size * 0.95}
        viewBox="0 0 60 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top blue parallelogram line */}
        <polygon points="3,9.5 57,6.5 57,10.5 3,13.5" fill={NAVY} />
        {/* Bottom red parallelogram line */}
        <polygon points="3,39 57,36 57,40 3,43" fill={RED} />
        {/* Arrow body: straight left edge (tail-left→tip), step notch on right
            Scaled from 1024px icon: tip(692,258) outer(855,368) step-v(855,488)
            notch(680,488) shaft-br(452,737) tail-bl(298,737) */}
        <polygon
          points="40.6,12.5 50.2,18.0 50.2,23.8 39.9,23.8 26.5,36.0 17.5,36.0"
          fill={NAVY}
        />
      </svg>

      {subtitle && (
        <div
          style={{
            fontFamily: "var(--symp-font, Geist, sans-serif)",
            fontWeight: 700,
            fontSize: size * 0.38,
            letterSpacing: "0.05em",
            color: ink,
            lineHeight: 1,
            paddingLeft: 1,
          }}
        >
          SYMP'S UPSCALE
        </div>
      )}
    </div>
  );
};

export default SympLogo;
