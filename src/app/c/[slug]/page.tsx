import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy, Users, Zap, ArrowRight, Shield, Gamepad2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getClanTrophyData } from "@/lib/clan/context";
import { accentOrDefault } from "@/lib/clan/cosmetics";
import { CinematicBackground } from "@/components/ui/cinematic-background";

export const dynamic = "force-dynamic";

type CardClan = {
  id: string;
  name: string;
  slug: string;
  tag: string;
  description: string | null;
  avatar_url: string | null;
  level: number | null;
  status: string;
  recruiting: boolean | null;
  game_slug: string | null;
  emblem: string | null;
  accent_color: string | null;
  clan_members: { role: string; profiles: { id: string } | null }[] | null;
};

async function fetchClan(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("clans")
    .select("id, name, slug, tag, description, avatar_url, level, status, recruiting, game_slug, emblem, accent_color, clan_members ( role, profiles ( id ) )")
    .eq("slug", slug)
    .maybeSingle();
  return (data as unknown as CardClan | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const clan = await fetchClan(slug);
  if (!clan) return { title: "კლანი ვერ მოიძებნა | PlayGame" };
  const title = `${clan.name} [${clan.tag}] — PlayGame.ge`;
  const description = `${clan.name} • დონე ${clan.level ?? 1} • შემოუერთდი კლანს PlayGame-ზე 🎮`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ClanCardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [clan, viewer] = await Promise.all([fetchClan(slug), getSession().catch(() => null)]);
  if (!clan) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ stats }, gameRes] = await Promise.all([
    getClanTrophyData(supabase, clan.id),
    clan.game_slug
      ? supabase.from("games").select("slug, name_ka, icon_url").eq("slug", clan.game_slug).maybeSingle()
      : Promise.resolve({ data: null as { slug: string; name_ka: string; icon_url: string | null } | null }),
  ]);

  const game = gameRes.data as { slug: string; name_ka: string; icon_url: string | null } | null;
  const members = clan.clan_members ?? [];
  const memberCount = members.length;
  const isMember = !!viewer && members.some((m) => m.profiles?.id === viewer.id);
  const level = clan.level ?? 1;
  const accent = accentOrDefault(clan.accent_color);
  const ringGradient = `linear-gradient(135deg, ${accent.hex}, ${accent.hex2})`;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />

      <div className="container relative mx-auto flex max-w-lg flex-col items-center px-4 py-10 lg:py-16">
        {/* Card */}
        <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--gr-border-hi)] bg-[var(--gr-bg-elev-1)] shadow-2xl">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full blur-3xl" style={{ background: `linear-gradient(to bottom, ${accent.hex}66, transparent)` }} />

          <div className="relative flex flex-col items-center px-6 pb-6 pt-9 text-center">
            {/* Avatar + level badge */}
            <div className="relative">
              <div className="rounded-3xl p-[3px]" style={{ background: ringGradient }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={clan.avatar_url || "/default-avatar.svg"}
                  alt={clan.name}
                  className="h-28 w-28 rounded-3xl border-2 border-[var(--gr-bg-elev-1)] object-cover"
                />
              </div>
              <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-indigo-400/50 bg-[var(--gr-bg-elev-2)] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-300 shadow-lg">
                <Zap className="h-3 w-3" /> LVL {level}
              </span>
            </div>

            {/* Name + tag */}
            <div className="mt-6 flex items-center gap-2">
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[12px] font-black uppercase tracking-wider text-amber-300">
                [{clan.tag}]
              </span>
              {clan.recruiting && (
                <span className="flex items-center gap-1 rounded-md border border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-[var(--gr-lime)]">
                  ეძებს წევრებს
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-[24px] font-black text-white">{clan.emblem ? `${clan.emblem} ` : ""}{clan.name}</h1>

            {game && (
              <Link
                href={`/games/${game.slug}`}
                className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold text-indigo-300 transition-opacity hover:opacity-80"
              >
                {game.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={game.icon_url} alt="" className="h-4 w-4 rounded object-cover" />
                ) : (
                  <Gamepad2 className="h-3.5 w-3.5" />
                )}
                {game.name_ka}
              </Link>
            )}

            {clan.description && (
              <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-white/70">{clan.description}</p>
            )}

            {/* Stats */}
            <div className="mt-5 grid w-full grid-cols-3 gap-2">
              <Stat icon={Zap} label="დონე" value={level} />
              <Stat icon={Users} label="წევრი" value={memberCount} />
              <Stat icon={Trophy} label="თასი" value={stats.championships} />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 w-full">
          {isMember ? (
            <Link
              href={`/clans/${clan.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-6 py-3.5 font-display text-[14px] font-black uppercase tracking-wider text-indigo-200 transition-colors hover:bg-indigo-500/20"
            >
              <Shield className="h-4 w-4" /> ნახე კლანი
            </Link>
          ) : (
            <Link
              href={`/clans/${clan.slug}`}
              style={{ background: ringGradient }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-display text-[15px] font-black uppercase tracking-wider text-white shadow-[0_0_28px_rgba(0,0,0,0.3)] transition-all hover:brightness-110"
            >
              შემოუერთდი {clan.name}-ს <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>

        <Link
          href={clan.game_slug ? `/games/${clan.game_slug}/clans` : "/games"}
          className="mt-4 text-[12px] font-bold text-white/40 transition-colors hover:text-white/70"
        >
          playgame.ge
        </Link>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-indigo-300" />
      <div className="mt-1 text-[18px] font-black tabular-nums text-white">{value.toLocaleString()}</div>
      <div className="text-[9.5px] font-black uppercase tracking-[0.1em] text-white/40">{label}</div>
    </div>
  );
}
