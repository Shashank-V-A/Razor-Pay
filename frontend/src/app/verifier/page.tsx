"use client";

import dynamic from "next/dynamic";

const SponsorConsole = dynamic(() => import("@frontend/recruiter"), {
  ssr: false,
  loading: () => <p style={{ padding: 24 }}>Loading sponsor console…</p>,
});

export default function VerifierPage() {
  return <SponsorConsole />;
}
