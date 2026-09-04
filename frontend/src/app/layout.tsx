import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "@frontend/styles/index.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrizeVault · Dual-control hackathon prizes in INR",
  description:
    "Lock hackathon prize money in a Razorpay INR vault. Sponsor and organizer both approve before any payout moves.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8fa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      style={{ colorScheme: "light" }}
      className={`${plusJakarta.variable} ${jetbrains.variable}`}
    >
      <head>
        <Script id="pv-global-polyfill" strategy="beforeInteractive">{`
          if (typeof global === 'undefined') window.global = window;
          try { localStorage.removeItem('prize_vault_theme'); } catch (e) {}
        `}</Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
