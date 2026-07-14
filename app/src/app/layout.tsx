import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { OfflineIndicator } from "@/components/offline-indicator";
import { OfflineHandlersInit } from "@/components/offline-handlers-init";
import { RouteProgress } from "@/components/route-progress";

const productSans = localFont({
  src: [
    { path: "../../public/fonts/Product-Sans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/Product-Sans-Italic.ttf", weight: "400", style: "italic" },
    { path: "../../public/fonts/Product-Sans-Bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/Product-Sans-Bold-Italic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-product-sans",
  display: "swap",
  preload: true,
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Village Milestone Tracker by Atourin",
    template: "%s | Village Milestone Tracker by Atourin",
  },
  description:
    "Platform pendampingan desa wisata internal Atourin & mitra terdaftar.",
  manifest: "/manifest.json",
  // Default: noindex for authenticated app scopes.
  // Overridden per-route by /page.tsx and /public/[slug]/page.tsx which
  // set robots.index=true for the landing + share-link pages.
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
    <html lang="id" className={productSans.variable}>
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
