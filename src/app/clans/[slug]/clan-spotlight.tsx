import Link from "next/link";
import { Crown, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type SpotlightMember = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  contribution: number;
  role: string;
};

const RANK = [
  { icon: Crown, tone: "text-amber-400", ring: "border-amber-500/40", bg: "bg-amber-500/[0.06]" },
  { icon: Medal, tone: "text-slate-300", ring: "border-slate-400/30", bg: "bg-white/[0.03]" },
  { icon: Award, tone: "text-orange-400", ring: "border-orange-500/25", bg: "bg-white/[0.02]" },
];

function roleLabel(role: string) {
  return role === "leader" ? "ლიდერი" : role === "officer" ? "ოფიცერი" : "წევრი";
}

export function ClanSpotlight({ members }: { members: SpotlightMember[] }) {
  if (members.length === 0) return null;
  const hasContribution = members.some((m) => m.contribution > 0);

  return (
    <div className="pubg-loadout-link block" data-variant="royale">
      <div className="pubg-loadout-card relative overflow-hidden p-5">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-amber-500/80" />
        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
            <Crown className="h-4 w-4 text-amber-400" /> ტოპ წვლილი
          </div>
          <ul className="space-y-2">
            {members.map((m, i) => {
              const r = RANK[i] ?? RANK[2];
              const Icon = r.icon;
              return (
                <li key={m.id}>
                  <Link
                    href={`/profile/${m.username}`}
                    className={`flex items-center gap-3 rounded-xl border ${r.ring} ${r.bg} p-2.5 transition-colors hover:border-white/20`}
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center ${r.tone}`}>
                      {i === 0 ? <Icon className="h-4 w-4" /> : <span className="text-[13px] font-black tabular-nums">{i + 1}</span>}
                    </span>
                    <Avatar className="h-9 w-9 border border-white/10">
                      <AvatarImage src={m.avatar ?? undefined} className="object-cover" />
                      <AvatarFallback>{m.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-white">{m.name}</div>
                      <div className="text-[10.5px] font-black uppercase tracking-wider text-white/35">{roleLabel(m.role)}</div>
                    </div>
                    {i === 0 && hasContribution && (
                      <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                        MVP
                      </span>
                    )}
                    <span className="shrink-0 text-[13px] font-black tabular-nums text-amber-400">{m.contribution.toLocaleString()}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
