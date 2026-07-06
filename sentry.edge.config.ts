import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware, edge API routes). This app currently uses the Node
// runtime everywhere, but Next.js still probes for this file — keep it minimal.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
});
