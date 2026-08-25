import Link from "next/link";
import { Radar, Users, ShieldQuestion, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineDot } from "@/components/ui/online-dot";
import { isClanManager } from "@/lib/clan/roles";
import { LfcToggle, InvitePlayerButton } from "./finder-controls";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "კლანების ძებნა",
  description: "იპოვე კლანი ან წევრი — recruiting კლანები და მოთამაშეები ვინც კლანს ეძებს.",
  alternates: { canonical: "/clans/finder" },
};

type RecruitingClan = {
  id: string;
  name: string;
  slug: string;
  tag: string;
  description: string | null;
  avatar_url: string | null;
  game_slug: string | null;
  level: number;
  emblem: string | null;
  recruit_note: string | null;
  recruiting_roles: string[] | null;
  clan_members: { count: number }[];
};

type LfcPlayer = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number | null;
  region: string | null;
  favorite_game_slugs: string[] | null;
  last_seen_at: string | null;
};

export default async function ClanFinderPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const [sessionUser, { game: gameFilter }] = await Promise.all([getSession().catch(() => null), searchParams]);

  let viewerClanSlug: string | null = null;
  let viewerRole: string | null = null;
  let viewerLfc = false;
  let viewerInClan = false;
  if (sessionUser) {
    const [{ data: mem }, { data: prof }] = await Promise.all([
      supabase.from("clan_members").select("role, clans ( slug )").eq("user_id", sessionUser.id).maybeSingle(),
      supabase.from("profiles").select("looking_for_clan").eq("id", sessionUser.id).maybeSingle(),
    ]);
    if (mem) {
      viewerInClan = true;
      viewerRole = mem.role as string;
      const c = Array.isArray(mem.clans) ? mem.clans[0] : mem.clans;
      viewerClanSlug = (c as { slug: string } | null)?.slug ?? null;
    }
    viewerLfc = prof?.looking_for_clan ?? false;
  }
  const canInvite = isClanManager(viewerRole) && !!viewerClanSlug;

  let recQuery = supabase
    .from("clans")
    .select("id, name, slug, tag, description, avatar_url, game_slug, level, emblem, recruit_note, recruiting_roles, clan_members(count)")
    .eq("recruiting", true)
    .order("xp", { ascending: false })
    .limit(24);
  if (gameFilter) recQuery = recQuery.eq("game_slug", gameFilter);

  let lfcQuery = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level, region, favorite_game_slugs, last_seen_at")
    .eq("looking_for_clan", true)
    .eq("banned", false)
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(30);
  if (gameFilter) lfcQuery = lfcQuery.contains("favorite_game_slugs", [gameFilter]);
  if (sessionUser) lfcQuery = lfcQuery.neq("id", sessionUser.id);

  const [{ data: recruiting }, { data: lfc }, { data: gameRows }] = await Promise.all([
    recQuery,
    lfcQuery,
    supabase.from("games").select("slug, name_ka, icon_url").eq("active", true).order("name_ka", { ascending: true }),
  ]);

  const recruitingClans = (recruiting ?? []) as unknown as RecruitingClan[];
  const lfcPlayers = (lfc ?? []) as LfcPlayer[];
  const games = gameRows ?? [];
  const gameBySlug = new Map(games.map((g) => [g.slug, g]));

  const chip = (slug?: string) => `/clans/finder${slug ? `?game=${slug}` : ""}`;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />
      <div className="container relative mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <PageHeader
          color="indigo"
          eyebrow="Clan Finder"
          title="იპოვე კლანი ან წევრი"
          description="კლანები ვინც ეძებს წევრებს — და მოთამაშეები ვინც კლანს ეძებს. იპოვე შენი გუნდი."
          actions={
            sessionUser && !viewerInClan ? <LfcToggle initial={viewerLfc} /> : undefined
          }
        />

        {/* Game filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={chip()}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wider transition-colors ${
              !gameFilter ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300" : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white/80"
            }`}
          >
            ყველა
          </Link>
          {games.map((g) => (
            <Link
              key={g.slug}
              href={chip(g.slug)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wider transition-colors ${
                gameFilter === g.slug ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300" : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white/80"
              }`}
            >
              {g.icon_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.icon_url} alt="" className="h-4 w-4 rounded object-cover" />
              )}
              {g.name_ka}
            </Link>
          ))}
        </div>

        {/* Recruiting clans */}
        <section id="recruiting" className="mt-10 scroll-mt-24">
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.16em] text-[var(--gr-lime)]">
            <ShieldQuestion className="h-4 w-4" /> ეძებენ წევრებს ({recruitingClans.length})
          </h2>
          {recruitingClans.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center text-[13px] text-white/40">
              ამ ფილტრით recruiting კლანი ვერ მოიძებნა.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recruitingClans.map((c) => (
                <Link key={c.id} href={`/clans/${c.slug}`} className="pubg-loadout-link block" data-variant="royale">
                  <div className="pubg-loadout-card relative overflow-hidden p-4">
                    <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                    <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-lime)]/70" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border border-white/10">
                          <AvatarImage src={c.avatar_url ?? undefined} className="object-cover" />
                          <AvatarFallback>{c.tag}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {c.emblem && <span className="text-[14px] leading-none">{c.emblem}</span>}
                            <span className="truncate text-[14px] font-black text-white">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider text-white/40">
                            <span className="text-amber-300/80">[{c.tag}]</span>
                            {c.game_slug && gameBySlug.get(c.game_slug) && <span>{gameBySlug.get(c.game_slug)!.name_ka}</span>}
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[12px] text-white/55">{c.recruit_note || c.description || "შემოუერთდი გუნდს."}</p>
                      {c.recruiting_roles && c.recruiting_roles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.recruiting_roles.slice(0, 5).map((r) => (
                            <span key={r} className="rounded-full border border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/10 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[var(--gr-lime)]">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-white/45">
                        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.clan_members[0]?.count ?? 1}</span>
                        <span className="text-indigo-300">LVL {c.level}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Looking for a clan */}
        <section id="looking" className="mt-10 scroll-mt-24">
          <h2 className="mb-4 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.16em] text-[var(--gr-violet-hi)]">
            <Radar className="h-4 w-4" /> ეძებენ კლანს ({lfcPlayers.length})
          </h2>
          {lfcPlayers.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center text-[13px] text-white/40">
              ჯერ არავინ ეძებს კლანს ამ ფილტრით.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lfcPlayers.map((p) => {
                const name = p.display_name || p.username;
                return (
                  <div key={p.id} className="pubg-loadout-link block" data-variant="strike">
                    <div className="pubg-loadout-card relative overflow-hidden p-4">
                      <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                      <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-[var(--gr-violet-hi)]/70" />
                      <div className="relative z-10 flex items-center gap-3">
                        <Link href={`/profile/${p.username}`} className="relative shrink-0">
                          <Avatar className="h-11 w-11 border border-white/10">
                            <AvatarImage src={p.avatar_url ?? undefined} className="object-cover" />
                            <AvatarFallback>{name.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          <OnlineDot lastSeenAt={p.last_seen_at} size={11} className="absolute -bottom-0.5 -right-0.5" />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/profile/${p.username}`} className="block truncate text-[13.5px] font-black text-white hover:text-[var(--gr-violet-hi)]">
                            {name}
                          </Link>
                          <div className="flex items-center gap-2 text-[10.5px] font-black uppercase tracking-wider text-white/40">
                            {p.level != null && <span>Lv{p.level}</span>}
                            {p.region && <span className="truncate">{p.region}</span>}
                          </div>
                        </div>
                        {canInvite && <InvitePlayerButton clanSlug={viewerClanSlug!} username={p.username} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
