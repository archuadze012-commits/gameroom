import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { getClanGameContext, getClanMatchResults, getClanPowerRatings } from "@/lib/clan/context";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { ClanSubPageHeader } from "@/components/clan/clan-subpage-header";
import { ClanMatchesLog, type ClanMatchRow } from "@/app/clans/[slug]/clan-matches-log";

export const dynamic = "force-dynamic";
export const metadata = { title: "მატჩები | კლანი", robots: { index: false } };

export default async function ClanMatchesPage({
  params,
}: {
  params: Promise<{ slug: string; clanSlug: string }>;
}) {
  const { slug, clanSlug } = await params;
  const ctx = await getClanGameContext(slug, clanSlug);
  if (!ctx) notFound();

  const [{ results }, powerRatings] = await Promise.all([
    getClanMatchResults(ctx.supabase, ctx.clan.id),
    getClanPowerRatings(ctx.supabase),
  ]);
  const powerRating = powerRatings.get(ctx.clan.id)?.rating ?? null;
  const matches: ClanMatchRow[] = results.map((r) => ({
    id: r.id,
    opponentName: r.opponentName,
    result: r.result,
    ourScore: r.ourScore,
    theirScore: r.theirScore,
    isPractice: r.isPractice,
    playedAt: r.playedAt,
    tournamentName: r.tournamentName,
    tournamentSlug: r.tournamentSlug,
  }));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="pink" />
      <div className="container relative mx-auto max-w-3xl px-4 py-8 lg:py-10">
        <ClanSubPageHeader
          clanSlug={clanSlug}
          clanName={ctx.clan.name}
          clanTag={ctx.clan.tag}
          clanAvatar={ctx.clan.avatar_url}
          gameName={ctx.game.name_ka}
          title="მატჩები"
          icon={Swords}
          tone="text-amber-400"
        />
        <p className="mb-4 text-[12.5px] text-white/40">ტურნირებსა და scrim-ებში ნათამაშები მატჩები — ავტომატურად ჩამოტვირთული შედეგებით.</p>
        <ClanMatchesLog matches={matches} powerRating={powerRating} />
      </div>
    </div>
  );
}
