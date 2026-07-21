/** @type {import('next').NextConfig} */

// =====================================================
// Security headers (private deployment)
// =====================================================
// CSP balanced for Next.js inline scripts + Supabase + Google AI APIs.
// Tighten further if any feature breaks.
// =====================================================

const SUPABASE_HOST = "https://wpsnkfyzacilbjsdjzdi.supabase.co";

const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Next.js inlines runtime scripts; with CSP nonces this could be removed
    "'unsafe-eval'", // dev mode needs this
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    SUPABASE_HOST,
    "https://*.supabase.co",
    "https://generativelanguage.googleapis.com",
    "https://api.fonnte.com",
  ],
  "frame-ancestors": ["'self'"],
  "form-action": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
};

const csp = Object.entries(cspDirectives)
  .map(([k, v]) => `${k} ${v.join(" ")}`)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  experimental: {
    // Materi & Tautan / evidence uploads post file bytes (base64) through a
    // server action. Raise the default 1MB cap so PDFs/Excel/foto go through;
    // large media (video/rekaman zoom) should be added as a link instead.
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "hub.atourin.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
