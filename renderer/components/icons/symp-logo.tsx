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

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: size * 0.2,
        userSelect: "none",
      }}
    >
      <img
        src="public:///icone.png"
        alt="Symp's Upscale"
        style={{ width: size * 1.1, height: size * 1.1, objectFit: "contain" }}
        draggable={false}
      />
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
