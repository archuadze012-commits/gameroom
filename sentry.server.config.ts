import * as Sentry from "@sentry/nextjs";

// Node runtime (route handlers, server actions, RSC render). No-op if
// SENTRY_DSN is unset, so this is safe to ship before the DSN is configured.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors are the priority on the free tier's 5k/month quota — keep tracing
  // sampling low rather than off, so slow-request diagnostics stay available.
  tracesSampleRate: 0.1,
  // Next's redirect()/notFound() throw special NEXT_REDIRECT/NEXT_NOT_FOUND
  // control-flow errors (~70 call sites in this app) — not real errors.
  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
});
