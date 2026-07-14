import Link from "next/link";
import { Users2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineDot } from "@/components/ui/online-dot";

export type LineupMember = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  position: string | null;
  lineupStatus: string;
  jerseyNumber: number | null;
  isCaptain: boolean;
  lastSeenAt: string | null;
};

export function ClanLineup({ members }: { members: LineupMember[] }) {
  const starters = members.filter((m) => m.lineupStatus === "starter");
  const subs = members.filter((m) => m.lineupStatus === "sub");
  if (starters.length === 0 && subs.length === 0) return null;

  return (
    <div className="pubg-loadout-link block" data-variant="strike">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-indigo-500/80" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
            <Users2 className="h-4 w-4 text-indigo-300" /> ლაინაპი
          </div>

          {starters.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {starters.map((m) => (
                <PlayerCard key={m.id} m={m} />
              ))}
            </div>
          )}

          {subs.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/40">სათადარიგო</div>
              <div className="flex flex-wrap gap-2">
                {subs.map((m) => (
                  <Link
                    key={m.id}
                    href={`/profile/${m.username}`}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 transition-colors hover:border-white/25"
                  >
                    <Avatar className="h-6 w-6 border border-white/10">
                      <AvatarImage src={m.avatar ?? undefined} className="object-cover" />
                      <AvatarFallback className="text-[9px]">{m.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="text-[12px] font-bold text-white/80">{m.name}</span>
                    {m.position && <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300/70">{m.position}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ m }: { m: LineupMember }) {
  return (
    <Link
      href={`/profile/${m.username}`}
      className="relative flex flex-col items-center rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center transition-colors hover:border-indigo-400/40"
    >
      {m.isCaptain && (
        <span
          className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-[9px] font-black text-black"
          title="კაპიტანი"
        >
          C
        </span>
      )}
      <div className="relative">
        <Avatar className="h-12 w-12 border border-white/10">
          <AvatarImage src={m.avatar ?? undefined} className="object-cover" />
          <AvatarFallback>{m.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <OnlineDot lastSeenAt={m.lastSeenAt} size={10} className="absolute -bottom-0.5 -right-0.5" />
        {m.jerseyNumber !== null && (
          <span className="absolute -left-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full border border-indigo-400/40 bg-[var(--gr-bg-elev-2)] px-1 text-[10px] font-black tabular-nums text-indigo-200">
            {m.jerseyNumber}
          </span>
        )}
      </div>
      <div className="mt-2 w-full truncate text-[12px] font-black text-white">{m.name}</div>
      <div className="mt-0.5 text-[9.5px] font-black uppercase tracking-wider text-indigo-300/70">
        {m.position || (m.role === "leader" ? "ლიდერი" : " ")}
      </div>
    </Link>
  );
}
