import type { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type SuggestedUser = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
};

export type SeedLfgPost = {
  id: string;
  title: string;
  gameName: string | null;
  region: string | null;
  slotsTotal: number;
  slotsFilled: number;
  authorName: string;
  authorUsername: string;
  authorAvatar: string | null;
};

export type FeedSeed = {
  suggestedUsers: SuggestedUser[];
  lfgPosts: SeedLfgPost[];
};

/**
 * Seed content for a brand-new user whose social feed is empty. Rather than an
 * empty room, we surface the two things that bootstrap engagement: real players
 * to follow (fixes the "no follows → no feed" root cause) and open LFG posts
 * (real activity + the core action). Free games / streams are intentionally NOT
 * included — they already appear in the hero carousel above the feed.
 *
 * Only fetched on the empty-feed path, so it never taxes users who have content.
 */
export async function getFeedSeed(supabase: ServerClient, userId: string): Promise<FeedSeed> {
  // Suggested players — active, non-banned, with an avatar (feels populated).
  const { data: cand } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, level")
    .neq("id", userId)
    .eq("banned", false)
    .not("avatar_url", "is", null)
    .order("level", { ascending: false })
    .limit(8);
  const candidates = cand ?? [];

  let followingSet = new Set<string>();
  if (candidates.length > 0) {
    const { data: fol } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId)
      .in("following_id", candidates.map((c) => c.id));
    followingSet = new Set((fol ?? []).map((f) => f.following_id));
  }

  const suggestedUsers: SuggestedUser[] = candidates
    .filter((c) => !followingSet.has(c.id))
    .slice(0, 5)
    .map((c) => ({
      username: c.username,
      displayName: c.display_name ?? c.username,
      avatarUrl: c.avatar_url,
      level: c.level ?? 1,
    }));

  // Open LFG posts — real "looking for team" activity.
  const { data: lfgRows } = await supabase
    .from("lfg_posts")
    .select("id, title, game_slug, region, slots_total, slots_filled, author_id")
    .eq("status", "open")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(4);
  const rows = lfgRows ?? [];

  let lfgPosts: SeedLfgPost[] = [];
  if (rows.length > 0) {
    const authorIds = [...new Set(rows.map((r) => r.author_id))];
    const gameSlugs = [...new Set(rows.map((r) => r.game_slug).filter((s): s is string => !!s))];
    const [authorsRes, gamesRes] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", authorIds),
      gameSlugs.length > 0
        ? supabase.from("games").select("slug, name_ka").in("slug", gameSlugs)
        : Promise.resolve({ data: [] as { slug: string; name_ka: string }[] }),
    ]);
    const aById = new Map((authorsRes.data ?? []).map((a) => [a.id, a]));
    const gBySlug = new Map((gamesRes.data ?? []).map((g) => [g.slug, g.name_ka]));
    lfgPosts = rows.map((r) => {
      const a = aById.get(r.author_id);
      return {
        id: r.id,
        title: r.title,
        gameName: r.game_slug ? gBySlug.get(r.game_slug) ?? null : null,
        region: r.region,
        slotsTotal: r.slots_total,
        slotsFilled: r.slots_filled,
        authorName: a?.display_name ?? a?.username ?? "მოთამაშე",
        authorUsername: a?.username ?? "user",
        authorAvatar: a?.avatar_url ?? null,
      };
    });
  }

  return { suggestedUsers, lfgPosts };
}
