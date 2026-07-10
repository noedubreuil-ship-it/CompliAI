import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
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

const withIntl = withNextIntl(nextConfig);

export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN ?
  withSentryConfig(withIntl, {
    silent: true,
    disableLogger: true,
  })
: withIntl;
