import * as Sentry from "@sentry/nextjs";

// Runs once per server/edge runtime start. Loads the matching Sentry config so
// route handlers, server actions, and RSC render are instrumented from boot.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Next 15+ hook: fires for any error thrown from a route handler, server
// action, server component, or middleware that Next itself catches (i.e. one
// that never reaches our own try/catch). This is the main server-side capture
// path — client errors are handled separately by instrumentation-client.ts +
// global-error.tsx.
export const onRequestError = Sentry.captureRequestError;
