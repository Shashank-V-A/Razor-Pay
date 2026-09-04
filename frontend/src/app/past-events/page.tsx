"use client";

import dynamic from "next/dynamic";

const PastEventsPage = dynamic(() => import("@frontend/past-events"), {
  ssr: false,
  loading: () => <p style={{ padding: 24 }}>Loading past events…</p>,
});

export default function PastEventsRoute() {
  return <PastEventsPage />;
}
