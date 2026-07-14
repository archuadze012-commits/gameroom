import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Zap, Users, Gamepad2, ArrowRight, Share2, Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CinematicBackground } from "@/components/ui/cinematic-background";

export const dynamic = "force-dynamic";

type CardProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  region: string | null;
  level: number;
  xp: number;
  is_verified: boolean;
  favorite_game_slugs: string[] | null;
  referral_code: string | null;
};

async function fetchCard(username: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, region, level, xp, is_verified, favorite_game_slugs, referral_code")
    .ilike("username", username)
    .maybeSingle();
  return (data as CardProfile | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchCard(username);
  if (!profile) return { title: "მოთამაშე ვერ მოიძებნა | PlayGame" };
  const name = profile.display_name || profile.username;
  const title = `${name} — PlayGame.ge`;
  const description = `${name} • Level ${profile.level} • შემოუერთდი PlayGame-ს — ქართველი გეიმერების სოციალურ ქსელს 🎮`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GamerCardPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [profile, viewer] = await Promise.all([fetchCard(username), getSession().catch(() => null)]);
  if (!profile) notFound();

  const supabase = await createSupabaseServerClient();
  const [{ count: followers }, gamesRes] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    (profile.favorite_game_slugs && profile.favorite_game_slugs.length > 0
      ? supabase.from("games").select("slug, name_ka, icon_url").in("slug", profile.favorite_game_slugs.slice(0, 8))
      : Promise.resolve({ data: [] as { slug: string; name_ka: string; icon_url: string | null }[] })),
  ]);

  const games = (gamesRes.data ?? []) as { slug: string; name_ka: string; icon_url: string | null }[];
  const name = profile.display_name || profile.username;
  const isOwner = viewer?.id === profile.id;
  const joinHref = profile.referral_code ? `/i/${profile.referral_code}` : "/auth/signup";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="violet" />

      <div className="container relative mx-auto flex max-w-lg flex-col items-center px-4 py-10 lg:py-16">
        {/* Card */}
        <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--gr-border-hi)] bg-[var(--gr-bg-elev-1)] shadow-2xl">
          {/* Banner glow */}
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b from-[var(--gr-violet)]/40 to-transparent blur-3xl" />

          <div className="relative flex flex-col items-center px-6 pb-6 pt-9 text-center">
            {/* Avatar + level ring */}
            <div className="relative">
              <div className="rounded-full bg-[linear-gradient(135deg,var(--gr-violet),var(--gr-magenta))] p-[3px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar_url || "/default-avatar.svg"}
                  alt={name}
                  className="h-28 w-28 rounded-full border-2 border-[var(--gr-bg-elev-1)] object-cover"
                />
              </div>
              <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[var(--gr-violet-hi)]/50 bg-[var(--gr-bg-elev-2)] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[var(--gr-violet-hi)] shadow-lg">
                <Zap className="h-3 w-3" /> LVL {profile.level}
              </span>
            </div>

            {/* Name */}
            <h1 className="mt-6 flex items-center gap-2 font-display text-[24px] font-black text-white">
              {name}
              {profile.is_verified && <BadgeCheck className="h-5 w-5 text-[var(--gr-violet-hi)]" />}
            </h1>
            <p className="mt-0.5 text-[13px] text-white/50">@{profile.username}</p>

            {profile.region && (
              <p className="mt-2 flex items-center gap-1 text-[12.5px] text-white/55">
                <MapPin className="h-3.5 w-3.5" /> {profile.region}
              </p>
            )}

            {profile.bio && (
              <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-white/70">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="mt-5 grid w-full grid-cols-3 gap-2">
              <Stat icon={Zap} label="Level" value={profile.level} />
              <Stat icon={Users} label="Followers" value={followers ?? 0} />
              <Stat icon={Gamepad2} label="Games" value={games.length} />
            </div>

            {/* Favorite games */}
            {games.length > 0 && (
              <div className="mt-5 w-full">
                <div className="mb-2 text-left text-[11px] font-black uppercase tracking-[0.14em] text-white/40">საყვარელი თამაშები</div>
                <div className="flex flex-wrap gap-2">
                  {games.map((g) => (
                    <span key={g.slug} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-bold text-white/80">
                      {g.icon_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.icon_url} alt="" className="h-4 w-4 rounded object-cover" />
                      )}
                      {g.name_ka}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 w-full">
          {!viewer ? (
            <Link
              href={joinHref}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--gr-violet),var(--gr-magenta))] px-6 py-4 font-display text-[15px] font-black uppercase tracking-wider text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] transition-all hover:brightness-110"
            >
              შემოუერთდი {name}-ს PlayGame-ზე <ArrowRight className="h-5 w-5" />
            </Link>
          ) : isOwner ? (
            <div className="flex flex-col gap-2">
              <Link
                href="/invite"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--gr-violet-hi)]/40 bg-[var(--gr-violet)]/10 px-6 py-3.5 font-display text-[14px] font-black uppercase tracking-wider text-[var(--gr-violet-hi)] transition-colors hover:bg-[var(--gr-violet)]/20"
              >
                <Share2 className="h-4 w-4" /> გააზიარე შენი ბარათი
              </Link>
              <Link
                href={`/wrapped/${profile.username}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--gr-magenta)]/40 bg-[var(--gr-magenta)]/10 px-6 py-3.5 font-display text-[14px] font-black uppercase tracking-wider text-[var(--gr-magenta)] transition-colors hover:bg-[var(--gr-magenta)]/20"
              >
                <Sparkles className="h-4 w-4" /> ნახე შენი Wrapped
              </Link>
            </div>
          ) : (
            <Link
              href={`/profile/${profile.username}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-display text-[14px] font-black uppercase tracking-wider text-white transition-colors hover:bg-white/10"
            >
              ნახე პროფილი <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <Link href="/" className="mt-4 text-[12px] font-bold text-white/40 transition-colors hover:text-white/70">
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
      <Icon className="mx-auto h-4 w-4 text-[var(--gr-violet-hi)]" />
      <div className="mt-1 text-[18px] font-black tabular-nums text-white">{value.toLocaleString()}</div>
      <div className="text-[9.5px] font-black uppercase tracking-[0.1em] text-white/40">{label}</div>
    </div>
  );
}
