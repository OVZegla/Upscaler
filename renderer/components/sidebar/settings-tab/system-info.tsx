"use client";
import React from "react";
import useSystemInfo from "@/components/hooks/use-system-info";
import { APP_VERSION } from "@common/app-version";
import { DEFAULT_MODEL_ID } from "@common/models-list";

/**
 * What to quote when reporting a problem.
 *
 * This used to print the raw keys the backend happened to return, so the
 * app's own version was missing while "release" showed the operating
 * system's, which reads as the app's to anyone not expecting it.
 */

const PLATFORM_LABEL: Record<string, string> = {
  win: "Windows",
  mac: "macOS",
  linux: "Linux",
};

export default function SystemInfo() {
  const { systemInfo } = useSystemInfo();

  const info = (systemInfo ?? {}) as Record<string, any>;
  const platform = PLATFORM_LABEL[info.platform] ?? info.platform ?? "—";
  const release = info.release ? `${platform} ${info.release}` : platform;

  const rows: [string, string][] = [
    ["Version", APP_VERSION],
    ["Modèle d'IA", DEFAULT_MODEL_ID],
    ["Système", release],
    ["Architecture", info.arch ?? "—"],
    ["Processeur", info.model || "—"],
    ["Cœurs", info.cpuCount ? String(info.cpuCount) : "—"],
  ];

  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          Informations système
        </span>
        <button
          onClick={() => navigator.clipboard?.writeText(text)}
          style={{
            padding: "5px 10px",
            borderRadius: 7,
            border: "1px solid var(--border-2)",
            background: "var(--bg-card)",
            color: "var(--ink-2)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Copier
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          columnGap: 14,
          rowGap: 6,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          fontSize: 12.5,
        }}
      >
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <span style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}>{k}</span>
            <span
              style={{
                color: "var(--ink)",
                fontWeight: 600,
                fontFamily: "var(--symp-mono, monospace)",
                wordBreak: "break-word",
              }}
            >
              {v}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
