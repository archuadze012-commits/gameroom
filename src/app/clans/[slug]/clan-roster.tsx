import Link from "next/link";
import { Crown, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineDot } from "@/components/ui/online-dot";
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

const ROLE_ORDER: Record<string, number> = { leader: 0, officer: 1, member: 2 };

export function ClanRosterPanel({
  clanSlug,
  members,
  viewerRole,
  viewerId,
}: {
  clanSlug: string;
  members: RosterMember[];
  viewerRole: "leader" | "officer" | "member" | "none";
  viewerId: string | null;
}) {
  const sorted = [...members].sort((a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((m) => {
        const p = m.profiles;
        const isSelf = viewerId === p.id;
        return (
          <div key={m.id} className="pubg-loadout-link block" data-variant="strike">
            <div className="pubg-loadout-card relative overflow-hidden p-3.5">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] ${m.role === "leader" ? "bg-amber-500/80" : m.role === "officer" ? "bg-indigo-500/80" : "bg-white/20"}`} />
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
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider">
                      {m.role === "leader" ? (
                        <span className="flex items-center gap-1 text-amber-400"><Crown className="h-3 w-3" /> ლიდერი</span>
                      ) : m.role === "officer" ? (
                        <span className="flex items-center gap-1 text-indigo-300"><Shield className="h-3 w-3" /> ოფიცერი</span>
                      ) : (
                        <span className="text-white/45">წევრი</span>
                      )}
                      {(m.contribution ?? 0) > 0 && <span className="text-amber-400/70">· {m.contribution} XP</span>}
                    </p>
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
