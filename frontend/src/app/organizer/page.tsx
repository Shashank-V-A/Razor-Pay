"use client";

import dynamic from "next/dynamic";

const IssuerApp = dynamic(() => import("@frontend/issuer/IssuerApp"), {
  ssr: false,
  loading: () => <p style={{ padding: 24 }}>Loading organizer console…</p>,
});

export default function OrganizerPage() {
  return <IssuerApp />;
}
