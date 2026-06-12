import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.2,
  // Ne capture pas les erreurs réseau client banales
  ignoreErrors: [
    "TypeError: Failed to fetch",
    "TypeError: Load failed",
    "AbortError",
  ],
});
