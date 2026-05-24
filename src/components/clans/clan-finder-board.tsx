"use client";

import { Gamepad2, Search, Trophy, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import type { MyClanState } from "@/components/clans/clan-store";

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

function ClanBadge({ tag }: { tag: string }) {
  return (
    <div className="relative grid h-16 w-16 shrink-0 place-items-center">
      <div
        className="absolute inset-0 bg-gradient-to-br from-violet-500/45 to-cyan-500/20"
        style={{ clipPath: "polygon(50% 0, 92% 22%, 82% 84%, 50% 100%, 18% 84%, 8% 22%)" }}
      />
      <div
        className="relative grid h-[58px] w-[58px] place-items-center bg-[var(--gr-bg-0)] ring-1 ring-white/10"
        style={{ clipPath: "polygon(50% 0, 92% 22%, 82% 84%, 50% 100%, 18% 84%, 8% 22%)" }}
      >
        <span className="font-display text-[17px] font-black uppercase text-[var(--gr-text)]">{tag}</span>
      </div>
    </div>
  );
}

export function ClanFinderBoard({ clan }: { clan: MyClanState | null }) {
  if (!clan) {
    return (
      <EmptyState
        tone="cyan"
        illustration={<Search className="h-10 w-10 text-[var(--gr-cyan)]" />}
        title="რეალური კლანები ჯერ არ არის"
        description="როგორც კი კლანი შეიქმნება, აქ გამოჩნდება რეალური card. ამ ეტაპზე გამოგონილი mock-კლანები მოვაშორეთ."
      />
    );
  }

  return (
    <article className="group relative isolate" style={{ background: cardBorder, padding: 1, clipPath: cutMd }}>
      <div className="relative min-h-[230px] overflow-hidden bg-[var(--gr-bg-1)] p-5 transition-transform duration-300 group-hover:scale-[1.01]" style={{ clipPath: cutMd }}>
        <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/24 to-violet-500/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/45 to-transparent" />
        <div aria-hidden className="absolute right-0 top-0 h-full w-24 bg-[linear-gradient(180deg,rgba(34,211,238,0.55),rgba(139,92,246,0.12))] [clip-path:polygon(32%_0,100%_0,100%_100%,0_100%)]" />

        <div className="relative z-[1] flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <ClanBadge tag={clan.tag || "CL"} />
            <Pill tone={clan.recruiting ? "online" : "neutral"}>{clan.recruiting ? "იღებს წევრებს" : "დახურულია"}</Pill>
          </div>

          <div className="mt-5">
            <h3 className="font-display text-[22px] font-extrabold uppercase leading-[1.02] text-[var(--gr-text)]">
              {clan.name}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[var(--gr-text-mute)]">
              {clan.motto || "კლანი მზად არის პირველი გუნდის შესაგროვებლად."}
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            <Pill tone="violet" icon={<Gamepad2 className="h-3 w-3" />}>{clan.game}</Pill>
            <Pill tone="cyan" icon={<Users className="h-3 w-3" />}>{clan.members.length}/30</Pill>
            <Pill tone="amber" icon={<Trophy className="h-3 w-3" />}>#12</Pill>
          </div>
        </div>
      </div>
    </article>
  );
}
