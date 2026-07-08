import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self https://js.stripe.com)",
  },
  {
    // Next.js App Router requires 'unsafe-inline' for styles and 'unsafe-eval' for RSC hydration.
    // Nonce-based CSP would require middleware — documented in RAG_FUTURE_IMPROVEMENTS.md section A.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.consentmanager.net https://delivery.consentmanager.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://upload.wikimedia.org https://images.unsplash.com https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://o4507983235080192.ingest.sentry.io https://delivery.consentmanager.net",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    /**
     * `loose` = pas de CssChunkingPlugin « strict » (évite certains soucis d’ordre / de chunks CSS en prod).
     * Valeurs acceptées par Next 14.2 : `"strict"` | `"loose"` uniquement — pas de booléen.
     */
    cssChunking: "loose",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN ?
  withSentryConfig(nextConfig, {
    silent: true,
    disableLogger: true,
  })
: nextConfig;
