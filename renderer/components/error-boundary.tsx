import React from "react";

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0B0B0C",
            color: "#F4F3F0",
            fontFamily: "monospace",
            padding: 40,
            gap: 20,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#FC8181" }}>Erreur de rendu</div>
          <pre
            style={{
              fontSize: 12,
              background: "#16161A",
              color: "#C9C7C2",
              borderRadius: 10,
              padding: 20,
              maxWidth: 700,
              width: "100%",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              border: "1px solid rgba(244,243,240,0.08)",
            }}
          >
            {error.name}: {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "#F4F3F0",
              color: "#0B0B0C",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
