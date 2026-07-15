import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Trophy, Target, Pencil, ShieldCheck, Megaphone, Share2, Gauge, Coins } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { OnlineDot } from "@/components/ui/online-dot";
import { isOnline } from "@/lib/presence";
import { accentOrDefault } from "@/lib/clan/cosmetics";
import { getClanTrophyData, getClanFixtures, getClanMatchResults, getClanPowerRatings } from "@/lib/clan/context";
import { ClanJoinButton } from "./clan-join-button";
import { ClanLeaveButton } from "./clan-leave-button";
import { ClanAnnouncements, type ClanAnnouncement } from "./clan-announcements";
import { ClanInviteResponse } from "./clan-invite";
import { ClanTrophyCase } from "./clan-trophy-case";
import { ClanSpotlight, type SpotlightMember } from "./clan-spotlight";
import { ClanActivity, type ClanActivityItem } from "./clan-activity";
import { ClanLineup, type LineupMember } from "./clan-lineup";

type ClanMemberProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  last_seen_at: string | null;
};
type ClanMember = {
  id: string;
  role: string;
  joined_at: string | null;
  contribution: number | null;
  is_captain: boolean | null;
  lineup_status: string | null;
  position: string | null;
  jersey_number: number | null;
  profiles: ClanMemberProfile;
};
const STATUS_LABEL: Record<string, string> = {
  open: "ღია",
  invite_only: "მოწვევით",
  closed: "დახურული",
};

const ROLE_ORDER: Record<string, number> = { leader: 0, officer: 1, member: 2 };

function announceAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "დღეს";
  if (days === 1) return "გუშინ";
  return `${days} დღის წინ`;
}

function nextSessionLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const days = Math.floor((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
  const hm = d.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit" });
  if (days <= 0) return `დღეს ${hm}`;
  if (days === 1) return `ხვალ ${hm}`;
  return d.toLocaleDateString("ka-GE", { day: "numeric", month: "short" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: c } = await supabase
    .from("clans")
    .select("name, tag, description, avatar_url, banner_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!c) return { title: "კლანი ვერ მოიძებნა", robots: { index: false } };
  const title = c.tag ? `${c.name} [${c.tag}]` : c.name;
  const description = c.description || `${c.name} — კლანი PLAYGAME.GE-ზე. შეუერთდი გუნდს.`;
  const image = c.banner_url ?? c.avatar_url ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/clans/${slug}` },
    openGraph: { title, description, url: `/clans/${slug}`, type: "website", images: image ? [{ url: image }] : undefined },
  };
}

export default async function ClanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const [sessionUser, { data: clan }] = await Promise.all([
    getSession().catch(() => null),
    supabase
      .from("clans")
      .select(`
        id, name, slug, tag, description, avatar_url, banner_url, xp, level, status, game_slug, recruiting, recruit_note, emblem, accent_color, treasury,
        clan_members (
          id, role, joined_at, contribution, is_captain, lineup_status, position, jersey_number,
          profiles ( id, username, display_name, avatar_url, is_verified, last_seen_at )
        )
      `)
      .eq("slug", slug)
      .single(),
  ]);

  if (!clan) notFound();

  // The game this clan belongs to (clans are game-scoped).
  let clanGame: { id: string; name_ka: string; icon_url: string | null } | null = null;
  if (clan.game_slug) {
    const { data: g } = await supabase
      .from("games")
      .select("id, name_ka, icon_url")
      .eq("slug", clan.game_slug)
      .maybeSingle();
    clanGame = g ?? null;
  }

  const members = ([...(clan.clan_members || [])] as ClanMember[]).sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9)
  );

  // Viewer status relative to this clan.
  let userStatus = "none"; // 'none' | 'member' | 'pending'
  let userRole: "leader" | "officer" | "member" | "none" = "none";
  let canManageRequests = false;

  if (sessionUser) {
    const membership = members.find((m) => m.profiles.id === sessionUser.id);
    if (membership) {
      userStatus = "member";
      userRole = membership.role as "leader" | "officer" | "member";
      canManageRequests = ["leader", "officer"].includes(userRole);
    } else {
      const { data: req } = await supabase
        .from("clan_requests")
        .select("status")
        .eq("clan_id", clan.id)
        .eq("user_id", sessionUser.id)
        .maybeSingle();
      if (req && req.status === "pending") userStatus = "pending";
    }
  }

  const isMember = userStatus === "member";
  const isLeader = userRole === "leader";
  const canManage = canManageRequests; // leader or officer

  // ── Clan feature data ────────────────────────────────────────
  let announcements: ClanAnnouncement[] = [];
  let myInvite: { id: string } | null = null;
  // Non-member teaser — count + freshness only, never body text (announcements
  // are member-only content; RLS blocks a non-member client read entirely, so
  // this goes through the public-safe clan_announcement_teaser DEFINER RPC,
  // deliberately kept to metadata).
  let announcementTeaser: { count: number; latestAt: string | null } | null = null;

  if (isMember && sessionUser) {
    const { data: annRows } = await supabase
      .from("clan_announcements")
      .select("id, body, created_at, author_id, pinned")
      .eq("clan_id", clan.id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = annRows ?? [];
    const authorIds = [...new Set(rows.map((a) => a.author_id).filter((x): x is string => !!x))];
    const authorMap = new Map<string, { username: string; display_name: string | null; avatar_url: string | null }>();
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds);
      (authors ?? []).forEach((a) => authorMap.set(a.id, a));
    }
    announcements = rows.map((a) => {
      const au = a.author_id ? authorMap.get(a.author_id) : null;
      return {
        id: a.id,
        body: a.body,
        created_at: a.created_at,
        pinned: a.pinned,
        authorName: au?.display_name ?? au?.username ?? "წევრი",
        authorUsername: au?.username ?? null,
        authorAvatar: au?.avatar_url ?? null,
      };
    });
  } else if (sessionUser) {
    const { data: inv } = await supabase
      .from("clan_invites")
      .select("id")
      .eq("clan_id", clan.id)
      .eq("invited_user", sessionUser.id)
      .eq("status", "pending")
      .maybeSingle();
    myInvite = inv ?? null;
  }

  if (!isMember) {
    // Metadata-only teaser via a public-safe DEFINER RPC (count + freshness, no
    // body) — resilient to a missing/invalid service-role key. clan_announcements
    // itself is member-only under RLS.
    const { data: teaser } = await supabase.rpc("clan_announcement_teaser", { p_clan_id: clan.id });
    const row = teaser?.[0];
    if (row && (row.cnt ?? 0) > 0) {
      announcementTeaser = { count: row.cnt ?? 0, latestAt: row.latest_at ?? null };
    }
  }

  // Progression — every 1000 clan XP is a level.
  const clanLevel = clan.level ?? 1;
  const clanXp = clan.xp ?? 0;
  const xpPct = Math.min(100, ((clanXp % 1000) / 1000) * 100);

  const onlineMemberCount = members.filter((m) => isOnline(m.profiles.last_seen_at)).length;
  const accent = accentOrDefault(clan.accent_color);

  const gs = clan.game_slug;
  let openTournamentCount = 0;
  let openScrimCount = 0;
  if (clanGame) {
    const [{ count: tCount }, { count: sCount }] = await Promise.all([
      supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("game_id", clanGame.id).eq("is_practice", false).eq("status", "open"),
      supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("game_id", clanGame.id).eq("is_practice", true).eq("status", "open"),
    ]);
    openTournamentCount = tCount ?? 0;
    openScrimCount = sCount ?? 0;
  }

  // Trophy case + activity feed — derived from tournament entries (one query).
  const { stats: trophy, registrations } = await getClanTrophyData(supabase, clan.id);
  const trophyStats = { ...trophy, level: clanLevel };

  // Activity feed — merge joins + tournament registrations + (member-only)
  // announcement events, newest first. All derived, no separate log table.
  const activityItems: ClanActivityItem[] = [];
  members.forEach((m) => {
    if (m.joined_at) {
      activityItems.push({
        id: `join-${m.id}`,
        type: "join",
        at: m.joined_at,
        actorName: m.profiles.display_name || m.profiles.username,
        actorAvatar: m.profiles.avatar_url,
        actorUsername: m.profiles.username,
        text: "შემოუერთდა კლანს",
      });
    }
  });
  registrations.forEach((r) => {
    if (r.registeredAt) {
      activityItems.push({
        id: `reg-${r.tournamentId}-${r.registeredAt}`,
        type: "tournament",
        at: r.registeredAt,
        actorName: null,
        actorAvatar: null,
        actorUsername: null,
        text: `${r.isPractice ? "სკრიმზე" : "ტურნირზე"} დარეგისტრირდა — ${r.name}`,
      });
    }
  });
  if (isMember) {
    announcements.forEach((a) => {
      activityItems.push({
        id: `ann-${a.id}`,
        type: "announcement",
        at: a.created_at,
        actorName: a.authorName,
        actorAvatar: a.authorAvatar,
        actorUsername: a.authorUsername,
        text: "დაწერა განცხადება",
      });
    });
  }
  activityItems.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const recentActivity = activityItems.slice(0, 8);

  // Contribution spotlight — top 3 members by contribution.
  const spotlight: SpotlightMember[] = [...members]
    .sort((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0))
    .slice(0, 3)
    .map((m) => ({
      id: m.id,
      name: m.profiles.display_name || m.profiles.username,
      username: m.profiles.username,
      avatar: m.profiles.avatar_url,
      contribution: m.contribution ?? 0,
      role: m.role,
    }));

  // Starting lineup (identity showcase — renders only when a lineup is set).
  const lineupMembers: LineupMember[] = members.map((m) => ({
    id: m.id,
    name: m.profiles.display_name || m.profiles.username,
    username: m.profiles.username,
    avatar: m.profiles.avatar_url,
    role: m.role,
    position: m.position,
    lineupStatus: m.lineup_status ?? "bench",
    jerseyNumber: m.jersey_number,
    isCaptain: !!m.is_captain,
    lastSeenAt: m.profiles.last_seen_at,
  }));

  // Command-card badges derived from the tournament engine: next upcoming fixture
  // + match record. Both auto — the clan never hand-creates these.
  const [clanFixtures, { record: matchRec }] = await Promise.all([
    getClanFixtures(supabase, clan.id),
    getClanMatchResults(supabase, clan.id),
  ]);
  const nextEventAt = clanFixtures.find((f) => f.startsAt)?.startsAt ?? null;
  const scheduleBadge = nextEventAt
    ? nextSessionLabel(nextEventAt)
    : clanFixtures.length > 0
      ? `${clanFixtures.length} ფიქსტურა`
      : null;
  const matchRecord = matchRec.w + matchRec.l + matchRec.d > 0 ? matchRec : null;

  // Power Rating (derived ELO) + rank among same-game clans.
  const powerRatings = await getClanPowerRatings(supabase);
  const myPower = powerRatings.get(clan.id) ?? null;
  let powerRank: number | null = null;
  if (myPower && clan.game_slug) {
    const { data: peers } = await supabase.from("clans").select("id").eq("game_slug", clan.game_slug);
    const rated = (peers ?? [])
      .map((p) => ({ id: p.id, r: powerRatings.get(p.id)?.rating ?? null }))
      .filter((p): p is { id: string; r: number } => p.r != null)
      .sort((a, b) => b.r - a.r);
    const idx = rated.findIndex((p) => p.id === clan.id);
    powerRank = idx >= 0 ? idx + 1 : null;
  }

  const navCards = gs
    ? [
        { key: "tournaments", label: "ტურნირები", sub: "COMPETE", href: `/games/${gs}/tournaments`, variant: "royale", rail: "bg-amber-500/80", badge: openTournamentCount > 0 ? `${openTournamentCount} ღია` : null, badgeTone: "text-amber-300" },
        { key: "scrims", label: "პრაქტიკული თამაშები", sub: "TRAIN", href: `/games/${gs}/scrims`, variant: "support", rail: "bg-cyan-500/70", badge: openScrimCount > 0 ? `${openScrimCount} ღია` : null, badgeTone: "text-cyan-300" },
        { key: "chat", label: "კლანის ჩატი", sub: "COMMS", href: `/games/${gs}/clanchat/${slug}`, variant: "room", rail: "bg-cyan-500/70", badge: onlineMemberCount > 0 ? `${onlineMemberCount} ონლაინ` : null, badgeTone: "text-[var(--gr-lime)]" },
        { key: "rosters", label: "შემადგენლობა", sub: "ROSTER", href: `/games/${gs}/rosters/${slug}`, variant: "strike", rail: "bg-indigo-500/80", badge: `${members.length} წევრი`, badgeTone: "text-indigo-300" },
        { key: "schedule", label: "კალენდარი", sub: "SCHEDULE", href: `/games/${gs}/schedule/${slug}`, variant: "royale", rail: "bg-[var(--gr-lime)]/70", badge: scheduleBadge, badgeTone: "text-[var(--gr-lime)]" },
        { key: "matches", label: "შედეგები", sub: "RESULTS", href: `/games/${gs}/matches/${slug}`, variant: "strike", rail: "bg-amber-500/80", badge: matchRecord ? `${matchRecord.w}-${matchRecord.l}-${matchRecord.d}` : null, badgeTone: "text-amber-300" },
      ]
    : [];

  // Left column of the lower grid: announcements for members, metadata-only
  // teaser for non-members (never leaks announcement bodies).
  const teaserPanel =
    !isMember && announcementTeaser ? (
      <div className="pubg-loadout-link block" data-variant="royale">
        <div className="pubg-loadout-card relative overflow-hidden p-5">
          <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
          <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-amber-500/80" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                <Megaphone className="h-4 w-4" />
              </span>
              <p className="text-[13px] text-white/70">
                <span className="font-black text-white">{announcementTeaser.count} განცხადება</span> ამ კლანში
                {announcementTeaser.latestAt && <> — ბოლო {announceAgo(announcementTeaser.latestAt)}</>}. შეუერთდი რომ ნახო.
              </p>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  const leftPanel = isMember ? (
    <ClanAnnouncements slug={slug} canPost={canManage} announcements={announcements} />
  ) : (
    teaserPanel
  );

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />

      <div className="container relative mx-auto max-w-5xl px-4 py-8 lg:py-10">
        <Link
          href={clan.game_slug ? `/games/${clan.game_slug}/clans` : "/games"}
          className="mb-5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> კლანების სია
        </Link>

        {myInvite && !isMember && (
          <div className="mb-4">
            <ClanInviteResponse inviteId={myInvite.id} clanName={clan.name} />
          </div>
        )}

        {/* Hero */}
        <div className="pubg-loadout-link block" data-variant="strike">
          <div className="pubg-loadout-card relative overflow-hidden p-5 sm:p-7">
            {clan.banner_url && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={clan.banner_url} alt="" className="absolute inset-0 z-0 h-full w-full object-cover opacity-25" />
                <span aria-hidden className="absolute inset-0 z-0 bg-gradient-to-t from-[var(--gr-bg-elev-1)] via-[var(--gr-bg-elev-1)]/75 to-transparent" />
              </>
            )}
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[5] bg-indigo-500/80" />
            <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16 opacity-25 z-[5]" />
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 right-0 h-56 w-72 rounded-full blur-3xl"
              style={{ background: `linear-gradient(to bottom, ${accent.hex}40, transparent)` }}
            />

            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4 sm:gap-5">
                <Avatar className="h-20 w-20 shrink-0 rounded-2xl border border-indigo-500/30 shadow-[0_0_22px_rgba(99,102,241,0.25)] sm:h-24 sm:w-24">
                  <AvatarImage src={clan.avatar_url ?? undefined} className="object-cover" />
                  <AvatarFallback className="rounded-2xl bg-indigo-500/15 text-2xl font-black text-indigo-300">
                    {clan.tag}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Pill tone="amber">[{clan.tag}]</Pill>
                    <Pill tone={clan.status === "open" ? "online" : clan.status === "closed" ? "neutral" : "violet"}>
                      {STATUS_LABEL[clan.status] ?? clan.status}
                    </Pill>
                    {clan.recruiting && (
                      <Pill tone="lime" pulse>ეძებს წევრებს</Pill>
                    )}
                    {clan.game_slug && clanGame && (
                      <Link href={`/games/${clan.game_slug}`}>
                        <Pill tone="cyan" className="transition-opacity hover:opacity-80">
                          {clanGame.icon_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={clanGame.icon_url} alt="" className="h-3.5 w-3.5 rounded object-cover" />
                          )}
                          {clanGame.name_ka}
                        </Pill>
                      </Link>
                    )}
                  </div>
                  <DisplayHeading as="h1" size="md" className="text-white">
                    {clan.emblem ? `${clan.emblem} ` : ""}{clan.name}
                  </DisplayHeading>
                  <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-white/60">
                    {clan.description || "ამ კლანს აღწერა არ აქვს."}
                  </p>

                  {/* Roster preview — who's here, at a glance */}
                  {members.length > 0 && (
                    <Link href={gs ? `/games/${gs}/rosters/${slug}` : "#"} className="mt-4 flex items-center gap-3 group/roster">
                      <div className="flex -space-x-2.5">
                        {members.slice(0, 6).map((m) => (
                          <div key={m.id} className="relative shrink-0">
                            <Avatar className="h-8 w-8 border-2 border-[var(--gr-bg-elev-1)] transition-transform group-hover/roster:scale-105">
                              <AvatarImage src={m.profiles.avatar_url ?? undefined} className="object-cover" />
                              <AvatarFallback className="text-[10px]">{(m.profiles.display_name || m.profiles.username).slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <OnlineDot lastSeenAt={m.profiles.last_seen_at} size={9} className="absolute -bottom-0.5 -right-0.5" />
                          </div>
                        ))}
                      </div>
                      {members.length > 6 && (
                        <span className="text-[11px] font-black text-white/40">+{members.length - 6}</span>
                      )}
                      {onlineMemberCount > 0 && (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--gr-lime)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--gr-lime)] shadow-[0_0_6px_var(--gr-lime)]" />
                          {onlineMemberCount} ონლაინ
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              </div>

              {/* Right rail: stats + membership actions */}
              <div className="w-full shrink-0 space-y-3 rounded-2xl border border-white/[0.07] bg-black/20 p-4 md:w-[220px]">
                <div className="rounded-xl border border-[var(--gr-violet-hi)]/25 bg-[var(--gr-violet)]/[0.08] p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--gr-violet-hi)]">
                    <Gauge className="h-3 w-3" /> POWER RATING
                  </div>
                  {myPower ? (
                    <>
                      <div className="mt-1 text-[26px] font-black leading-none tabular-nums text-white">{myPower.rating}</div>
                      <div className="mt-1 text-[10px] font-bold text-white/45">
                        {powerRank ? `#${powerRank}` : ""} · {myPower.w}-{myPower.l}-{myPower.d}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1.5 text-[11px] font-bold text-white/35">ჯერ არ არის — ითამაშე ტურნირი</div>
                  )}
                </div>

                <Stat icon={Trophy} label="დონე" value={clanLevel} tone="text-amber-400" />
                <Stat icon={Target} label="XP" value={clanXp} tone="text-indigo-300" />
                <Stat icon={Users} label="წევრები" value={members.length} tone="text-white" />

                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-white/40">
                    <span>დონე {clanLevel}</span>
                    <span className="tabular-nums">{clanXp % 1000}/1000</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--gr-amber),var(--gr-magenta))]" style={{ width: `${xpPct}%` }} />
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/[0.07] pt-3">
                  {isMember ? (
                    <>
                      <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--gr-lime)]/25 bg-[var(--gr-lime)]/[0.08] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-[var(--gr-lime)]">
                        <ShieldCheck className="h-4 w-4" /> {userRole === "leader" ? "ლიდერი" : userRole === "officer" ? "ოფიცერი" : "წევრი ხარ"}
                      </div>
                      {isLeader && (
                        <Link
                          href={`/clans/${slug}/edit`}
                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-white/70 transition-colors hover:border-[var(--gr-violet-hi)]/40 hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" /> რედაქტირება
                        </Link>
                      )}
                      <Link
                        href={`/clans/${slug}/treasury`}
                        className="flex w-full items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-amber-300 transition-colors hover:bg-amber-500/[0.12]"
                      >
                        <span className="flex items-center gap-2"><Coins className="h-3.5 w-3.5" /> ხაზინა</span>
                        <span className="tabular-nums">{clan.treasury.toLocaleString()}</span>
                      </Link>
                      <Link
                        href={`/c/${slug}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[12px] font-black uppercase tracking-wider text-white/70 transition-colors hover:border-indigo-400/40 hover:text-white"
                      >
                        <Share2 className="h-3.5 w-3.5" /> გააზიარე ბარათი
                      </Link>
                      <ClanLeaveButton clanSlug={slug} isLeader={isLeader} gameSlug={clan.game_slug} />
                    </>
                  ) : (
                    <ClanJoinButton
                      clanId={clan.id}
                      status={clan.status}
                      userStatus={userStatus}
                      isAuthenticated={!!sessionUser}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Command cards → dedicated pages */}
        {navCards.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {navCards.map((c) => (
              <Link key={c.key} href={c.href} className="pubg-loadout-link group block" data-variant={c.variant}>
                <article className="pubg-loadout-card relative h-full min-h-[130px] overflow-hidden p-5">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[5] ${c.rail}`} />
                  <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-display text-[10px] font-black uppercase tracking-[0.24em] text-white/45">{c.sub}</span>
                      {c.badge && (
                        <span className={`shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${c.badgeTone}`}>
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <span className="font-display text-[19px] font-black uppercase leading-[0.95] text-white transition-colors group-hover:text-[#D0F8FF]">
                      {c.label}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Trophy case — the clan's competitive record */}
        <div className="mt-8">
          <ClanTrophyCase stats={trophyStats} />
        </div>

        {/* Starting lineup — renders only when a lineup is set */}
        {lineupMembers.some((m) => m.lineupStatus === "starter" || m.lineupStatus === "sub") && (
          <div className="mt-8">
            <ClanLineup members={lineupMembers} />
          </div>
        )}

        {/* Announcements / teaser + sidebar (spotlight, activity) */}
        <div className={`mt-8 grid gap-4 ${leftPanel ? "lg:grid-cols-3" : ""}`}>
          {leftPanel && <div className="space-y-4 lg:col-span-2">{leftPanel}</div>}
          <aside className="space-y-4">
            <ClanSpotlight members={spotlight} />
            <ClanActivity items={recentActivity} />
          </aside>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="flex items-center gap-1.5 text-white/50">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className={`font-black tabular-nums ${tone}`}>{value.toLocaleString()}</span>
    </div>
  );
}
