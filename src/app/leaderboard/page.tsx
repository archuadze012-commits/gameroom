import Link from "next/link";
import { Trophy, Crown, Medal, Coins, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { xpToLevel } from "@/lib/badges";
import { DisplayHeading } from "@/components/ui/display-heading";

export const metadata = { title: "Leaderboard" };

type LeaderboardUser = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  xp?: number | null;
  level?: number | null;
  nc_balance?: number | null;
  is_verified?: boolean | null;
};

type WalletRow = {
  nc_balance: number | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean | null;
  };
};

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  const { data: topXp } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, xp, level, is_verified")
    .eq("banned", false)
    .order("xp", { ascending: false })
    .limit(20);

  const { data: topWallets } = await adminSupabase
    .from("wallets")
    .select("nc_balance, profiles!inner(username, display_name, avatar_url, is_verified)")
    .order("nc_balance", { ascending: false })
    .limit(20);

  const topCoins: LeaderboardUser[] = ((topWallets ?? []) as unknown as WalletRow[]).map((w) => ({
    nc_balance: w.nc_balance,
    ...w.profiles,
  }));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[#05050f]">
      {/* Cinematic Ambient Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_70%)]" />

      <div className="container relative mx-auto max-w-5xl px-4 py-10 lg:py-14">
        
        {/* Premium Header */}
        <header className="mb-12 group relative rounded-[24px] p-[1.5px] bg-gradient-to-br from-[#00d0ff] via-[#6366f1] to-[#f43f5e] shadow-[0_0_40px_rgba(99,102,241,0.2)]">
          <div className="relative flex items-center gap-5 h-full w-full overflow-hidden rounded-[22.5px] bg-[#0a0714] p-6 sm:p-8 shadow-[inset_0_0_30px_rgba(139,92,246,0.05)]">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.1),transparent_50%)]" />
            
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-pink-500/30 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
              <Trophy className="h-7 w-7 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
            </div>
            <div className="relative">
              <p className="text-[12px] font-black uppercase tracking-[0.24em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                Hall of Fame
              </p>
              <DisplayHeading as="h1" size="lg" className="mt-1 text-white drop-shadow-md">
                Leaderboard
              </DisplayHeading>
              <p className="mt-2 text-[14px] text-white/50 font-medium">
                Top players by Experience and Wealth
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* XP Leaderboard */}
          <LeaderboardSection
            eyebrow="Top by XP / Level"
            icon={<Sparkles className="h-4 w-4" />}
            color="violet"
          >
            {(topXp ?? []).length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-white/40">No data yet.</p>
            ) : (
              ((topXp ?? []) as LeaderboardUser[]).map((u, i) => (
                <Link
                  key={u.username}
                  href={`/profile/${u.username}`}
                  className="group relative flex items-center gap-4 border-b border-white/5 p-4 transition-all duration-300 hover:bg-white/5 hover:pl-6 last:border-0"
                >
                  <RankIcon rank={i + 1} />
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-display text-[15px] font-black uppercase tracking-wide text-white drop-shadow-sm group-hover:text-violet-400 transition-colors">
                      <span className="truncate">{u.display_name ?? u.username}</span>
                      {u.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">@{u.username}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
                      Lvl {u.level ?? xpToLevel(u.xp ?? 0)}
                    </span>
                    <span className="text-[11px] font-black tabular-nums text-white/50">{u.xp ?? 0} XP</span>
                  </div>
                </Link>
              ))
            )}
          </LeaderboardSection>

          {/* Coins Leaderboard */}
          <LeaderboardSection
            eyebrow="Top Earners (Coins)"
            icon={<Coins className="h-4 w-4" />}
            color="cyan"
          >
            {topCoins.length === 0 ? (
              <p className="py-12 text-center text-sm font-bold text-white/40">No data yet.</p>
            ) : (
              topCoins.map((u, i) => (
                <Link
                  key={u.username}
                  href={`/profile/${u.username}`}
                  className="group relative flex items-center gap-4 border-b border-white/5 p-4 transition-all duration-300 hover:bg-white/5 hover:pl-6 last:border-0"
                >
                  <RankIcon rank={i + 1} />
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-display text-[15px] font-black uppercase tracking-wide text-white drop-shadow-sm group-hover:text-cyan-400 transition-colors">
                      <span className="truncate">{u.display_name ?? u.username}</span>
                      {u.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">@{u.username}</p>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                      {u.nc_balance ?? 0} NC
                    </span>
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
  color,
}: {
  eyebrow: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color: "violet" | "cyan";
}) {
  const isViolet = color === "violet";
  const textColor = isViolet ? "text-violet-400" : "text-cyan-400";
  const dropShadow = isViolet ? "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" : "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]";
  const glowShadow = isViolet ? "shadow-[0_0_30px_rgba(139,92,246,0.15)]" : "shadow-[0_0_30px_rgba(34,211,238,0.15)]";
  const gradient = isViolet ? "from-violet-500/40 via-pink-500/40 to-violet-500/40" : "from-cyan-500/40 via-blue-500/40 to-cyan-500/40";

  return (
    <section>
      <h2
        className={`mb-4 flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.2em] ${textColor} ${dropShadow}`}
      >
        {icon} {eyebrow}
      </h2>
      
      <div className={`group relative rounded-[24px] p-[1.5px] bg-gradient-to-br ${gradient} ${glowShadow} transition-shadow duration-500 hover:shadow-[0_0_40px_rgba(255,255,255,0.1)]`}>
        <div className="relative h-full w-full overflow-hidden rounded-[22.5px] bg-[#0a0714]">
          {children}
        </div>
      </div>
    </section>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-6 w-6 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" />;
  return <span className="w-6 text-center text-[13px] font-black tabular-nums text-white/30">{rank}</span>;
}
