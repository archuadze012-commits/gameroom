import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PercentBadge } from "@/components/ui/percent-badge";
import { UserAvatar } from "@/components/user-avatar";
import { getForumTheme, type ForumAccent } from "@/lib/forum-themes";
import type { MockForumCategory } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const accentBg: Record<ForumAccent, string> = {
  violet:  "bg-[color-mix(in_oklab,var(--gr-violet)_18%,transparent)] text-[var(--gr-violet-hi)] ring-[color-mix(in_oklab,var(--gr-violet)_35%,transparent)]",
  amber:   "bg-[color-mix(in_oklab,var(--gr-amber)_18%,transparent)] text-[var(--gr-amber)] ring-[color-mix(in_oklab,var(--gr-amber)_40%,transparent)]",
  magenta: "bg-[color-mix(in_oklab,var(--gr-magenta)_18%,transparent)] text-[var(--gr-magenta)] ring-[color-mix(in_oklab,var(--gr-magenta)_40%,transparent)]",
  cyan:    "bg-[color-mix(in_oklab,var(--gr-cyan-glow)_15%,transparent)] text-[var(--gr-cyan-glow)] ring-[color-mix(in_oklab,var(--gr-cyan-glow)_35%,transparent)]",
};

type Props = {
  category: MockForumCategory;
  contributors?: number;
};

export function CategoryCard({ category, contributors = Math.round(category.threadCount * 1.6) }: Props) {
  const theme = getForumTheme(category.slug);
  const Icon = theme.icon;
  const clip = "polygon(0 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%)";

  return (
    <Link
      href={`/forum/${category.slug}`}
      aria-label={`${category.name} კატეგორიის გახსნა`}
      className="group relative isolate block h-full transition-transform duration-200 [--forum-card-border:var(--gr-border-hi)] hover:-translate-y-1 hover:[--forum-card-border:rgba(220,38,38,0.8)]"
      style={{ background: "var(--forum-card-border)", padding: 1, clipPath: clip }}
    >
      {/* inner surface */}
      <div
        className="group/inner relative flex h-full min-h-[360px] flex-col bg-[var(--gr-bg-1)] p-5 gr-sweep"
        style={{ clipPath: clip }}
      >
        {/* faint card gradient overlay */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]"
        />
        {/* Magenta laser sweeper on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0 transition-none
                     group-hover:translate-x-[100%] group-hover:opacity-100
                     group-hover:transition-transform group-hover:duration-500"
          style={{ background: "linear-gradient(90deg,transparent,rgba(220,38,38,0.9),transparent)" }}
        />
        {/* Magenta glow on hover */}
        <div aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.11) 0%,transparent 65%)" }} />

        {/* percent badge in cut corner */}
        <div className="absolute right-0 top-0">
          <PercentBadge value={theme.openPct} label="ღია" tone="amber" />
        </div>

        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1",
              accentBg[theme.accent]
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1 pr-16">
            <h3 className="line-clamp-1 font-display text-[18px] font-bold uppercase tracking-[-0.005em] text-[var(--gr-text)]">
              {category.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[var(--gr-text-mute)]">
              {category.description}
            </p>
          </div>
        </div>

        {/* minimal stats row */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--gr-border)] bg-[var(--gr-bg-2)]/50 px-2 py-1 text-[11px] font-medium text-[var(--gr-text-mute)]">
             <span className="h-1.5 w-1.5 rounded-full bg-[var(--gr-violet-hi)]" />
             <span className="text-[var(--gr-text)]">{category.threadCount}</span> თემა
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-[var(--gr-border)] bg-[var(--gr-bg-2)]/50 px-2 py-1 text-[11px] font-medium text-[var(--gr-text-mute)]">
             <span className="h-1.5 w-1.5 rounded-full bg-[var(--gr-violet-hi)]" />
             <span className="text-[var(--gr-text)]">{category.postCount}</span> პოსტი
          </div>
        </div>

        {/* latest reply capsule — kills the dead horizontal space */}
        <div
          className="group/capsule relative isolate mt-4 transition-all duration-300"
          style={{
            clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)",
          }}
        >
          <div
            className="relative flex items-center gap-3 overflow-hidden bg-[var(--gr-bg-2)]/70 px-3 py-2.5 transition-colors group-hover:bg-[var(--gr-bg-2)]"
            style={{ clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)" }}
          >
            {/* Magenta laser sweeper on hover */}
            <span aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0
                         transition-none group-hover/capsule:translate-x-[100%] group-hover/capsule:opacity-100
                         group-hover/capsule:transition-transform group-hover/capsule:duration-500"
              style={{ background: "linear-gradient(90deg,transparent,rgba(220,38,38,0.9),transparent)" }} />
            {/* Subtle violet glow always */}
            <div aria-hidden className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(167,139,250,0.09) 0%,transparent 65%)" }} />
            {/* Magenta glow on hover */}
            <div aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/capsule:opacity-100"
              style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.11) 0%,transparent 65%)" }} />
            <UserAvatar username={category.lastThread.author} size="sm" className="h-7 w-7" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[12.5px] font-medium text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
                {category.lastThread.title}
              </p>
              <p className="text-[10.5px] text-[var(--gr-text-dim)]">
                {category.lastThread.author} · {category.lastThread.ago}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--gr-text-mute)]" />
          </div>
        </div>

        {/* explore link */}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-violet-hi)] transition-colors group-hover:text-[var(--gr-violet)]">
          გახსნა
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
