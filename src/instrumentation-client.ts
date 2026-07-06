import * as Sentry from "@sentry/nextjs";

// Runs before hydration — client-side error/session capture. Uses the public
// (non-secret) DSN since this ships in the browser bundle. No-op if unset.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Not enabling Session Replay/profiling here — free tier is scoped to error
  // tracking; add if/when the plan and need for it grow.
});
