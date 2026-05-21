import Link from "next/link";
import { Trophy, Crown, Medal, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { xpToLevel } from "@/lib/badges";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();

  // Top by XP
  const { data: topXp } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, xp, level, is_verified")
    .eq("banned", false)
    .order("xp", { ascending: false })
    .limit(50);

  // Most followed (client-side aggregate; follows table is small)
  let topFollowed: Array<{
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
    follower_count: number;
  }> = [];
  {
    const { data } = await supabase.from("follows").select("following_id");
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: { following_id: string }) => {
      map[r.following_id] = (map[r.following_id] ?? 0) + 1;
    });
    const top = Object.entries(map)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const ids = top.map((t) => t.id);
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", ids);
      topFollowed = top
        .map((t) => {
          const p = (profiles ?? []).find((pp) => pp.id === t.id);
          if (!p) return null;
          return {
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            is_verified: !!p.is_verified,
            follower_count: t.count,
          };
        })
        .filter(Boolean) as typeof topFollowed;
    }
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-xs text-muted-foreground">ყველაზე აქტიური მოთამაშეები</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* XP / Levels */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Crown className="h-4 w-4" /> XP / Level
          </h2>
          <Card>
            <CardContent className="p-0">
              {(topXp ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">მონაცემები არ არის.</p>
              )}
              {(topXp ?? []).map((u, i) => (
                <Link
                  key={u.username}
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-3 border-b border-border/60 p-3 last:border-0 hover:bg-secondary/30"
                >
                  <RankIcon rank={i + 1} />
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <span className="truncate">{u.display_name ?? u.username}</span>
                      {u.is_verified && <VerifiedBadge className="h-3 w-3" />}
                    </div>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-primary/15 text-primary">Lvl {u.level ?? xpToLevel(u.xp ?? 0)}</Badge>
                    <p className="text-[10px] text-muted-foreground">{u.xp ?? 0} XP</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Most Followed */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Award className="h-4 w-4" /> ყველაზე გამოწერილი
          </h2>
          <Card>
            <CardContent className="p-0">
              {topFollowed.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">მონაცემები არ არის.</p>
              )}
              {topFollowed.map((u, i) => (
                <Link
                  key={u.username}
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-3 border-b border-border/60 p-3 last:border-0 hover:bg-secondary/30"
                >
                  <RankIcon rank={i + 1} />
                  <UserAvatar username={u.username} avatarUrl={u.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <span className="truncate">{u.display_name ?? u.username}</span>
                      {u.is_verified && <VerifiedBadge className="h-3 w-3" />}
                    </div>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                  <Badge variant="outline">{u.follower_count} 👥</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-orange-400" />;
  return <span className="w-5 text-center text-xs font-bold text-muted-foreground">{rank}</span>;
}
