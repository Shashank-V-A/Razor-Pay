"use client";

import dynamic from "next/dynamic";

const HolderWalletApp = dynamic(() => import("@frontend/HolderWalletApp"), {
  ssr: false,
  loading: () => <p style={{ padding: 24 }}>Loading participant portal…</p>,
});

export default function HolderPage() {
  return <HolderWalletApp />;
}
