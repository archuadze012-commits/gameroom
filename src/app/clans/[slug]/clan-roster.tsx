import Link from "next/link";
import { Crown, Shield, Gauge } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineDot } from "@/components/ui/online-dot";
import { clanRoleLabel, clanRoleDesc, clanRoleRank, isClanManager } from "@/lib/clan/roles";
import { ClanMemberActions } from "./clan-member-actions";

export type RosterMember = {
  id: string;
  role: string;
  contribution: number | null;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    last_seen_at: string | null;
  };
};

export function ClanRosterPanel({
  clanSlug,
  members,
  viewerRole,
  viewerId,
  ratings,
}: {
  clanSlug: string;
  members: RosterMember[];
  viewerRole: string;
  viewerId: string | null;
  ratings?: Map<string, { rating: number; w: number; l: number; d: number }>;
}) {
  const sorted = [...members].sort((a, b) => clanRoleRank(a.role) - clanRoleRank(b.role));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((m) => {
        const p = m.profiles;
        const isSelf = viewerId === p.id;
        return (
          <div key={m.id} className="pubg-loadout-link block" data-variant="strike">
            <div className="pubg-loadout-card relative overflow-hidden p-3.5">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] ${m.role === "leader" ? "bg-amber-500/80" : isClanManager(m.role) ? "bg-indigo-500/80" : "bg-white/20"}`} />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback>{(p.display_name || p.username).slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <OnlineDot lastSeenAt={p.last_seen_at} size={11} className="absolute -bottom-0.5 -right-0.5" />
                  </div>
                  <div className="min-w-0">
                    <Link href={`/profile/${p.username}`} className="block truncate text-[13px] font-black text-white hover:text-indigo-300">
                      {p.display_name || p.username}
                    </Link>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider" title={clanRoleDesc(m.role)}>
                      {m.role === "leader" ? (
                        <span className="flex items-center gap-1 text-amber-400"><Crown className="h-3 w-3" /> {clanRoleLabel(m.role)}</span>
                      ) : isClanManager(m.role) ? (
                        <span className="flex items-center gap-1 text-indigo-300"><Shield className="h-3 w-3" /> {clanRoleLabel(m.role)}</span>
                      ) : (
                        <span className="text-white/45">წევრი</span>
                      )}
                      {(m.contribution ?? 0) > 0 && <span className="text-amber-400/70">· {m.contribution} XP</span>}
                      {ratings?.get(p.id) && (
                        <span className="flex items-center gap-1 text-[var(--gr-violet-hi)]/80">
                          · <Gauge className="h-2.5 w-2.5" /> {ratings.get(p.id)!.rating}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-white/40">{clanRoleDesc(m.role)}</p>
                  </div>
                </div>
                <ClanMemberActions memberId={m.id} memberRole={m.role} clanSlug={clanSlug} viewerRole={viewerRole} isSelf={isSelf} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
