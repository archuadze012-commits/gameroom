import Link from "next/link";
import { Plus, Users, ShieldAlert, Trophy } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSession } from "@/lib/auth";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PremiumCard } from "@/components/ui/premium-card";

export const metadata = {
  title: "კლანები",
  description: "გეიმინგ კლანები — შეუერთდი გუნდს ან შექმენი შენი PLAYGAME.GE-ზე.",
  alternates: { canonical: "/clans" },
  openGraph: {
    title: "კლანები · PLAYGAME.GE",
    description: "გეიმინგ კლანები PLAYGAME.GE-ზე.",
    url: "/clans",
    type: "website",
  },
};

type ClanListItem = {
  id: string;
  name: string;
  slug: string;
  tag: string;
  description: string | null;
  avatar_url: string | null;
  game_slug: string | null;
  xp: number;
  level: number;
  status: string;
  clan_members: { count: number }[];
};

export default async function ClansPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const [sessionUser, { game: gameFilter }] = await Promise.all([
    getSession().catch(() => null),
    searchParams,
  ]);

  let clansQuery = supabase
    .from("clans")
    .select(`
      id,
      name,
      slug,
      tag,
      description,
      avatar_url,
      game_slug,
      xp,
      level,
      status,
      clan_members(count)
    `)
    .order("xp", { ascending: false });
  if (gameFilter) clansQuery = clansQuery.eq("game_slug", gameFilter);

  const [{ data: clans }, { data: gameRows }] = await Promise.all([
    clansQuery,
    supabase.from("games").select("slug, name_ka, icon_url").eq("active", true).order("name_ka", { ascending: true }),
  ]);

  const games = gameRows ?? [];
  const gameBySlug = new Map(games.map((g) => [g.slug, g]));
  const activeGame = gameFilter ? gameBySlug.get(gameFilter) : null;

  // Check if current user is in a clan
  let userClan: { slug: string } | null = null;
  if (sessionUser) {
    const { data: member } = await supabase
      .from("clan_members")
      .select("clans(slug)")
      .eq("user_id", sessionUser.id)
      .maybeSingle();
    userClan = (member?.clans as unknown as { slug: string } | null) ?? null;
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 max-w-5xl">
        <PageHeader
          color="indigo"
          eyebrow="გუნდები & კლანები"
          title={activeGame ? `${activeGame.name_ka} — კლანები` : "გაერთიანდი და ითამაშე"}
          description={
            activeGame
              ? `${activeGame.name_ka}-ის კლანები. შეუერთდი გუნდს ან შექმენი ახალი ამ თამაშისთვის.`
              : "მოძებნე შენთვის შესაფერისი კლანი ან შექმენი ახალი, გაზარდეთ XP ერთად და მიიღეთ მონაწილეობა კლანურ ტურნირებში."
          }
          actions={
            userClan ? (
              <Button asChild className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <Link href={`/clans/${userClan.slug}`}>ჩემი კლანი</Link>
              </Button>
            ) : (
              <Button asChild className="rounded-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                <Link href={gameFilter ? `/clans/new?game=${gameFilter}` : "/clans/new"}><Plus className="mr-2 h-4 w-4" /> კლანის შექმნა</Link>
              </Button>
            )
          }
        />

        {/* Game filter chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/clans"
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wider transition-colors ${
              !gameFilter
                ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white/80"
            }`}
          >
            ყველა
          </Link>
          {games.map((g) => (
            <Link
              key={g.slug}
              href={`/clans?game=${g.slug}`}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-black uppercase tracking-wider transition-colors ${
                gameFilter === g.slug
                  ? "border-indigo-500/50 bg-indigo-500/15 text-indigo-300"
                  : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white/80"
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

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((clans || []) as unknown as ClanListItem[]).map((clan) => (
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
                        {clan.name}
                        <span className="text-[10px] font-mono text-indigo-300/80 px-1.5 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/10">
                          [{clan.tag}]
                        </span>
                      </h3>
                      <p className="text-xs text-white/50 capitalize">{clan.status}</p>
                    </div>
                  </div>

                  {clan.game_slug && gameBySlug.get(clan.game_slug) && (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold text-indigo-300">
                      {gameBySlug.get(clan.game_slug)!.icon_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={gameBySlug.get(clan.game_slug)!.icon_url!} alt="" className="h-3.5 w-3.5 rounded object-cover" />
                      )}
                      {gameBySlug.get(clan.game_slug)!.name_ka}
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
                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                      <Trophy className="h-4 w-4" />
                      <span>LVL {clan.level}</span>
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </Link>
          ))}

          {(!clans || clans.length === 0) && (
            <div className="col-span-full py-20 text-center flex flex-col items-center">
              <ShieldAlert className="h-12 w-12 text-white/20 mb-4" />
              <h3 className="text-lg font-bold text-white/50">
                {activeGame ? `${activeGame.name_ka}-ზე ჯერ კლანი არ არის` : "ჯერ არცერთი კლანი არ შექმნილა"}
              </h3>
              <p className="text-sm text-white/30 mt-1">იყავი პირველი ვინც შექმნის გუნდს!</p>
              <Button asChild className="mt-5 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white">
                <Link href={gameFilter ? `/clans/new?game=${gameFilter}` : "/clans/new"}>
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
