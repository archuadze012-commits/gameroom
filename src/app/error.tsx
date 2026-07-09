"use client";

import { useEffect } from "react";
import Link from "next/link";

// Segment-scoped error boundary. Without this, any thrown error in a route
// unwinds all the way to global-error.tsx, which replaces the whole
// <html>/<body> and drops the site chrome. This one renders inside the root
// layout, so the nav/footer stay put. (Sentry is already wired and captures
// the error separately.)
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">
          რაღაც შეიშალა
        </h1>
        <p className="max-w-md text-sm font-medium text-white/50">
          გვერდის ჩატვირთვისას მოხდა შეცდომა. სცადე თავიდან ან დაბრუნდი მთავარ გვერდზე.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center rounded-full border border-[var(--gr-violet-hi)]/40 bg-[var(--gr-violet)]/15 px-6 text-[12px] font-black uppercase tracking-[0.16em] text-[var(--gr-violet-hi)] transition-colors hover:bg-[var(--gr-violet)]/25"
        >
          თავიდან ცდა
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/5 px-6 text-[12px] font-black uppercase tracking-[0.16em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          მთავარზე
        </Link>
      </div>
    </div>
  );
}
