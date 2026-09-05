"use client";

import dynamic from "next/dynamic";

const Landing = dynamic(() => import("@frontend/landing"), {
  ssr: false,
  loading: () => <p style={{ padding: 24 }}>Loading HackPay…</p>,
});

export default function HomePage() {
  return <Landing />;
}
