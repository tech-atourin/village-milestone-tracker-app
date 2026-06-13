import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { OfflineIndicator } from "@/components/offline-indicator";

export const metadata: Metadata = {
  title: {
    default: "Village Milestone Tracker by Atourin",
    template: "%s | Village Milestone Tracker by Atourin",
  },
  description:
    "Platform pendampingan desa wisata internal Atourin & mitra terdaftar.",
  manifest: "/manifest.json",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  // Icons auto-detected from src/app/icon.svg + src/app/apple-icon.svg
};

export const viewport: Viewport = {
  themeColor: "#7068D5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
        <OfflineIndicator />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
