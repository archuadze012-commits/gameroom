import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Trophy, Target, Pencil, ShieldCheck, Megaphone, Share2, Gauge, Coins, Swords, Dumbbell, CalendarClock, ArrowRight, Search, MessageCircle, PlayCircle, Music, Camera, Video, BookText } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { OnlineDot } from "@/components/ui/online-dot";
import { isOnline } from "@/lib/presence";
import { accentOrDefault } from "@/lib/clan/cosmetics";
import { getClanCompetitiveData, getClanPowerRatings } from "@/lib/clan/context";
import { clanRoleLabel, clanRoleRank, isClanManager } from "@/lib/clan/roles";
import { ClanJoinButton } from "./clan-join-button";
import { ClanLeaveButton } from "./clan-leave-button";
import { ClanAnnouncements, type ClanAnnouncement } from "./clan-announcements";
import { ClanInviteResponse } from "./clan-invite";
import { ClanTrophyCase } from "./clan-trophy-case";
import { ClanSpotlight, type SpotlightMember } from "./clan-spotlight";
import { ClanActivity, type ClanActivityItem } from "./clan-activity";
import { ClanLineup, type LineupMember } from "./clan-lineup";
import { ClanHighlights, type ClanHighlight } from "./clan-highlights";

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
        rules, recruiting_roles, discord_url, youtube_url, tiktok_url, instagram_url, twitch_url,
        clan_members (
          id, role, joined_at, contribution, is_captain, lineup_status, position, jersey_number,
          profiles ( id, username, display_name, avatar_url, is_verified, last_seen_at )
        )
      `)
      .eq("slug", slug)
      .single(),
  ]);

  if (!clan) notFound();

  const members = ([...(clan.clan_members || [])] as ClanMember[]).sort(
    (a, b) => clanRoleRank(a.role) - clanRoleRank(b.role)
  );

  // Viewer membership — resolved synchronously from the already-loaded roster.
  const membershipRow = sessionUser ? members.find((m) => m.profiles.id === sessionUser.id) : undefined;
  let userStatus: "none" | "member" | "pending" = membershipRow ? "member" : "none";
  const userRole: string = membershipRow ? membershipRow.role : "none";
  const isMember = userStatus === "member";
  const isLeader = userRole === "leader";
  const canManage = isMember && isClanManager(userRole);

  // Progression + presence (sync — no I/O).
  const clanLevel = clan.level ?? 1;
  const clanXp = clan.xp ?? 0;
  const xpPct = Math.min(100, ((clanXp % 1000) / 1000) * 100);
  const onlineMemberCount = members.filter((m) => isOnline(m.profiles.last_seen_at)).length;
  const accent = accentOrDefault(clan.accent_color);
  const gs = clan.game_slug;
  const recruitingRoles = (clan.recruiting_roles ?? []) as string[];
  const socials = [
    { key: "discord", url: clan.discord_url, Icon: MessageCircle, label: "Discord" },
    { key: "youtube", url: clan.youtube_url, Icon: PlayCircle, label: "YouTube" },
    { key: "tiktok", url: clan.tiktok_url, Icon: Music, label: "TikTok" },
    { key: "instagram", url: clan.instagram_url, Icon: Camera, label: "Instagram" },
    { key: "twitch", url: clan.twitch_url, Icon: Video, label: "Twitch" },
  ].filter((s): s is typeof s & { url: string } => !!s.url);

  // ── One parallel data load: game + open-tournament counts, competitive record
  //    (trophy + fixtures + results in a single entries fetch), power ratings,
  //    same-game peers, and the member/non-member feature panel ────────────────
  const [gameAndCounts, competitive, powerRatings, peersRes, panel, pendingReqRes, highlights] = await Promise.all([
    (async () => {
      if (!gs) return { clanGame: null as { id: string; name_ka: string; icon_url: string | null } | null, openTournamentCount: 0, openScrimCount: 0 };
      const { data: g } = await supabase.from("games").select("id, name_ka, icon_url").eq("slug", gs).maybeSingle();
      if (!g) return { clanGame: null, openTournamentCount: 0, openScrimCount: 0 };
      const [{ count: tCount }, { count: sCount }] = await Promise.all([
        supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("game_id", g.id).eq("is_practice", false).eq("status", "open"),
        supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("game_id", g.id).eq("is_practice", true).eq("status", "open"),
      ]);
      return { clanGame: g, openTournamentCount: tCount ?? 0, openScrimCount: sCount ?? 0 };
    })(),
    getClanCompetitiveData(supabase, clan.id),
    getClanPowerRatings(),
    gs ? supabase.from("clans").select("id").eq("game_slug", gs) : Promise.resolve({ data: [] as { id: string }[] }),
    (async () => {
      if (isMember && sessionUser) {
        const { data: annRows } = await supabase
          .from("clan_announcements")
          .select("id, body, created_at, author_id, pinned, poll_question")
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

        // Poll options + vote tallies (only for announcements that carry a poll).
        const pollAnnIds = rows.filter((a) => a.poll_question).map((a) => a.id);
        const optByAnn = new Map<string, { id: string; label: string; votes: number }[]>();
        const myVoteByAnn = new Map<string, string>();
        if (pollAnnIds.length > 0) {
          const [{ data: opts }, { data: votes }] = await Promise.all([
            supabase.from("clan_poll_options").select("id, announcement_id, label, sort").in("announcement_id", pollAnnIds).order("sort", { ascending: true }),
            supabase.from("clan_poll_votes").select("announcement_id, option_id, user_id").in("announcement_id", pollAnnIds),
          ]);
          const voteCount = new Map<string, number>();
          (votes ?? []).forEach((v) => {
            voteCount.set(v.option_id, (voteCount.get(v.option_id) ?? 0) + 1);
            if (v.user_id === sessionUser.id) myVoteByAnn.set(v.announcement_id, v.option_id);
          });
          (opts ?? []).forEach((o) => {
            const arr = optByAnn.get(o.announcement_id) ?? [];
            arr.push({ id: o.id, label: o.label, votes: voteCount.get(o.id) ?? 0 });
            optByAnn.set(o.announcement_id, arr);
          });
        }

        const announcements: ClanAnnouncement[] = rows.map((a) => {
          const au = a.author_id ? authorMap.get(a.author_id) : null;
          return {
            id: a.id,
            body: a.body,
            created_at: a.created_at,
            pinned: a.pinned,
            authorName: au?.display_name ?? au?.username ?? "წევრი",
            authorUsername: au?.username ?? null,
            authorAvatar: au?.avatar_url ?? null,
            pollQuestion: a.poll_question,
            pollOptions: optByAnn.get(a.id) ?? [],
            myVote: myVoteByAnn.get(a.id) ?? null,
          };
        });
        return { announcements, myInvite: null as { id: string } | null, teaser: null as { count: number; latestAt: string | null } | null, pending: false };
      }

      // Non-member: metadata-only teaser (public DEFINER RPC — count + freshness,
      // never body) + any pending invite / join request for the CTA state.
      const [teaserRes, inviteRes, reqRes] = await Promise.all([
        supabase.rpc("clan_announcement_teaser", { p_clan_id: clan.id }),
        sessionUser
          ? supabase.from("clan_invites").select("id").eq("clan_id", clan.id).eq("invited_user", sessionUser.id).eq("status", "pending").maybeSingle()
          : Promise.resolve({ data: null }),
        sessionUser
          ? supabase.from("clan_requests").select("status").eq("clan_id", clan.id).eq("user_id", sessionUser.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const teaserRow = (teaserRes.data as Array<{ cnt: number | null; latest_at: string | null }> | null)?.[0];
      const teaser = teaserRow && (teaserRow.cnt ?? 0) > 0 ? { count: teaserRow.cnt ?? 0, latestAt: teaserRow.latest_at ?? null } : null;
      const pending = (reqRes.data as { status: string } | null)?.status === "pending";
      return { announcements: [] as ClanAnnouncement[], myInvite: (inviteRes.data as { id: string } | null) ?? null, teaser, pending };
    })(),
    // Pending join-request count for the roster card badge (managers only).
    canManage
      ? supabase.from("clan_requests").select("id", { count: "exact", head: true }).eq("clan_id", clan.id).eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    // Highlights (public showcase) + author names.
    (async (): Promise<ClanHighlight[]> => {
      const { data: hls } = await supabase
        .from("clan_highlights")
        .select("id, url, title, platform, user_id")
        .eq("clan_id", clan.id)
        .gte("created_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(12);
      const rows = hls ?? [];
      const uids = [...new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))];
      const nameMap = new Map<string, string>();
      if (uids.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, username, display_name").in("id", uids);
        (profs ?? []).forEach((p) => nameMap.set(p.id, p.display_name || p.username));
      }
      return rows.map((r) => ({
        id: r.id,
        url: r.url,
        title: r.title,
        platform: r.platform,
        authorId: r.user_id,
        authorName: r.user_id ? nameMap.get(r.user_id) ?? null : null,
      }));
    })(),
  ]);

  const { clanGame, openTournamentCount, openScrimCount } = gameAndCounts;
  const announcements = panel.announcements;
  const myInvite = panel.myInvite;
  const announcementTeaser = panel.teaser;
  if (panel.pending) userStatus = "pending";
  const pendingRequestCount = canManage ? pendingReqRes.count ?? 0 : 0;

  const { trophy, fixtures: clanFixtures, matches } = competitive;
  const trophyStats = { ...trophy.stats, level: clanLevel };
  const registrations = trophy.registrations;
  const matchRec = matches.record;
  const formResults = matches.results.slice(0, 5).map((r) => r.result);

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

  // Command-card badges (next fixture + match record) + Power Rating rank — all
  // derived from the single parallel load above, no extra round-trips.
  const nextFixture = clanFixtures.find((f) => f.startsAt) ?? clanFixtures[0] ?? null;
  const nextEventAt = nextFixture?.startsAt ?? null;
  const scheduleBadge = nextEventAt
    ? nextSessionLabel(nextEventAt)
    : clanFixtures.length > 0
      ? `${clanFixtures.length} ფიქსტურა`
      : null;
  const matchRecord = matchRec.w + matchRec.l + matchRec.d > 0 ? matchRec : null;

  const myPower = powerRatings.get(clan.id) ?? null;
  let powerRank: number | null = null;
  if (myPower && gs) {
    const rated = ((peersRes.data ?? []) as { id: string }[])
      .map((p) => ({ id: p.id, r: powerRatings.get(p.id)?.rating ?? null }))
      .filter((p): p is { id: string; r: number } => p.r != null)
      .sort((a, b) => b.r - a.r);
    const idx = rated.findIndex((p) => p.id === clan.id);
    powerRank = idx >= 0 ? idx + 1 : null;
  }

  const navCards = gs
    ? [
        { key: "chat", label: "კლანის ჩატი", sub: "COMMS", href: `/games/${gs}/clanchat/${slug}`, variant: "room", rail: "bg-cyan-500/70", badge: onlineMemberCount > 0 ? `${onlineMemberCount} ონლაინ` : null, badgeTone: "text-[var(--gr-lime)]" },
        { key: "rosters", label: "შემადგენლობა", sub: "ROSTER", href: `/games/${gs}/rosters/${slug}`, variant: "strike", rail: "bg-indigo-500/80", badge: pendingRequestCount > 0 ? `${pendingRequestCount} მოთხოვნა` : `${members.length} წევრი`, badgeTone: pendingRequestCount > 0 ? "text-[var(--gr-lime)]" : "text-indigo-300" },
        { key: "tournaments", label: "ტურნირები", sub: "COMPETE", href: `/games/${gs}/tournaments`, variant: "royale", rail: "bg-amber-500/80", badge: openTournamentCount > 0 ? `${openTournamentCount} ღია` : null, badgeTone: "text-amber-300" },
        { key: "scrims", label: "პრაქტიკული თამაშები", sub: "TRAIN", href: `/games/${gs}/scrims`, variant: "support", rail: "bg-cyan-500/70", badge: openScrimCount > 0 ? `${openScrimCount} ღია` : null, badgeTone: "text-cyan-300" },
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
    <ClanAnnouncements slug={slug} canPost={canManage} isMember={isMember} announcements={announcements} />
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

                  {/* Recruitment — the leader's pitch + structured role needs */}
                  {clan.recruiting && (clan.recruit_note || recruitingRoles.length > 0) && (
                    <div className="mt-3 max-w-xl rounded-xl border border-[var(--gr-lime)]/25 bg-[var(--gr-lime)]/[0.06] px-3 py-2.5">
                      {clan.recruit_note && (
                        <div className="flex items-start gap-2">
                          <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--gr-lime)]" />
                          <p className="text-[12.5px] leading-relaxed text-[var(--gr-lime)]/90">{clan.recruit_note}</p>
                        </div>
                      )}
                      {recruitingRoles.length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 ${clan.recruit_note ? "mt-2" : ""}`}>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--gr-lime)]/60">ვეძებთ:</span>
                          {recruitingRoles.map((r) => (
                            <span key={r} className="rounded-full border border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/10 px-2 py-0.5 text-[10.5px] font-black uppercase tracking-wider text-[var(--gr-lime)]">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social channels */}
                  {socials.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {socials.map((s) => (
                        <a
                          key={s.key}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          title={s.label}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:border-[var(--gr-violet-hi)]/40 hover:text-white"
                        >
                          <s.Icon className="h-4 w-4" />
                        </a>
                      ))}
                    </div>
                  )}

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
                      {formResults.length > 0 && (
                        <div className="mt-2 flex flex-row-reverse justify-center gap-1">
                          {formResults.map((r, i) => (
                            <span
                              key={i}
                              title={r === "win" ? "მოგება" : r === "loss" ? "წაგება" : "ფრე"}
                              className={`h-3 w-3 rounded-sm ${r === "win" ? "bg-[var(--gr-lime)]" : r === "loss" ? "bg-red-500" : "bg-white/40"}`}
                            />
                          ))}
                        </div>
                      )}
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
                        <ShieldCheck className="h-4 w-4" /> {userRole === "member" ? "წევრი ხარ" : clanRoleLabel(userRole)}
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

        {/* Next fixture — the clan's soonest upcoming registered tournament/scrim */}
        {gs && nextFixture && (
          <Link href={`/games/${gs}/schedule/${slug}`} className="mt-6 pubg-loadout-link group block" data-variant="royale">
            <article className="pubg-loadout-card relative overflow-hidden p-4">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[5] bg-[var(--gr-lime)]/70" />
              <div className="relative z-10 flex flex-wrap items-center gap-4">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${nextFixture.isPractice ? "bg-cyan-500/10 text-cyan-300" : "bg-amber-500/10 text-amber-300"}`}>
                  {nextFixture.isPractice ? <Dumbbell className="h-5 w-5" /> : <Swords className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[var(--gr-lime)]/80">
                    <CalendarClock className="h-3 w-3" /> შემდეგი {nextFixture.isPractice ? "სკრიმი" : "მატჩი"}
                  </div>
                  <div className="mt-0.5 truncate text-[15px] font-black text-white">{nextFixture.name}</div>
                  {nextFixture.startsAt && (
                    <div className="mt-0.5 text-[12px] font-bold text-white/50">
                      {new Date(nextFixture.startsAt).toLocaleString("ka-GE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white/45 transition-colors group-hover:text-[var(--gr-lime)]">
                  {isMember ? "მონიშნე დასწრება" : "გრაფიკი"} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </article>
          </Link>
        )}

        {/* Command cards → dedicated pages */}
        {navCards.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {navCards.map((c) => {
              const isFullWidth = c.key === "chat" || c.key === "rosters";
              return (
                <Link
                  key={c.key}
                  href={c.href}
                  className={`pubg-loadout-link group block ${isFullWidth ? "col-span-full" : ""}`}
                  data-variant={c.variant}
                >
                  <article className="pubg-loadout-card relative h-full min-h-[90px] overflow-hidden p-5">
                    <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                    <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[5] ${c.rail}`} />
                    <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
                    <div className="relative z-10 flex h-full flex-col justify-center items-center">
                      {c.badge && (
                        <span className={`absolute right-0 top-0 shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${c.badgeTone}`}>
                          {c.badge}
                        </span>
                      )}
                      <span className="text-center font-display text-[19px] font-black uppercase leading-tight text-white transition-colors group-hover:text-[#D0F8FF]">
                        {c.label}
                      </span>
                    </div>
                  </article>
                </Link>
              );
            })}
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

        {/* Highlights showcase */}
        {(isMember || highlights.length > 0) && (
          <div className="mt-8">
            <ClanHighlights clanSlug={slug} isMember={isMember} canManage={canManage} viewerId={sessionUser?.id ?? null} highlights={highlights} />
          </div>
        )}

        {/* Clan rules */}
        {clan.rules && (
          <div className="mt-8 pubg-loadout-link block" data-variant="strike">
            <div className="pubg-loadout-card relative overflow-hidden p-5">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-indigo-500/80" />
              <div className="relative z-10">
                <div className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
                  <BookText className="h-4 w-4 text-indigo-300" /> წესები
                </div>
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/70">{clan.rules}</p>
              </div>
            </div>
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
