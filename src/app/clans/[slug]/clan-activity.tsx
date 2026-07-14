import Link from "next/link";
import { UserPlus, Swords, Megaphone, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type ClanActivityItem = {
  id: string;
  type: "join" | "tournament" | "announcement";
  at: string;
  actorName: string | null;
  actorAvatar: string | null;
  actorUsername: string | null;
  text: string;
};

const ICON = {
  join: { icon: UserPlus, tone: "text-[var(--gr-lime)]", bg: "bg-[var(--gr-lime)]/10" },
  tournament: { icon: Swords, tone: "text-indigo-300", bg: "bg-indigo-500/10" },
  announcement: { icon: Megaphone, tone: "text-amber-400", bg: "bg-amber-500/10" },
} as const;

function ago(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}წთ`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}სთ`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}დ`;
  return `${Math.floor(d / 7)}კვ`;
}

export function ClanActivity({ items }: { items: ClanActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="pubg-loadout-link block" data-variant="support">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-cyan-500/70" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
            <Activity className="h-4 w-4 text-cyan-300" /> აქტივობა
          </div>
          <ul className="space-y-3">
            {items.map((it) => {
              const meta = ICON[it.type];
              const Icon = meta.icon;
              return (
                <li key={it.id} className="flex items-start gap-3">
                  {it.actorAvatar !== null || it.actorName ? (
                    <Avatar className="h-7 w-7 shrink-0 border border-white/10">
                      <AvatarImage src={it.actorAvatar ?? undefined} className="object-cover" />
                      <AvatarFallback className="text-[10px]">{(it.actorName ?? "?").slice(0, 1)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${meta.bg} ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-white/70">
                    {it.actorName && (
                      it.actorUsername ? (
                        <Link href={`/profile/${it.actorUsername}`} className="font-black text-white hover:text-cyan-200">
                          {it.actorName}
                        </Link>
                      ) : (
                        <span className="font-black text-white">{it.actorName}</span>
                      )
                    )}{" "}
                    <span className="break-words">{it.text}</span>
                  </div>
                  <span className="shrink-0 pt-0.5 text-[10px] font-bold tabular-nums text-white/30">{ago(it.at)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
