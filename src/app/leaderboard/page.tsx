import Link from "next/link";
import { Trophy, Crown, Medal, Coins } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { xpToLevel } from "@/lib/badges";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";

export const metadata = { title: "Leaderboard" };

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();

  // 1. Fetch Top XP
  const { data: topXp } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, xp, level, is_verified")
    .eq("banned", false)
    .order("xp", { ascending: false })
    .limit(20);

  // 2. Fetch Top Coins (NC Balance)
  const { data: topWallets } = await supabase
    .from("wallets")
    .select("nc_balance, profiles!inner(username, display_name, avatar_url, is_verified)")
    .order("nc_balance", { ascending: false })
    .limit(20);

  const topCoins = (topWallets || []).map((w: any) => ({
    nc_balance: w.nc_balance,
    ...w.profiles,
  }));

  // Note: Win Rate requires a DB schema update (adding wins/losses to user_game_profiles)
  // We'll leave space for it in the UI or address it next.

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-4xl px-4 py-10 lg:py-14">
        <header className="mb-8 flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center bg-[var(--gr-amber)]/15 text-[var(--gr-amber)] ring-1 ring-[var(--gr-amber)]/30"
            style={{ clipPath: cutSm }}
          >
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <Eyebrow tone="amber">Hall of Fame</Eyebrow>
            <DisplayHeading as="h1" size="lg" className="mt-2">Leaderboard</DisplayHeading>
            <p className="mt-2 text-[13px] text-[var(--gr-text-mute)]">Top players by Experience and Wealth</p>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* XP Leaderboard */}
          <LeaderboardSection
            eyebrow="Top by XP / Level"
            icon={<Crown className="h-4 w-4" />}
          >
            {(topXp ?? []).length === 0 ? (
              <p className="p-6 text-center text-[13px] text-[var(--gr-text-mute)]">No data yet.</p>
            ) : (
              (topXp ?? []).map((u, i) => (
                <Link
                  key={u.username}
                  href={`/profile/${u.username}`}
                  className="relative flex items-center gap-3 border-b border-[var(--gr-border)] p-3 last:border-0 transition-all duration-200 hover:bg-[var(--gr-bg-2)]/70 hover:pl-4 hover:before:opacity-100 before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-[var(--gr-violet)] before:opacity-0 before:transition-opacity gr-sweep"
                >
                  <RankIcon rank={i + 1} />
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-[13.5px] font-semibold text-[var(--gr-text)]">
                      <span className="truncate">{u.display_name ?? u.username}</span>
                      {u.is_verified && <VerifiedBadge className="h-3 w-3" />}
                    </div>
                    <p className="text-[11px] text-[var(--gr-text-dim)]">@{u.username}</p>
                  </div>
                  <div className="text-right">
                    <Pill tone="violet">Lvl {u.level ?? xpToLevel(u.xp ?? 0)}</Pill>
                    <p className="mt-0.5 text-[10px] tabular-nums text-[var(--gr-text-dim)]">{u.xp ?? 0} XP</p>
                  </div>
                </Link>
              ))
            )}
          </LeaderboardSection>

          {/* Coins Leaderboard */}
          <LeaderboardSection
            eyebrow="Top Earners (Coins)"
            icon={<Coins className="h-4 w-4" />}
          >
            {topCoins.length === 0 ? (
              <p className="p-6 text-center text-[13px] text-[var(--gr-text-mute)]">No data yet.</p>
            ) : (
              topCoins.map((u, i) => (
                <Link
                  key={u.username}
                  href={`/profile/${u.username}`}
                  className="relative flex items-center gap-3 border-b border-[var(--gr-border)] p-3 last:border-0 transition-all duration-200 hover:bg-[var(--gr-bg-2)]/70 hover:pl-4 hover:before:opacity-100 before:absolute before:left-0 before:top-0 before:h-full before:w-[2px] before:bg-[var(--gr-amber)] before:opacity-0 before:transition-opacity gr-sweep"
                >
                  <RankIcon rank={i + 1} />
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-[13.5px] font-semibold text-[var(--gr-text)]">
                      <span className="truncate">{u.display_name ?? u.username}</span>
                      {u.is_verified && <VerifiedBadge className="h-3 w-3" />}
                    </div>
                    <p className="text-[11px] text-[var(--gr-text-dim)]">@{u.username}</p>
                  </div>
                  <div className="text-right">
                    <Pill tone="amber">{u.nc_balance} NC</Pill>
                  </div>
                </Link>
              ))
            )}
          </LeaderboardSection>
        </div>
      </div>
    </div>
  );
}

function LeaderboardSection({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-violet-hi)]">
        {icon} {eyebrow}
      </h2>
      <div
        className="relative isolate"
        style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
      >
        <div className="overflow-hidden bg-[var(--gr-bg-1)]" style={{ clipPath: cutMd }}>
          <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
          {children}
        </div>
      </div>
    </section>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-[var(--gr-amber)] drop-shadow-[0_0_8px_rgba(245,165,36,0.5)]" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-[var(--gr-violet-hi)]" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-[var(--gr-magenta)]" />;
  return <span className="w-5 text-center text-[11px] font-bold tabular-nums text-[var(--gr-text-dim)]">{rank}</span>;
}
