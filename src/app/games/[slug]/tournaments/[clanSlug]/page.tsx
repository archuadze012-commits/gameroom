import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { getClanGameContext, getClanTournaments } from "@/lib/clan/context";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { ClanSubPageHeader } from "@/components/clan/clan-subpage-header";
import { ClanTournamentList } from "@/app/clans/[slug]/clan-tournaments";

export const dynamic = "force-dynamic";
export const metadata = { title: "ტურნირები | კლანი", robots: { index: false } };

export default async function ClanTournamentsPage({
  params,
}: {
  params: Promise<{ slug: string; clanSlug: string }>;
}) {
  const { slug, clanSlug } = await params;
  const ctx = await getClanGameContext(slug, clanSlug);
  if (!ctx) notFound();

  const items = await getClanTournaments(ctx.supabase, ctx.game.id, ctx.clan.id, false);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="pink" />
      <div className="container relative mx-auto max-w-4xl px-4 py-8 lg:py-10">
        <ClanSubPageHeader
          clanSlug={clanSlug}
          clanName={ctx.clan.name}
          clanTag={ctx.clan.tag}
          clanAvatar={ctx.clan.avatar_url}
          gameName={ctx.game.name_ka}
          title="ტურნირები"
          icon={Trophy}
          tone="text-amber-400"
        />
        {ctx.canManage ? (
          <p className="mb-4 text-[12.5px] text-white/50">დაარეგისტრირე კლანი ღია ტურნირებზე — captain იქნები შენ.</p>
        ) : (
          <p className="mb-4 text-[12.5px] text-white/40">კლანის რეგისტრაცია მხოლოდ ლიდერს/ოფიცერს შეუძლია.</p>
        )}
        <ClanTournamentList clanSlug={clanSlug} canRegister={ctx.canManage} items={items} kind="tournaments" />
      </div>
    </div>
  );
}
