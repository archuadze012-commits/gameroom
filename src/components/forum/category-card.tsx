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

const accentBorder: Record<ForumAccent, string> = {
  violet:  "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))",
  amber:   "linear-gradient(135deg, rgba(245,165,36,0.55), rgba(255,107,53,0.5))",
  magenta: "linear-gradient(135deg, rgba(192,38,211,0.6), rgba(139,92,246,0.45))",
  cyan:    "linear-gradient(135deg, rgba(34,211,238,0.55), rgba(139,92,246,0.45))",
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
    <article
      className="group relative isolate transition-transform duration-200 hover:-translate-y-1"
      style={{ background: accentBorder[theme.accent], padding: 1, clipPath: clip }}
    >
      {/* inner surface */}
      <div
        className="group/inner relative h-full bg-[var(--gr-bg-1)] p-5 gr-sweep"
        style={{ clipPath: clip }}
      >
        {/* faint card gradient overlay */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]"
        />
        {/* Magenta laser sweeper on hover */}
        <span aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0
                     group-hover:translate-x-[100%] group-hover:opacity-100
                     group-hover:transition-transform group-hover:duration-700"
          style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.9),transparent)" }} />
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
            <h3 className="font-display text-[18px] font-bold uppercase tracking-[-0.005em] text-[var(--gr-text)]">
              {category.name}
            </h3>
            <p className="mt-1 text-[13px] leading-snug text-[var(--gr-text-mute)]">
              {category.description}
            </p>
          </div>
        </div>

        {/* bullet stats — mimics CODX "phase" bullet list */}
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px] text-[var(--gr-text-mute)]">
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[var(--gr-violet-hi)]" />
            <span className="tabular-nums text-[var(--gr-text)]">{category.threadCount}</span> თემა
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[var(--gr-violet-hi)]" />
            <span className="tabular-nums text-[var(--gr-text)]">{category.postCount}</span> პოსტი
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[var(--gr-violet-hi)]" />
            <span className="tabular-nums text-[var(--gr-text)]">{contributors}</span> contributor
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[var(--gr-violet-hi)]" />
            ბოლო {category.lastThread.ago}
          </li>
        </ul>

        {/* latest reply capsule — kills the dead horizontal space */}
        <div
          className="group/capsule relative isolate mt-4 transition-all duration-300 hover:[--capsule-border:rgba(236,72,153,0.85)]"
          style={{
            clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)",
            background: "var(--capsule-border, rgba(167,139,250,0.55))",
            padding: 1,
          }}
        >
          <Link
            href={`/forum/${category.slug}`}
            className="relative flex items-center gap-3 overflow-hidden bg-[var(--gr-bg-2)]/70 px-3 py-2.5 transition-colors hover:bg-[var(--gr-bg-2)]"
            style={{ clipPath: "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)" }}
          >
            {/* Top accent line */}
            <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full"
              style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.8),transparent)" }} />
            {/* Magenta laser sweeper on hover */}
            <span aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0
                         group-hover/capsule:translate-x-[100%] group-hover/capsule:opacity-100
                         group-hover/capsule:transition-transform group-hover/capsule:duration-700"
              style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.9),transparent)" }} />
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
          </Link>
        </div>

        {/* explore link */}
        <Link
          href={`/forum/${category.slug}`}
          className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-violet-hi)] transition-colors hover:text-[var(--gr-violet)]"
        >
          გახსნა
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}
