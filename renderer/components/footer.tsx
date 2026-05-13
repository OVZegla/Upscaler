import React from "react";

function Footer() {
  return (
    <div
      style={{
        padding: "12px 18px",
        borderTop: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "var(--symp-mono, monospace)",
        fontSize: 10,
        color: "var(--symp-ink-3, #6F6F75)",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span>symp&apos;s upscale</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#36c66b",
            boxShadow: "0 0 0 3px rgba(54,198,107,0.18)",
            flexShrink: 0,
          }}
        />
        gpu ready
      </span>
    </div>
  );
}

export default Footer;
