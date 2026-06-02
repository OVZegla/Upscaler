import React from "react";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 4px",
        fontFamily: "var(--symp-mono, monospace)",
        fontSize: 10,
        fontWeight: 600,
        background: "var(--symp-panel, #fff)",
        color: "var(--symp-ink-2, #3A3A3D)",
        border: "1px solid var(--symp-line-2, rgba(14,14,15,0.14))",
        borderBottomWidth: 2,
        borderRadius: 5,
      }}
    >
      {children}
    </span>
  );
}

function InstructionsCard({
  version,
  batchMode,
}: {
  version?: string;
  batchMode: boolean;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(640px, 92%)",
          aspectRatio: "4 / 3",
          borderRadius: 20,
          border: "2px dashed var(--symp-line-2, rgba(14,14,15,0.14))",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          transition: "all 0.2s ease",
        }}
      >
        {/* App icon in drop zone */}
        <div
          style={{
            width: 72,
            height: 72,
            marginBottom: 6,
          }}
        >
          <img
            src="/sympsupscale.png"
            alt="Symp's Upscale"
            style={{ width: 72, height: 72, objectFit: "contain" }}
          />
        </div>

        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--symp-ink, #0E0E0F)",
            textAlign: "center",
          }}
        >
          {batchMode ? "Drop a folder of images" : "Drop an image to start"}
        </div>

        <div
          style={{
            fontSize: 13,
            color: "var(--symp-ink-3, #6F6F75)",
            textAlign: "center",
            maxWidth: 360,
            lineHeight: 1.5,
          }}
        >
          Or paste from clipboard, or open from the sidebar. Symp&apos;s
          Upscale runs the model locally on your GPU — nothing leaves your
          machine.
        </div>

        {/* Format chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["PNG", "JPG", "WEBP", "TIFF"].map((f) => (
            <span
              key={f}
              style={{
                fontFamily: "var(--symp-mono, monospace)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.08em",
                padding: "4px 8px",
                borderRadius: 999,
                color: "var(--symp-ink-3, #6F6F75)",
                background: "var(--symp-bg-2, #F2F0EC)",
                border: "1px solid var(--symp-line, rgba(14,14,15,0.08))",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Keyboard shortcut hint */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            right: 18,
            fontFamily: "var(--symp-mono, monospace)",
            fontSize: 10,
            color: "var(--symp-ink-3, #6F6F75)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Kbd>⌘</Kbd>
          <Kbd>V</Kbd>
          <span style={{ opacity: 0.7, marginLeft: 2 }}>to paste</span>
        </div>
      </div>
    </div>
  );
}

export default InstructionsCard;
