import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { Gift, Users, Sparkles, Coins, CheckCircle2, Clock, Trophy, Crown } from "lucide-react";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/url";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { PageHeader } from "@/components/page-header";
import { InviteLinkCard } from "./invite-link-card";

export const metadata = { title: "მოიწვიე მეგობარი | PlayGame" };
export const dynamic = "force-dynamic";

// Diminishing scale (see process_referral_qualification): full rate for the
// first 3 qualified invites, reduced after that. These constants are the
// headline (first-invite) rate shown in the marketing copy below.
const REFERRER_REWARD = 1000;
const REFERRED_REWARD = 500;
const LEO_IMG = "/characters/gameroom-vanguard-guide.webp";

type InviteeRow = {
  referred_id: string;
  status: string;
  created_at: string;
  referrer_reward: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default async function InvitePage() {
  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login?next=/invite");

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, username")
    .eq("id", user.id)
    .maybeSingle();

  const code = (profile as { referral_code?: string } | null)?.referral_code ?? "";
  const username = (profile as { username?: string } | null)?.username ?? "";

  const { data: referralRows } = await supabase
    .from("referrals")
    .select("referred_id, status, created_at, referrer_reward")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (referralRows ?? []) as Array<Pick<InviteeRow, "referred_id" | "status" | "created_at" | "referrer_reward">>;

  // Hydrate invitee profiles in one round trip.
  let invitees: InviteeRow[] = [];
  if (rows.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", rows.map((r) => r.referred_id));
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    invitees = rows.map((r) => {
      const p = byId.get(r.referred_id);
      return {
        ...r,
        username: p?.username ?? null,
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });
  }

  const totalInvited = invitees.length;
  const activated = invitees.filter((i) => i.status === "rewarded").length;
  const earned = invitees.reduce((sum, i) => sum + (i.status === "rewarded" ? i.referrer_reward : 0), 0);

  // Top-inviters leaderboard (public-safe RPC — counts only).
  const { data: topReferrers } = await supabase.rpc("get_top_referrers", { p_limit: 10 });
  const leaderboard = topReferrers ?? [];

  // Milestone tiers — bonus NC at 3 / 10 / 25 activated invites.
  const MILESTONES = [
    { n: 3, bonus: 2000 },
    { n: 10, bonus: 7500 },
    { n: 25, bonus: 20000 },
  ];
  const nextMilestone = MILESTONES.find((m) => m.n > activated) ?? null;

  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "";
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const serverOrigin = getSiteOrigin() ?? (host ? `${proto}://${host}` : "");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="pink" />

      <div className="container relative mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <PageHeader
          color="pink"
          eyebrow="Refer & Earn"
          title={
            <span className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-pink-500/30 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                <Gift className="h-5 w-5 text-pink-400" />
              </span>
              მოიწვიე მეგობარი
            </span>
          }
          description={`გააზიარე ბმული — როცა მეგობარი შემოგვიერთდება და გააქტიურდება, შენ +${REFERRER_REWARD} NC მიიღებ, ის კი +${REFERRED_REWARD} NC-ს (პირველი 3 მოწვევისთვის — შემდეგ ჯილდო მცირდება).`}
        />

        {/* How it works */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Sparkles, title: "გააზიარე", text: "გაუგზავნე შენი ბმული მეგობარს", variant: "room", rail: "bg-cyan-500/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]" },
            { icon: Users, title: "ის შემოგვიერთდება", text: "დარეგისტრირდება შენი ბმულით", variant: "support", rail: "bg-[var(--gr-lime)]/80 shadow-[0_0_8px_rgba(132,204,22,0.8)]" },
            { icon: Coins, title: "მიიღეთ ჯილდო", text: `+${REFERRER_REWARD} NC შენ, +${REFERRED_REWARD} NC მას (პირველი 3 მოწვევა)`, variant: "royale", rail: "bg-pink-500/80 shadow-[0_0_8px_rgba(236,72,153,0.8)]" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="pubg-loadout-link block" data-variant={s.variant}>
                <div className="pubg-loadout-card relative overflow-hidden p-4 h-full min-h-[110px]">
                  <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                  <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] ${s.rail}`} />
                  <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-10 w-10 opacity-20 z-[5]" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/40 text-white/90">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-[13px] font-black text-white">{s.title}</span>
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">{s.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Invite link */}
        <div className="mt-6">
          {code ? (
            <InviteLinkCard code={code} username={username} serverOrigin={serverOrigin} />
          ) : (
            <div className="pubg-loadout-link block" data-variant="room">
              <div className="pubg-loadout-card relative overflow-hidden p-6 text-center text-[13px] text-white/50">
                <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-blue-500" />
                <span className="relative z-10">
                  მოსაწვევი კოდი მზადდება — განაახლე გვერდი წამში.
                </span>
              </div>
            </div>
          )}
          {username && (
            <div className="mt-2 flex flex-wrap items-center justify-end gap-3 text-[12px]">
              <Link href={`/g/${username}`} className="font-bold text-white/50 transition-colors hover:text-white/80">
                ბარათის ნახვა →
              </Link>
              <a
                href={`/g/${username}/opengraph-image`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[var(--gr-violet-hi)] transition-colors hover:brightness-125"
              >
                ბარათის სურათი ⬇
              </a>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat icon={Users} label="მოწვეული" value={totalInvited} tone="violet" />
          <Stat icon={CheckCircle2} label="გააქტიურდა" value={activated} tone="lime" />
          <Stat icon={Coins} label="მიღებული NC" value={earned} tone="pink" />
        </div>

        {/* Milestones */}
        <div className="mt-6 pubg-loadout-link block" data-variant="royale">
          <div className="pubg-loadout-card relative overflow-hidden p-5">
            <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
            <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-amber-500/80" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.12em] text-white">
                  <Trophy className="h-4 w-4 text-amber-400" /> ეტაპობრივი ბონუსები
                </div>
                {nextMilestone && (
                  <span className="text-[11px] font-black text-amber-300">
                    {activated}/{nextMilestone.n} → +{nextMilestone.bonus.toLocaleString()} NC
                  </span>
                )}
              </div>
              {nextMilestone ? (
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--gr-amber),var(--gr-magenta))] transition-[width] duration-500"
                    style={{ width: `${Math.min(100, (activated / nextMilestone.n) * 100)}%` }}
                  />
                </div>
              ) : (
                <p className="text-[12.5px] text-[var(--gr-lime)]">ყველა ეტაპი დაფარულია — ლეგენდა ხარ! 🏆</p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {MILESTONES.map((m) => {
                  const done = activated >= m.n;
                  return (
                    <div
                      key={m.n}
                      className={`rounded-xl border px-2 py-2.5 text-center ${
                        done
                          ? "border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/[0.08]"
                          : "border-white/[0.06] bg-white/[0.02]"
                      }`}
                    >
                      <div className={`text-[15px] font-black tabular-nums ${done ? "text-[var(--gr-lime)]" : "text-white/80"}`}>
                        {m.n} მოწვევა
                      </div>
                      <div className={`text-[11px] font-black ${done ? "text-[var(--gr-lime)]/80" : "text-white/40"}`}>
                        +{m.bonus.toLocaleString()} NC
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Invitee list */}
        <div className="mt-6">
          <h2 className="mb-3 text-[13px] font-black uppercase tracking-[0.14em] text-white/50">მოწვეულები</h2>
          {invitees.length === 0 ? (
            <div className="pubg-loadout-link block" data-variant="room">
              <div className="pubg-loadout-card relative overflow-hidden flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                <span aria-hidden className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-16 w-16 opacity-10 z-[5]" />

                <div className="relative z-10 flex flex-col items-center gap-3">
                  <Image src={LEO_IMG} alt="ვანგუარდი ლეო" width={72} height={72} className="h-18 w-18 rounded-2xl object-cover object-top ring-1 ring-[var(--gr-border-hi)]" />
                  <p className="text-[13.5px] font-bold text-white/80">ჯერ არავინ მოგიწვევია</p>
                  <p className="max-w-xs text-[12.5px] leading-relaxed text-white/55">
                    გააზიარე ბმული Discord-ზე, სოც-ქსელში ან პირად ჩატში — პირველი მოწვევა შენი +{REFERRER_REWARD} NC-ია.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {invitees.map((i) => (
                <li key={i.referred_id} className="pubg-loadout-link block" data-variant={i.status === "rewarded" ? "support" : "royale"}>
                  <div className="pubg-loadout-card relative overflow-hidden px-3.5 py-3 flex items-center gap-3">
                    <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
                    <span aria-hidden className={`pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5] ${
                      i.status === "rewarded"
                        ? "bg-[var(--gr-lime)] shadow-[0_0_8px_rgba(132,204,22,0.8)]"
                        : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    }`} />
                    
                    <div className="relative z-10 flex items-center gap-3 w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={i.avatar_url || "/default-avatar.svg"}
                        alt={i.display_name || i.username || "user"}
                        className="h-9 w-9 rounded-full border border-white/10 object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-white/90">
                          {i.display_name || i.username || "მოთამაშე"}
                        </p>
                        {i.username && <p className="truncate text-[11.5px] text-white/40">@{i.username}</p>}
                      </div>
                      {i.status === "rewarded" ? (
                        <span className="flex items-center gap-1.5 rounded-full border border-[var(--gr-lime)]/30 bg-[var(--gr-lime)]/10 px-2.5 py-1 text-[11px] font-black text-[var(--gr-lime)] shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" /> +{i.referrer_reward} NC
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-400 shrink-0">
                          <Clock className="h-3.5 w-3.5" /> ელოდება
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top inviters leaderboard */}
        {leaderboard.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.14em] text-white/50">
              <Crown className="h-4 w-4 text-amber-400" /> ტოპ მომწვევები
            </h2>
            <ol className="space-y-2">
              {leaderboard.map((r, idx) => (
                <li key={r.username} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-black ${
                    idx === 0 ? "bg-amber-400/20 text-amber-300" : idx === 1 ? "bg-white/10 text-white/70" : idx === 2 ? "bg-orange-500/15 text-orange-300" : "bg-white/[0.04] text-white/40"
                  }`}>
                    {idx + 1}
                  </span>
                  <Link href={`/profile/${r.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.avatar_url || "/default-avatar.svg"} alt="" className="h-9 w-9 rounded-full border border-white/10 object-cover" />
                    <span className="truncate text-[13.5px] font-bold text-white/90">{r.display_name || r.username}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--gr-violet-hi)]/25 bg-[var(--gr-violet)]/10 px-2.5 py-1 text-[11px] font-black text-[var(--gr-violet-hi)]">
                    <Gift className="h-3.5 w-3.5" /> {Number(r.invites)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "violet" | "lime" | "pink";
}) {
  const toneMap = {
    violet: "text-[var(--gr-violet-hi)]",
    lime: "text-[var(--gr-lime)]",
    pink: "text-pink-400",
  } as const;

  const variantMap = {
    violet: "room",
    lime: "support",
    pink: "royale",
  } as const;

  const railColorMap = {
    violet: "bg-blue-500/80 shadow-[0_0_8px_rgba(59,130,246,0.8)]",
    lime: "bg-[var(--gr-lime)]/80 shadow-[0_0_8px_rgba(132,204,22,0.8)]",
    pink: "bg-pink-500/80 shadow-[0_0_8px_rgba(236,72,153,0.8)]",
  } as const;

  return (
    <div className="pubg-loadout-link block" data-variant={variantMap[tone]}>
      <div className="pubg-loadout-card relative overflow-hidden p-4 text-center">
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <span aria-hidden className={`absolute left-0 top-0 h-full w-[3px] z-[5] ${railColorMap[tone]}`} />
        <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-10 w-10 opacity-20 z-[5]" />

        <div className="relative z-10">
          <Icon className={`mx-auto h-5 w-5 ${toneMap[tone]} drop-shadow-[0_0_6px_currentColor]`} />
          <div className="mt-2 text-[20px] font-black tabular-nums text-white">{value.toLocaleString()}</div>
          <div className="text-[9.5px] font-black uppercase tracking-[0.1em] text-white/40">{label}</div>
        </div>
      </div>
    </div>
  );
}
