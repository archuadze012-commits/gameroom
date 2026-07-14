import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  FileText,
  MessageSquare,
  Gamepad2,
  Flame,
  Zap,
  Coins,
  Shield,
  Swords,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getWrappedData } from "@/lib/wrapped/data";
import { WrappedShare } from "./wrapped-share";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const data = await getWrappedData(username);
  if (!data) return { title: "Wrapped ვერ მოიძებნა | PlayGame" };
  const name = data.profile.display_name || data.profile.username;
  const title = `${name} — PlayGame Wrapped · ${data.season.labelKa}`;
  const description = `${name}-ის სეზონური რთანი: ${data.public.newFollowers} ახალი გამომწერი, ${data.public.postsPublished} პოსტი. ნახე შენი Wrapped 🎮`;
  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WrappedPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [data, viewer] = await Promise.all([
    getWrappedData(username),
    getSession().catch(() => null),
  ]);
  if (!data) notFound();

  const { season, profile, public: pub, private: priv } = data;
  const name = profile.display_name || profile.username;
  const isOwner = viewer?.id === profile.id;
  const joinHref = profile.referral_code
    ? `/i/${profile.referral_code}`
    : "/auth/signup";
  const topGameLabel =
    pub.topGame?.source === "favorite"
      ? "საყვარელი თამაში"
      : pub.topGame?.source === "clan"
        ? "კლანის თამაში"
        : "სეზონის თამაში";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="violet" />

      <div className="container relative mx-auto flex max-w-xl flex-col items-center px-4 py-10 lg:py-14">
        <Eyebrow tone="violet" className="mb-4">
          <Sparkles className="h-3 w-3" /> PLAYGAME WRAPPED · {season.labelKa}
        </Eyebrow>

        {/* Card */}
        <div className="pubg-loadout-card relative w-full overflow-hidden rounded-3xl px-6 pb-7 pt-8 shadow-2xl sm:px-8">
          <span aria-hidden className="pubg-loadout-field absolute inset-0" />
          <span
            aria-hidden
            className="pubg-loadout-rail absolute left-0 top-0 h-full w-[5px]"
          />
          <span
            aria-hidden
            className="pubg-loadout-corner absolute right-0 top-0 h-32 w-32 opacity-50"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b from-[var(--gr-violet)]/40 to-transparent blur-3xl"
          />

          <div className="relative z-[1] flex flex-col items-center text-center">
            {/* Identity */}
            <div className="rounded-full bg-[linear-gradient(135deg,var(--gr-violet),var(--gr-magenta))] p-[3px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url || "/default-avatar.svg"}
                alt={name}
                className="h-24 w-24 rounded-full border-2 border-[var(--gr-bg-elev-1)] object-cover"
              />
            </div>
            <h1 className="mt-4 font-display text-[22px] font-black uppercase tracking-tight text-white">
              {name}
            </h1>
            <p className="mt-0.5 text-[13px] text-white/50">
              @{profile.username} · {season.labelKa}
            </p>

            {data.isThin ? (
              <ThinState data={data} isOwner={isOwner} />
            ) : (
              <>
                {/* Hero stat — new followers this season */}
                <div className="mt-6 w-full rounded-2xl border border-[var(--gr-violet-hi)]/30 bg-[var(--gr-violet)]/10 px-5 py-5">
                  <div className="text-[52px] font-black leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(139,92,246,0.5)]">
                    +{pub.newFollowers.toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--gr-violet-hi)]">
                    ახალი გამომწერი ამ სეზონზე
                  </div>
                </div>

                {/* Top game */}
                {pub.topGame && (
                  <div className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
                    {pub.topGame.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pub.topGame.icon_url}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--gr-violet)]/20">
                        <Gamepad2 className="h-5 w-5 text-[var(--gr-violet-hi)]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                        {topGameLabel}
                      </div>
                      <div className="truncate font-display text-[15px] font-black text-white">
                        {pub.topGame.name_ka}
                      </div>
                    </div>
                  </div>
                )}

                {/* Public stat grid */}
                <div className="mt-4 grid w-full grid-cols-3 gap-2">
                  <Stat icon={FileText} label="პოსტი" value={pub.postsPublished} />
                  <Stat
                    icon={Swords}
                    label="LFG აქტივობა"
                    value={pub.lfgActivity}
                  />
                  <Stat
                    icon={MessageSquare}
                    label="კომენტარი"
                    value={pub.engagementGiven}
                  />
                </div>

                {/* Level + streak — current-state context (cumulative, honest) */}
                <div className="mt-2 grid w-full grid-cols-2 gap-2">
                  <Stat icon={Zap} label="მიმდინარე დონე" value={profile.level} />
                  <Stat
                    icon={Flame}
                    label="სტრიკი (დღე)"
                    value={profile.dailyStreak}
                  />
                </div>

                {/* Clan */}
                {pub.clan && (
                  <div className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-[var(--gr-lime)]/20 bg-[var(--gr-lime)]/5 px-4 py-3 text-left">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--gr-lime)]/15">
                      <Shield className="h-5 w-5 text-[var(--gr-lime)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">
                        {pub.clan.joinedThisSeason
                          ? "ახალი კლანი ამ სეზონზე"
                          : "შენი კლანი"}
                      </div>
                      <div className="truncate font-display text-[15px] font-black text-white">
                        {pub.clan.name}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-[var(--gr-lime)]/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--gr-lime)]">
                      LVL {pub.clan.level}
                    </span>
                  </div>
                )}

                {/* Owner-only private stats */}
                {isOwner && (
                  <div className="mt-4 w-full">
                    <div className="mb-2 text-left text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                      მხოლოდ შენ ხედავ
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Stat
                        icon={MessageSquare}
                        label="შეტყობინება"
                        value={priv.messagesSent}
                      />
                      <Stat
                        icon={Coins}
                        label="მოგებული NC"
                        value={priv.ncEarned}
                      />
                    </div>
                  </div>
                )}

                {data.joinedMidSeason && (
                  <p className="mt-4 text-[11.5px] leading-relaxed text-white/50">
                    შემოუერთდი ამ სეზონის შუაში — რიცხვები მხოლოდ შენს აქტიურ
                    პერიოდს ფარავს.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 w-full">
          {isOwner ? (
            <WrappedShare
              path={`/wrapped/${profile.username}`}
              label="გააზიარე შენი Wrapped"
            />
          ) : !viewer ? (
            <Link
              href={joinHref}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--gr-violet),var(--gr-magenta))] px-6 py-4 font-display text-[15px] font-black uppercase tracking-wider text-white shadow-[0_0_28px_rgba(139,92,246,0.4)] transition-all hover:brightness-110"
            >
              შექმენი შენი Wrapped <ArrowRight className="h-5 w-5" />
            </Link>
          ) : (
            <Link
              href={`/profile/${profile.username}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-display text-[14px] font-black uppercase tracking-wider text-white transition-colors hover:bg-white/10"
            >
              ნახე პროფილი <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <Link
          href={`/g/${profile.username}`}
          className="mt-4 text-[12px] font-bold text-white/40 transition-colors hover:text-white/70"
        >
          gamer card →
        </Link>
      </div>
    </div>
  );
}

function ThinState({
  data,
  isOwner,
}: {
  data: NonNullable<Awaited<ReturnType<typeof getWrappedData>>>;
  isOwner: boolean;
}) {
  const { season } = data;
  return (
    <div className="mt-6 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-6 text-center">
      <Sparkles className="mx-auto h-7 w-7 text-[var(--gr-violet-hi)]" />
      <div className="mt-3 font-display text-[17px] font-black text-white">
        სეზონი ჯერ გრძელდება
      </div>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-white/60">
        {isOwner
          ? `${season.labelKa} ჯერ იწერება. დარჩა ~${season.daysRemaining} დღე — იყავი აქტიური და დაბრუნდი სეზონის ბოლოს სრული Wrapped-ისთვის.`
          : `${season.labelKa} ჯერ იწერება — რთანი სეზონის ბოლოს იქნება მზად.`}
      </p>
      {isOwner && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat
            icon={Users}
            label="გამომწერი"
            value={data.public.newFollowers}
          />
          <Stat
            icon={FileText}
            label="პოსტი"
            value={data.public.postsPublished}
          />
          <Stat icon={Zap} label="დონე" value={data.profile.level} />
        </div>
      )}
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
      <div className="mt-1 text-[18px] font-black tabular-nums text-white">
        {value.toLocaleString()}
      </div>
      <div className="text-[9px] font-black uppercase tracking-[0.08em] text-white/40">
        {label}
      </div>
    </div>
  );
}
