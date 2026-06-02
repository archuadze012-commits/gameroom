import Link from "next/link";
import { ChevronRight, Heart, Play } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { GamerCard } from "@/components/ui/gamer-card";

// Games that currently have a lobby page. Add new slugs as more lobbies ship.
const GAMES_WITH_LOBBY: string[] = ["pubg-mobile"];

export function HomeFavoriteLobbies({ favoriteSlugs }: { favoriteSlugs: string[] }) {
  const lobbies = mockGames
    .filter((g) => GAMES_WITH_LOBBY.includes(g.slug))
    .filter((g) => favoriteSlugs.includes(g.slug));

  if (lobbies.length === 0) return null;

  return (
    <section className="mt-6 mb-6">
      <div className="mb-3 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-3.5 w-3.5 fill-[var(--gr-magenta)] text-[var(--gr-magenta)]" />
          <h2 className="font-display text-[12px] font-bold uppercase tracking-[0.18em] text-white/90">
            ჩემი თამაშები
          </h2>
        </div>
      </div>

      {lobbies.length === 1 ? (
        <GamerCard clipSize={14} hover className="w-full transition-transform duration-200 hover:-translate-y-0.5">
          <Link
            href={`/games/${lobbies[0].slug}/lobby`}
            className="relative flex w-full items-center justify-between px-4 py-3 sm:px-5 sm:py-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-sm bg-[var(--gr-amber)]/15 text-[var(--gr-amber)] ring-1 ring-[var(--gr-amber)]/40 sm:h-10 sm:w-10">
                <Play className="h-4 w-4 fill-current sm:h-5 sm:w-5" />
              </span>
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-amber)]">
                  ლობში გადასვლა
                </div>
                <div className="mt-0.5 font-display text-[15px] font-bold uppercase text-white sm:text-[17px]">
                  {lobbies[0].nameKa}
                </div>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--gr-violet-hi)] transition-transform group-hover:translate-x-1" />
          </Link>
        </GamerCard>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {lobbies.map((game) => (
            <GamerCard
              key={game.slug}
              clipSize={14}
              hover
              className="group flex-none w-[180px] transition-transform duration-200 hover:-translate-y-0.5 sm:w-[220px]"
            >
              <Link
                href={`/games/${game.slug}/lobby`}
                className="relative block aspect-[16/9] w-full overflow-hidden"
              >
                {game.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={game.coverUrl}
                    alt={game.nameKa}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-4xl">{game.emoji}</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,6,16,0.94)] via-[rgba(7,6,16,0.36)] to-transparent" />
                <div className="absolute right-1.5 top-1.5 flex items-center gap-1 bg-black/65 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--gr-amber)] ring-1 ring-[var(--gr-amber)]/40 backdrop-blur">
                  <Play className="h-2.5 w-2.5" />
                  ლობი
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2 py-1.5">
                  <span className="truncate font-display text-[11px] font-bold uppercase text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                    {game.nameKa}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/85 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </GamerCard>
          ))}
        </div>
      )}
    </section>
  );
}
