"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

// Root-layout-level error boundary — only triggers when an error escapes every
// nested error.tsx (or the root layout itself throws). Must define its own
// <html>/<body> since it replaces the root layout while active.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ka">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <h1 className="text-2xl font-bold">რაღაც შეცდომა მოხდა</h1>
        <p className="max-w-md text-sm text-white/70">
          სამწუხაროდ გვერდი ვერ ჩაიტვირთა. სცადეთ ხელახლა — თუ პრობლემა გაგრძელდა, დაბრუნდით მთავარ გვერდზე.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => unstable_retry()}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            ხელახლა ცდა
          </button>
          {/* Plain <a>, not next/link, is intentional: this page is the
              last-resort fallback when the root layout itself failed, so a full
              page reload is more reliable than trusting client router state. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold">
            მთავარი გვერდი
          </a>
        </div>
      </body>
    </html>
  );
}
