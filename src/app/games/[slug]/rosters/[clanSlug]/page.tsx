import Link from "next/link";
import { notFound } from "next/navigation";
import { Shield, Users, UserPlus, MessageSquare } from "lucide-react";
import { getClanGameContext } from "@/lib/clan/context";
import { clanRoleRank } from "@/lib/clan/roles";
import { getPlayerPowerRatings } from "@/lib/player/stats";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClanSubPageHeader } from "@/components/clan/clan-subpage-header";
import { ClanRosterPanel, type RosterMember } from "@/app/clans/[slug]/clan-roster";
import { ClanInviteBox } from "@/app/clans/[slug]/clan-invite";
import { ClanRequestActions } from "@/app/clans/[slug]/clan-request-actions";
import { ClanLineup, type LineupMember } from "@/app/clans/[slug]/clan-lineup";
import { ClanLineupManager, type ManagedMember } from "@/app/clans/[slug]/clan-lineup-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "შემადგენლობა | კლანი", robots: { index: false } };

type PendingRequest = {
  id: string;
  message: string | null;
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null };
};

type FullMember = RosterMember & {
  is_captain: boolean;
  lineup_status: string;
  position: string | null;
  jersey_number: number | null;
};


export default async function ClanRostersPage({
  params,
}: {
  params: Promise<{ slug: string; clanSlug: string }>;
}) {
  const { slug, clanSlug } = await params;
  const ctx = await getClanGameContext(slug, clanSlug);
  if (!ctx) notFound();

  const [{ data: membersData }, playerRatings] = await Promise.all([
    ctx.supabase
      .from("clan_members")
      .select("id, role, contribution, is_captain, lineup_status, position, jersey_number, profiles ( id, username, display_name, avatar_url, last_seen_at )")
      .eq("clan_id", ctx.clan.id),
    getPlayerPowerRatings(),
  ]);
  const members = (membersData ?? []) as unknown as FullMember[];

  const lineupMembers: LineupMember[] = members.map((m) => ({
    id: m.id,
    name: m.profiles.display_name || m.profiles.username,
    username: m.profiles.username,
    avatar: m.profiles.avatar_url,
    role: m.role,
    position: m.position,
    lineupStatus: m.lineup_status,
    jerseyNumber: m.jersey_number,
    isCaptain: m.is_captain,
    lastSeenAt: m.profiles.last_seen_at,
  }));

  const managedMembers: ManagedMember[] = [...members]
    .sort((a, b) => clanRoleRank(a.role) - clanRoleRank(b.role))
    .map((m) => ({
      id: m.id,
      name: m.profiles.display_name || m.profiles.username,
      username: m.profiles.username,
      avatar: m.profiles.avatar_url,
      role: m.role,
      position: m.position,
      lineupStatus: m.lineup_status,
      jerseyNumber: m.jersey_number,
      isCaptain: m.is_captain,
    }));

  let pending: PendingRequest[] = [];
  if (ctx.canManage) {
    const { data: reqs } = await ctx.supabase
      .from("clan_requests")
      .select("id, message, profiles ( id, username, display_name, avatar_url )")
      .eq("clan_id", ctx.clan.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    pending = (reqs ?? []) as unknown as PendingRequest[];
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />
      <div className="container relative mx-auto max-w-4xl px-4 py-8 lg:py-10">
        <ClanSubPageHeader
          clanSlug={clanSlug}
          clanName={ctx.clan.name}
          clanTag={ctx.clan.tag}
          clanAvatar={ctx.clan.avatar_url}
          gameName={ctx.game.name_ka}
          title="შემადგენლობა"
          icon={Shield}
        />

        <div className="space-y-6">
          <ClanLineup members={lineupMembers} />

          {ctx.canManage && (
            <div className="pubg-loadout-link block" data-variant="strike">
              <div className="pubg-loadout-card relative overflow-hidden p-5">
                <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-violet-hi)]/70" />
                <div className="relative z-10">
                  <div className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
                    <UserPlus className="h-4 w-4 text-[var(--gr-violet-hi)]" /> მოიწვიე მოთამაშე
                  </div>
                  <ClanInviteBox slug={clanSlug} />
                </div>
              </div>
            </div>
          )}

          {ctx.canManage && <ClanLineupManager clanSlug={clanSlug} members={managedMembers} />}

          {ctx.canManage && pending.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-amber-400">
                <Users className="h-4 w-4" /> ახალი მოთხოვნები ({pending.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((req) => (
                  <div key={req.id} className="pubg-loadout-link block" data-variant="royale">
                    <div className="pubg-loadout-card relative overflow-hidden p-4">
                      <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                      <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-amber-500/80" />
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 border border-amber-500/20">
                            <AvatarImage src={req.profiles.avatar_url ?? undefined} />
                            <AvatarFallback>{(req.profiles.display_name || req.profiles.username).slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link href={`/profile/${req.profiles.username}`} className="block truncate text-[13px] font-black text-white hover:text-indigo-300">
                              {req.profiles.display_name || req.profiles.username}
                            </Link>
                            {req.message && (
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/45" title={req.message}>
                                <MessageSquare className="h-3 w-3" /> {req.message}
                              </p>
                            )}
                          </div>
                        </div>
                        <ClanRequestActions requestId={req.id} clanSlug={clanSlug} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-white/60">
              <Shield className="h-4 w-4 text-indigo-300" /> წევრები ({members.length})
            </h2>
            <ClanRosterPanel clanSlug={clanSlug} members={members} viewerRole={ctx.role} viewerId={ctx.session?.id ?? null} ratings={playerRatings} />
          </div>
        </div>
      </div>
    </div>
  );
}
