import React from "react";
import SympLogo from "@/components/icons/symp-logo";

export default function Header({ version }: { version: string }) {
  return (
    <div
      style={{
        padding: "24px 18px 16px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}
    >
      <SympLogo size={28} subtitle={true} />
      <span
        style={{
          fontFamily: "var(--symp-mono, monospace)",
          fontSize: 10.5,
          color: "var(--symp-ink-3, #6F6F75)",
          letterSpacing: "0.04em",
          paddingBottom: 4,
        }}
      >
        v{version}
      </span>
    </div>
  );
}
