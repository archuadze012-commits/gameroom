import Link from "next/link";
import { ChevronRight, Crown, Medal, Award } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlowDot } from "@/components/ui/glow-dot";
import { UserAvatar } from "@/components/user-avatar";

type LeaderItem = { username: string; score: number };

type Props = {
  onlineCount?: number;
  top3?: LeaderItem[];
  newMembers?: string[];
};

const DEFAULT_TOP: LeaderItem[] = [
  { username: "Saba",  score: 312 },
  { username: "Nika",  score: 248 },
  { username: "Lika",  score: 189 },
];

const DEFAULT_NEW = ["Tamo", "Vakho", "Mari", "Geo", "Niko", "Ana"];

const podiumIcon = [Crown, Medal, Award];

export function ForumSidebar({
  onlineCount = 142,
  top3 = DEFAULT_TOP,
  newMembers = DEFAULT_NEW,
}: Props) {
  return (
    <aside className="space-y-5">
      {/* online */}
      <section className="border border-[var(--gr-border)] bg-[var(--gr-bg-1)] p-4">
        <Eyebrow tone="violet">ონლაინ</Eyebrow>
        <div className="mt-2 flex items-center gap-2">
          <GlowDot tone="lime" />
          <span className="font-display text-[28px] font-extrabold leading-none tabular-nums text-[var(--gr-text)]">
            {onlineCount}
          </span>
          <span className="text-[12px] text-[var(--gr-text-mute)]">გეიმერი</span>
        </div>
      </section>

      {/* top 3 */}
      <section className="border border-[var(--gr-border)] bg-[var(--gr-bg-1)] p-4">
        <Eyebrow tone="amber">Top 3 დღეს</Eyebrow>
        <ol className="mt-3 space-y-2">
          {top3.map((u, i) => {
            const Icon = podiumIcon[i] ?? Award;
            const accent =
              i === 0 ? "text-[var(--gr-amber)]" :
              i === 1 ? "text-[var(--gr-text-mute)]" :
              "text-[var(--gr-violet-hi)]";
            return (
              <li key={u.username} className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${accent}`} />
                <UserAvatar username={u.username} size="sm" className="h-7 w-7" />
                <span className="flex-1 text-[13px] font-medium text-[var(--gr-text)]">
                  {u.username}
                </span>
                <span className="text-[11.5px] tabular-nums text-[var(--gr-text-mute)]">
                  {u.score} pts
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* new members */}
      <section className="border border-[var(--gr-border)] bg-[var(--gr-bg-1)] p-4">
        <Eyebrow tone="magenta">ახალი წევრები</Eyebrow>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {newMembers.map((u) => (
            <UserAvatar key={u} username={u} size="sm" className="h-7 w-7" />
          ))}
        </div>
      </section>

      {/* rules */}
      <section className="border border-[var(--gr-border)] bg-[var(--gr-bg-1)] p-4">
        <Eyebrow tone="cyan">საზოგადოების წესები</Eyebrow>
        <ul className="mt-3 space-y-1.5 text-[12.5px] leading-snug text-[var(--gr-text-mute)]">
          <li>ერთობლივად — არა შეურაცხყოფა.</li>
          <li>Spam-ი და ნაცხრაბი იშლება.</li>
          <li>თამაშის ცხელ თემებზე ცხელი არგუმენტი — ცივი ენით.</li>
        </ul>
        <Link
          href="/rules"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-violet-hi)] hover:text-[var(--gr-violet)]"
        >
          სრულად <ChevronRight className="h-3 w-3" />
        </Link>
      </section>
    </aside>
  );
}
