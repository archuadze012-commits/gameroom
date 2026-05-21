import Link from "next/link";
import { mockGames, type MockGame } from "@/lib/mock-data";
import { GameIcon } from "@/components/game-icon";

export function ProfileGameRows({ slugs }: { slugs: string[] }) {
  const games = slugs
    .map((s) => mockGames.find((g) => g.slug === s))
    .filter(Boolean) as MockGame[];

  if (games.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[#1e2a44] py-8 text-center text-sm text-[#9fb3d1]">
        ჯერ არცერთი თამაში არ არის არჩეული.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {games.map((g, i) => {
        const isPrimary = i === 0;
        return (
          <Link
            key={g.slug}
            href={`/games/${g.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-[#1e2a44] bg-[#0f1626] p-3 transition-colors hover:border-cyan-400/40"
          >
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-secondary/40">
              <GameIcon game={g} size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{g.nameKa}</div>
              <div className="truncate text-xs text-[#9fb3d1]">
                {g.liveLfg} აქტიური LFG · {g.online} ონლაინ
              </div>
            </div>
            <span
              className={
                isPrimary
                  ? "rounded-md bg-[#0e3b2a] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#34d399]"
                  : "rounded-md bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400"
              }
            >
              {isPrimary ? "მთავარი" : "აქტიური"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
