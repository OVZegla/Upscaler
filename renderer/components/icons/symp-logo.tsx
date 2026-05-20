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
  accent,
  className,
}: SympLogoProps) => {
  const ink = color || "currentColor";
  const acc = accent || "var(--symp-accent, #0055A4)";

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontFamily: "var(--symp-font, Geist, sans-serif)",
          fontWeight: 800,
          fontSize: size,
          letterSpacing: "-0.045em",
          color: ink,
          lineHeight: 0.95,
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        <span>symp</span>
        <span style={{ position: "relative", display: "inline-block" }}>
          {/* the apostrophe — red-orange tick, like the logo */}
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: size * 0.12,
              height: size * 0.32,
              background: acc,
              transform: "skewX(-12deg)",
              borderRadius: 1,
              marginLeft: size * 0.05,
              marginRight: size * 0.02,
              verticalAlign: "top",
            }}
          />
        </span>
        <span>s</span>
      </div>
      {subtitle && (
        <div
          style={{
            fontFamily: "var(--symp-font, Geist, sans-serif)",
            fontWeight: 500,
            fontSize: size * 0.32,
            letterSpacing: "0.42em",
            color: ink,
            opacity: 0.95,
            marginTop: size * 0.18,
            paddingLeft: 1,
          }}
        >
          UPSCALE
        </div>
      )}
    </div>
  );
};

export default SympLogo;
