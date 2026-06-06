import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { mockGames } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { DiscordVoiceDashboard } from "@/components/discord-voice-dashboard";


const cutLg = "polygon(0 0, calc(100% - 32px) 0, 100% 32px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(236,72,153,0.98), rgba(192,38,211,0.95))";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const supabase = await createSupabaseServerClient();
  const { data: dbGame } = await supabase.from("games").select("*").eq("slug", slug).single();

  const nameKa = dbGame ? dbGame.name_ka : mockGames.find((g) => g.slug === slug)?.nameKa;

  return {
    title: nameKa ? `${nameKa} — ხმოვანი ოთახები` : "ხმოვანი ოთახები",
  };
}

export default async function DiscordVoiceChannelsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: dbGame } = await supabase.from("games").select("*").eq("slug", slug).single();

  const game = dbGame
    ? {
        slug: dbGame.slug,
        nameKa: dbGame.name_ka,
        nameEn: dbGame.name_en,
        description: dbGame.description ?? "",
        accent: dbGame.accent_color ?? "",
        emoji: dbGame.emoji ?? "🎮",
        iconUrl: dbGame.icon_url ?? undefined,
        coverUrl: dbGame.cover_url ?? undefined,
        players: 0,
        online: 0,
        liveLfg: 0,
        favoritedBy: 0,
      }
    : mockGames.find((entry) => entry.slug === slug);

  if (!game) notFound();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      {game.coverUrl && (
        <div className="relative h-48 overflow-hidden border-b border-[var(--gr-border)] sm:h-56 lg:h-64">
          <div className={`absolute inset-0 bg-gradient-to-br ${game.accent}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={game.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "top center" }}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(8,6,15,0.2) 0%, rgba(8,6,15,0.6) 100%)" }}
          />
        </div>
      )}

      <div className="container relative mx-auto px-4 py-8 lg:py-10">
        <Link
          href={`/games/${game.slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {game.nameKa}
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow tone="violet">DISCORD VOICE</Eyebrow>
            <DisplayHeading as="h1" size="lg" className="mt-2">
              ხმოვანი ოთახები
            </DisplayHeading>
            <p className="mt-1 text-[13px] text-[var(--gr-text-mute)]">
              შემოუერთდი ხმოვან ოთახებს და ითამაშე თიმმეითებთან ერთად
            </p>
          </div>
        </div>

        <article
          className="relative isolate"
          style={{ background: cardBorder, padding: 1, clipPath: cutLg }}
        >
          <div
            className="relative overflow-hidden bg-[#120b1d] p-6 shadow-[inset_0_0_0_1px_rgba(236,72,153,0.14)] md:p-8"
            style={{ clipPath: cutLg }}
          >
            <div className="relative z-[1]">
              <DiscordVoiceDashboard gameSlug={game.slug} />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
