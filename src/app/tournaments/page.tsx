import Link from "next/link";
import { Trophy, Users, Calendar } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { unstable_cache } from "next/cache";

export const metadata = { title: "ჩემპიონატები" };

const statusLabel: Record<string, string> = {
  open: "რეგისტრაცია",
  checkin: "Check-in",
  live: "LIVE",
  completed: "დასრულდა",
};

const formatLabels: Record<string, string> = {
  single_elim: "Single Elimination",
  double_elim: "Double Elimination",
  round_robin: "Round Robin",
};

type TournamentRow = {
  id: string;
  slug: string;
  name: string;
  banner_url: string | null;
  format: string;
  status: string;
  prize_pool: string | null;
  max_participants: number | null;
  starts_at: string | null;
  tournament_participants: { id: string }[] | null;
  games: { name_ka: string | null; emoji: string | null } | null;
};

type TournamentCard = {
  id: string;
  slug: string;
  name: string;
  banner: string;
  format: string;
  status: string;
  prizePool: string;
  participants: { current: number; max: number };
  startsAt: string;
  game: { nameKa: string | null; emoji: string | null } | null;
};

const getTournaments = unstable_cache(
  async () => {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("tournaments")
      .select(`
        id,
        name,
        slug,
        description,
        banner_url,
        format,
        max_participants,
        prize_pool,
        starts_at,
        status,
        games:game_id (
          slug,
          name_ka,
          emoji
        ),
        tournament_participants (
          id
        )
      `)
      .neq("status", "draft")
      .order("starts_at", { ascending: true });
    return data;
  },
  ["tournaments"],
  { revalidate: 120, tags: ["tournaments"] },
);

export default async function TournamentsPage() {
  const dbTournaments = await getTournaments();

  const tournaments = ((dbTournaments ?? []) as unknown as TournamentRow[]).map((t) => {
    const participantsCount = t.tournament_participants?.length || 0;
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      banner: t.banner_url || "from-violet-500/40 via-pink-500/20 to-transparent",
      format: formatLabels[t.format] || t.format,
      status: t.status,
      prizePool: t.prize_pool || "0 GEL",
      participants: { current: participantsCount, max: t.max_participants || 8 },
      startsAt: t.starts_at ? format(new Date(t.starts_at), "yyyy-MM-dd HH:mm") : "გამოცხადდება",
      game: t.games ? { nameKa: t.games.name_ka, emoji: t.games.emoji } : null,
    };
  });

  const grouped = {
    live: tournaments.filter((t) => t.status === "live"),
    upcoming: tournaments.filter((t) => t.status === "open" || t.status === "checkin"),
    completed: tournaments.filter((t) => t.status === "completed"),
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Premium Cinematic Background */}
      <CinematicBackground color="pink" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        
        <PageHeader
          color="pink"
          eyebrow="ჩემპიონატები"
          title="ტურნირები"
          description="თემიდან გასული ჩემპიონატები. დარეგისტრირდი, უყურე და მოიგე პრემიუმ პრიზები."
        />

        <div className="space-y-16 mt-12">
          <Section eyebrow="მიმდინარეობს" title="LIVE" color="cyan" tournaments={grouped.live} />
          <Section eyebrow="მომავალი" title="დარეგისტრირდი" color="violet" tournaments={grouped.upcoming} />
          <Section eyebrow="არქივი" title="დასრულებული" color="neutral" tournaments={grouped.completed} />
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  color,
  tournaments,
}: {
  eyebrow: string;
  title: string;
  color: "cyan" | "violet" | "neutral";
  tournaments: TournamentCard[];
}) {
  if (tournaments.length === 0) return null;
  
  const textColor = color === "cyan" ? "text-cyan-400" : color === "violet" ? "text-violet-400" : "text-white/40";
  const dropShadow = color === "cyan" ? "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" : color === "violet" ? "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "";

  return (
    <section>
      <div className="mb-6">
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${textColor} ${dropShadow}`}>
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-[26px] font-black uppercase text-white drop-shadow-md">
          {title}
        </h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tournaments.map((t) => {
          const game = t.game;
          const isLive = t.status === "live";
          const fillPct = Math.min(100, Math.round((t.participants.current / t.participants.max) * 100));
          
          return (
            <Link key={t.slug} href={`/tournaments/${t.slug}`} className="group block">
              <article className="neon-frame flex h-full flex-col rounded-[20px]">
                <div className="relative flex h-full flex-col bg-[#0a0714] rounded-[18.5px] overflow-hidden">
                  
                  {/* Glowing background */}
                  <div aria-hidden className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.1),transparent_60%)]`} />

                  {/* Top Ribbon */}
                  {isLive && (
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 via-pink-400 to-violet-400 z-10 animate-pulse" />
                  )}

                  <div className="relative flex-1 p-6 space-y-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70">
                        {game?.emoji} {game?.nameKa}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                        isLive 
                          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)] animate-pulse" 
                          : t.status === "open" || t.status === "checkin"
                            ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                            : "border-white/10 bg-white/5 text-white/40"
                      }`}>
                        {statusLabel[t.status] ?? t.status}
                      </span>
                    </div>

                    <h3 className="font-display text-[20px] font-black uppercase leading-tight text-white drop-shadow-sm group-hover:text-pink-400 transition-colors">
                      {t.name}
                    </h3>

                    <div className="space-y-2.5 pt-2 border-t border-white/5 text-[12.5px]">
                      <div className="flex items-center gap-3">
                        <Trophy className="h-4 w-4 text-pink-400 drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]" />
                        <span className="font-display text-[15px] font-black tabular-nums text-pink-400">{t.prizePool}</span>
                      </div>
                      <div className="flex items-center gap-3 text-white/50">
                        <Users className="h-4 w-4 text-violet-400" />
                        <span><span className="font-bold text-white/80 tabular-nums">{t.participants.current}/{t.participants.max}</span> მონაწილე</span>
                      </div>
                      <div className="flex items-center gap-3 text-white/50">
                        <Calendar className="h-4 w-4 text-cyan-400" />
                        <span>{t.startsAt}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)] transition-all duration-1000"
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                        <span>{t.format}</span>
                        <span className="tabular-nums">{fillPct}%</span>
                      </div>
                    </div>

                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
