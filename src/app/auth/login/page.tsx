import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";
import { getSiteContentValue } from "@/lib/site-content";

export const metadata = { title: "შესვლა" };

const panelClip = "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)";
const panelBorder = "linear-gradient(135deg, rgba(186,230,253,0.45), rgba(139,92,246,0.5), rgba(244,114,182,0.45))";

export default async function LoginPage() {
  const heading = await getSiteContentValue("auth.login.heading", {
    pre: "SIGN IN TO",
    game: "GAME",
    room: "room",
    domain: ".com.ge",
  });

  return (
    <article
      className="relative isolate w-full max-w-[780px]"
      style={{ background: panelBorder, padding: 1, clipPath: panelClip }}
    >
      <div
        className="relative overflow-hidden bg-[linear-gradient(180deg,rgba(10,14,24,0.96),rgba(12,10,22,0.94))] px-8 py-9 sm:px-12 sm:py-12 lg:px-14 lg:py-14"
        style={{ clipPath: panelClip }}
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.09),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.12),transparent_38%)]" />
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-fuchsia-300/35 to-transparent" />

        <header className="relative mb-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="whitespace-nowrap font-display text-[1.25rem] font-extrabold uppercase leading-tight sm:text-[1.5rem] lg:text-[1.75rem]">
                <span className="text-[var(--gr-text)]">{String(heading.pre ?? "SIGN IN TO")}</span>{" "}
                <span className="text-[var(--gr-text)]">{String(heading.game ?? "GAME")}</span>
                <span className="text-cyan-300">{String(heading.room ?? "room")}</span>
                <span className="text-[var(--gr-text)]">{String(heading.domain ?? ".com.ge")}</span>
              </h2>
            </div>
            <div className="grid h-18 w-18 place-items-center border border-white/10 bg-white/[0.03] sm:h-20 sm:w-20">
              <div className="h-3.5 w-3.5 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
            </div>
          </div>
        </header>

        <div className="relative">
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </article>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full" />
    </div>
  );
}
