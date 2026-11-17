"use client";
import React, { useState } from "react";

/**
 * Asks the machine itself whether the upscaling engine can run on it.
 *
 * An upscale that fails without writing anything looks identical from the
 * outside whether the graphics driver is missing, the destination folder is
 * protected, or the engine was never installed. Each of those was guessed at
 * in turn, from a distance, over several attempts. This button answers it in
 * one click, on the machine where the problem is, with text that can be
 * copied into a message.
 */
export default function EngineDiagnostics() {
  const [report, setReport] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setRunning(true);
    setReport(null);
    try {
      const out = await (window as any).electron?.invoke("engine-diagnostics");
      setReport(
        typeof out === "string" && out.trim()
          ? out
          : "Le diagnostic n'a rien renvoyé.",
      );
    } catch (e) {
      setReport(`Le diagnostic a échoué : ${e}`);
    } finally {
      setRunning(false);
    }
  };

  const copy = () => {
    if (!report) return;
    navigator.clipboard?.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // A failed check is worth looking at; a clean one needs no attention.
  const hasProblem =
    !!report && /INTROUVABLE|MANQUANT|ÉCHEC|AUCUN|REFUSÉE|NON/.test(report);

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
          Diagnostic du moteur
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {report && (
            <button
              onClick={copy}
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
              {copied ? "Copié" : "Copier"}
            </button>
          )}
          <button
            onClick={run}
            disabled={running}
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: "1px solid var(--border-2)",
              background: "var(--bg-card)",
              color: "var(--ink-2)",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: running ? "default" : "pointer",
              opacity: running ? 0.6 : 1,
            }}
          >
            {running ? "Test en cours" : "Tester"}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0, lineHeight: 1.5 }}>
        Vérifie que le moteur d'agrandissement, les modèles et la carte
        graphique répondent sur cette machine. À lancer si un agrandissement
        échoue sans produire de fichier.
      </p>

      {report && (
        <pre
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 12,
            border: `1px solid ${hasProblem ? "var(--danger, #e2554f)" : "var(--border)"}`,
            background: "var(--bg-card)",
            color: "var(--ink)",
            fontSize: 11.5,
            lineHeight: 1.6,
            fontFamily: "var(--symp-mono, monospace)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {report}
        </pre>
      )}
    </div>
  );
}
