"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import dynamic from "next/dynamic";

type BoundaryState = { error: Error | null };

class HomeErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PrizeVault] Homepage render failed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main
          style={{
            padding: 24,
            minHeight: "100vh",
            background: "#0d1117",
            color: "#f0f6fc",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ marginTop: 0 }}>PrizeVault failed to load</h1>
          <p style={{ opacity: 0.85 }}>{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #30363d",
              background: "#21262d",
              color: "#f0f6fc",
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

const Landing = dynamic(
  () =>
    import("@frontend/landing").catch((err: unknown) => {
      console.error("[PrizeVault] Landing chunk failed to load:", err);
      const message = err instanceof Error ? err.message : String(err);
      const FailedLanding = () => (
        <main
          style={{
            padding: 24,
            minHeight: "100vh",
            background: "#0d1117",
            color: "#f0f6fc",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ marginTop: 0 }}>Could not load homepage</h1>
          <pre style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>{message}</pre>
        </main>
      );
      return { default: FailedLanding };
    }),
  {
    ssr: false,
    loading: () => (
      <main
        style={{
          padding: 24,
          minHeight: "100vh",
          background: "#0d1117",
          color: "#f0f6fc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Loading PrizeVault…
      </main>
    ),
  },
);

export default function HomeShell() {
  return (
    <HomeErrorBoundary>
      <Landing />
    </HomeErrorBoundary>
  );
}
