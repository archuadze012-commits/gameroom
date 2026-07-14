import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Users, ShieldAlert, Trophy, Gauge, Radar, ShieldQuestion, ArrowRight, Shield } from "lucide-react";
import { getGameTournamentContext, getClanPowerRatings } from "@/lib/clan/context";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PremiumCard } from "@/components/ui/premium-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ClanListItem = {
  id: string;
  name: string;
  slug: string;
  tag: string;
  description: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  status: string;
  recruiting: boolean | null;
  recruit_note: string | null;
  emblem: string | null;
  clan_members: { count: number }[];
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: g } = await supabase.from("games").select("name_ka, icon_url").eq("slug", slug).maybeSingle();
  if (!g) return { title: "კლანები", robots: { index: false } };
  const title = `${g.name_ka} — კლანები`;
  const description = `${g.name_ka}-ის კლანები PLAYGAME.GE-ზე — შეუერთდი გუნდს ან შექმენი ახალი.`;
  return {
    title,
    description,
    alternates: { canonical: `/games/${slug}/clans` },
    openGraph: { title, description, url: `/games/${slug}/clans`, type: "website" },
  };
}

export default async function GameClansPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const [ctx, { sort }] = await Promise.all([getGameTournamentContext(slug), searchParams]);
  if (!ctx) notFound();
  const byRating = sort === "rating";

  const clansQuery = ctx.supabase
    .from("clans")
    .select(`
      id,
      name,
      slug,
      tag,
      description,
      avatar_url,
      xp,
      level,
      status,
      recruiting,
      recruit_note,
      emblem,
      clan_members(count)
    `)
    .eq("game_slug", slug)
    .order("xp", { ascending: false });

  const [{ data: clans }, powerRatings] = await Promise.all([clansQuery, getClanPowerRatings(ctx.supabase)]);

  let clanList = ((clans || []) as unknown as ClanListItem[]).map((c) => ({
    ...c,
    power: powerRatings.get(c.id)?.rating ?? null,
  }));
  if (byRating) {
    clanList = [...clanList].sort((a, b) => (b.power ?? -1) - (a.power ?? -1));
  }

  const sortHref = (s: "xp" | "rating") => (s === "rating" ? `/games/${slug}/clans?sort=rating` : `/games/${slug}/clans`);
  const userClan = ctx.clan;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 max-w-5xl">
        <PageHeader
          color="indigo"
          eyebrow={ctx.game.name_ka}
          title="კლანები"
          description="შეუერთდი გუნდს ან შექმენი ახალი, გაზარდეთ XP ერთად და მიიღეთ მონაწილეობა კლანურ ტურნირებში."
        />

        {/* My clan / create clan — big card entry point */}
        <Link
          href={userClan ? `/clans/${userClan.slug}` : `/clans/new?game=${slug}`}
          className="mt-6 pubg-loadout-link group block"
          data-variant="strike"
        >
          <article className="pubg-loadout-card relative overflow-hidden p-5">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[5] bg-amber-500/70" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400/80">{userClan ? "MY CLAN" : "NEW"}</p>
                <h3 className="mt-1.5 font-display text-[18px] font-black uppercase leading-[1.05] text-white sm:text-[20px]">
                  {userClan ? "ჩემი კლანი" : "შექმენი კლანი"}
                </h3>
              </div>
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 transition-transform group-hover:scale-105">
                {userClan ? <Shield className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
              </span>
            </div>
            <p className="relative z-10 mt-2 flex items-center gap-1 text-[12px] font-bold text-white/45">
              {userClan ? "გახსენი შენი კლანის გვერდი" : "დააარსე ახალი გუნდი"} <ArrowRight className="h-3.5 w-3.5" />
            </p>
          </article>
        </Link>

        {/* Finder — scoped to this game */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link href={`/clans/finder?game=${slug}#recruiting`} className="pubg-loadout-link group block" data-variant="royale">
            <article className="pubg-loadout-card relative overflow-hidden p-5">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[5] bg-[var(--gr-lime)]/70" />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--gr-lime)]/80">LFP</p>
                  <h3 className="mt-1.5 font-display text-[18px] font-black uppercase leading-[1.05] text-white sm:text-[20px]">
                    კლანები ეძებენ წევრებს
                  </h3>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--gr-lime)]/10 text-[var(--gr-lime)] transition-transform group-hover:scale-105">
                  <ShieldQuestion className="h-6 w-6" />
                </span>
              </div>
              <p className="relative z-10 mt-2 flex items-center gap-1 text-[12px] font-bold text-white/45">
                იპოვე შენთვის გუნდი <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </article>
          </Link>

          <Link href={`/clans/finder?game=${slug}#looking`} className="pubg-loadout-link group block" data-variant="strike">
            <article className="pubg-loadout-card relative overflow-hidden p-5">
              <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
              <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[4px] z-[5] bg-[var(--gr-violet-hi)]/70" />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--gr-violet-hi)]/80">LFC</p>
                  <h3 className="mt-1.5 font-display text-[18px] font-black uppercase leading-[1.05] text-white sm:text-[20px]">
                    მოთამაშეები ეძებენ კლანს
                  </h3>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--gr-violet)]/10 text-[var(--gr-violet-hi)] transition-transform group-hover:scale-105">
                  <Radar className="h-6 w-6" />
                </span>
              </div>
              <p className="relative z-10 mt-2 flex items-center gap-1 text-[12px] font-bold text-white/45">
                იპოვე წევრი შენი კლანისთვის <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </article>
          </Link>
        </div>

        {/* Sort toggle */}
        <div className="mt-6 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/30">დალაგება:</span>
          <Link
            href={sortHref("xp")}
            className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider transition-colors ${
              !byRating ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300" : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
            }`}
          >
            XP
          </Link>
          <Link
            href={sortHref("rating")}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider transition-colors ${
              byRating ? "border-[var(--gr-violet-hi)]/50 bg-[var(--gr-violet)]/15 text-[var(--gr-violet-hi)]" : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80"
            }`}
          >
            <Gauge className="h-3 w-3" /> Power Rating
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {clanList.map((clan) => (
            <Link key={clan.id} href={`/clans/${clan.slug}`} className="block h-full">
              <PremiumCard>
                <div className="p-5 flex flex-col gap-4 h-full">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                      <AvatarImage src={clan.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-indigo-500/10 text-indigo-400 font-bold">
                        {clan.tag}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate flex items-center gap-2 text-white drop-shadow-md">
                        {clan.emblem && <span className="shrink-0">{clan.emblem}</span>}
                        {clan.name}
                        <span className="text-[10px] font-mono text-indigo-300/80 px-1.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10">
                          [{clan.tag}]
                        </span>
                      </h3>
                      <p className="text-xs text-white/50 capitalize">{clan.status}</p>
                    </div>
                  </div>

                  {clan.recruiting && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--gr-lime)]">
                      ● ეძებს წევრებს
                    </span>
                  )}

                  <p className="text-sm text-white/60 line-clamp-2 h-10 font-medium">
                    {clan.description || "აღწერის გარეშე"}
                  </p>

                  <div className="flex items-center justify-between pt-3 mt-auto border-t border-white/5 text-sm">
                    <div className="flex items-center gap-1.5 text-white/50 font-medium">
                      <Users className="h-4 w-4" />
                      <span>{clan.clan_members[0]?.count ?? 1}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {clan.power != null && (
                        <span className="flex items-center gap-1 font-bold text-[var(--gr-violet-hi)]" title="Power Rating">
                          <Gauge className="h-4 w-4" />
                          <span className="tabular-nums">{clan.power}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                        <Trophy className="h-4 w-4" />
                        <span>LVL {clan.level}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </Link>
          ))}

          {(!clans || clans.length === 0) && (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <ShieldAlert className="h-12 w-12 text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white/50">{ctx.game.name_ka}-ზე ჯერ კლანი არ არის</h3>
              <p className="text-sm text-white/30 mt-1">იყავი პირველი ვინც შექმნის გუნდს!</p>
              <Button asChild className="mt-5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white">
                <Link href={`/clans/new?game=${slug}`}>
                  <Plus className="mr-2 h-4 w-4" /> კლანის შექმნა
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
