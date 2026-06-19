import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { OfflineIndicator } from "@/components/offline-indicator";
import { OfflineHandlersInit } from "@/components/offline-handlers-init";
import { RouteProgress } from "@/components/route-progress";

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
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
        <OfflineIndicator />
        <OfflineHandlersInit />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
