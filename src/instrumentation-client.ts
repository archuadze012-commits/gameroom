import * as Sentry from "@sentry/nextjs";

// Runs before hydration — client-side error/session capture. Uses the public
// (non-secret) DSN since this ships in the browser bundle. No-op if unset.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors-only on the client: tracesSampleRate pulls the whole
  // browserTracingIntegration (~150-300KB) into the every-page critical
  // bundle. Server-side tracing (sentry.server.config) is unaffected.
  // Not enabling Session Replay/profiling here — free tier is scoped to error
  // tracking; add if/when the plan and need for it grow.
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
