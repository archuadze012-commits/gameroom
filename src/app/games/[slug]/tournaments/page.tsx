import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getGameTournamentContext, getClanTournaments } from "@/lib/clan/context";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PageHeader } from "@/components/page-header";
import { ClanTournamentList } from "@/app/clans/[slug]/clan-tournaments";

export const dynamic = "force-dynamic";

const DUMMY_CLAN = "00000000-0000-0000-0000-000000000000";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: g } = await supabase.from("games").select("name_ka").eq("slug", slug).maybeSingle();
  return { title: g ? `${g.name_ka} — ტურნირები` : "ტურნირები", robots: { index: false } };
}

export default async function GameTournamentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getGameTournamentContext(slug);
  if (!ctx) notFound();

  const items = await getClanTournaments(ctx.supabase, ctx.game.id, ctx.clan?.id ?? DUMMY_CLAN, false);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="pink" />
      <div className="container relative mx-auto max-w-4xl px-4 py-10 lg:py-14">
        <PageHeader
          color="pink"
          eyebrow={ctx.game.name_ka}
          title="ტურნირები"
          description="ამ თამაშის ჩემპიონატები. კლანის ლიდერს/ოფიცერს შეუძლია კლანის რეგისტრაცია."
        />
        <div className="mt-8">
          {ctx.clan ? (
            ctx.canRegister ? (
              <p className="mb-4 text-[12.5px] text-white/50">დაარეგისტრირე კლანი ღია ტურნირებზე — captain იქნები შენ.</p>
            ) : (
              <p className="mb-4 text-[12.5px] text-white/40">კლანის რეგისტრაცია მხოლოდ ლიდერს/ოფიცერს შეუძლია.</p>
            )
          ) : null}
          <ClanTournamentList clanSlug={ctx.clan?.slug ?? ""} canRegister={ctx.canRegister} items={items} kind="tournaments" />
        </div>
      </div>
    </div>
  );
}
