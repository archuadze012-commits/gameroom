import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSeason, type Season } from "@/lib/wrapped/season";

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Below this many public actions in-window, the card renders a "season still
// warming up" state instead of a shameful near-empty recap.
const THIN_ACTIVITY_THRESHOLD = 3;

export type WrappedGame = {
  slug: string;
  name_ka: string;
  icon_url: string | null;
  /** how the top game was chosen — affects the label we show */
  source: "activity" | "favorite" | "clan";
};

export type WrappedClan = {
  slug: string;
  name: string;
  game_slug: string | null;
  level: number;
  avatar_url: string | null;
  joinedThisSeason: boolean;
};

export type WrappedData = {
  season: Season;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    level: number;
    dailyStreak: number;
    referral_code: string | null;
    joinedAt: string | null;
  };
  /** joined the platform mid-season → totals only cover a partial window */
  joinedMidSeason: boolean;
  /** public, window-scoped aggregates (safe for OG / other viewers) */
  public: {
    newFollowers: number;
    postsPublished: number;
    engagementGiven: number; // comments authored in-window
    lfgActivity: number; // lfg posts + responses in-window
    topGame: WrappedGame | null;
    clan: WrappedClan | null;
  };
  /** owner-only, sensitivity-matched to private economy/DM data */
  private: {
    messagesSent: number;
    ncEarned: number;
  };
  activityScore: number;
  isThin: boolean;
};

type CountableTable =
  | "follows"
  | "posts"
  | "post_comments"
  | "lfg_posts"
  | "lfg_responses"
  | "conversation_messages";

async function countInWindow(
  db: ServerClient,
  table: CountableTable,
  column: string,
  id: string,
  season: Season
): Promise<number> {
  const { count } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, id)
    .gte("created_at", season.startIso)
    .lt("created_at", season.endIso);
  return count ?? 0;
}

/**
 * Aggregate a user's season recap. Returns null when the profile is missing.
 */
export async function getWrappedData(
  username: string,
  now: Date = new Date()
): Promise<WrappedData | null> {
  // Regular session client (RLS), not the service-role admin client: every
  // public stat below reads public-select tables, and the two private stats
  // (messages sent, NC earned) are only *displayed* to the owner — under RLS a
  // viewer can only read those rows for themselves, which is exactly the owner
  // case. This also keeps the page working without a service-role key.
  const supabase = await createSupabaseServerClient();

  const season = getSeason(now);

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, level, daily_streak_count, favorite_game_slugs, referral_code, created_at"
    )
    .ilike("username", username)
    .maybeSingle();

  if (!profile) return null;

  const id = profile.id as string;

  const [
    newFollowers,
    postsPublished,
    engagementGiven,
    lfgPosts,
    lfgResponses,
    messagesSent,
    lfgGamesRes,
    walletRes,
    clanRes,
  ] = await Promise.all([
    countInWindow(supabase, "follows", "following_id", id, season),
    countInWindow(supabase, "posts", "author_id", id, season),
    countInWindow(supabase, "post_comments", "author_id", id, season),
    countInWindow(supabase, "lfg_posts", "author_id", id, season),
    countInWindow(supabase, "lfg_responses", "user_id", id, season),
    countInWindow(supabase, "conversation_messages", "sender_id", id, season),
    supabase
      .from("lfg_posts")
      .select("game_slug")
      .eq("author_id", id)
      .gte("created_at", season.startIso)
      .lt("created_at", season.endIso),
    supabase
      .from("wallet_transactions")
      .select("amount")
      .eq("user_id", id)
      .eq("currency", "nc")
      .gt("amount", 0)
      .gte("created_at", season.startIso)
      .lt("created_at", season.endIso),
    supabase
      .from("clan_members")
      .select("joined_at, clans(slug, name, game_slug, level, avatar_url)")
      .eq("user_id", id),
  ]);

  const lfgActivity = lfgPosts + lfgResponses;
  const ncEarned = (walletRes.data ?? []).reduce(
    (sum, r) => sum + (Number((r as { amount: number | null }).amount) || 0),
    0
  );

  // --- Top game: prefer in-window LFG activity, then favorites, then clan ---
  let topSlug: string | null = null;
  let topSource: WrappedGame["source"] = "activity";
  const lfgGames = (lfgGamesRes.data ?? []) as { game_slug: string | null }[];
  if (lfgGames.length > 0) {
    const freq = new Map<string, number>();
    for (const r of lfgGames) {
      if (!r.game_slug) continue;
      freq.set(r.game_slug, (freq.get(r.game_slug) ?? 0) + 1);
    }
    let best = -1;
    for (const [slug, n] of freq) {
      if (n > best) {
        best = n;
        topSlug = slug;
      }
    }
  }
  const favSlugs = (profile.favorite_game_slugs as string[] | null) ?? [];
  if (!topSlug && favSlugs.length > 0) {
    topSlug = favSlugs[0];
    topSource = "favorite";
  }

  // --- Clan: pick the highest-level membership; note if joined this season ---
  type ClanRow = {
    joined_at: string | null;
    clans: {
      slug: string;
      name: string;
      game_slug: string | null;
      level: number | null;
      avatar_url: string | null;
    } | null;
  };
  const clanRows = (clanRes.data ?? []) as unknown as ClanRow[];
  let clan: WrappedClan | null = null;
  for (const row of clanRows) {
    if (!row.clans) continue;
    const joinedThisSeason =
      !!row.joined_at &&
      row.joined_at >= season.startIso &&
      row.joined_at < season.endIso;
    const candidate: WrappedClan = {
      slug: row.clans.slug,
      name: row.clans.name,
      game_slug: row.clans.game_slug,
      level: row.clans.level ?? 1,
      avatar_url: row.clans.avatar_url,
      joinedThisSeason,
    };
    if (!clan || candidate.level > clan.level) clan = candidate;
    else if (clan && joinedThisSeason) clan.joinedThisSeason = true;
  }
  if (!topSlug && clan?.game_slug) {
    topSlug = clan.game_slug;
    topSource = "clan";
  }

  let topGame: WrappedGame | null = null;
  if (topSlug) {
    const { data: g } = await supabase
      .from("games")
      .select("slug, name_ka, icon_url")
      .eq("slug", topSlug)
      .maybeSingle();
    if (g) {
      topGame = {
        slug: g.slug as string,
        name_ka: (g.name_ka as string) ?? topSlug,
        icon_url: (g.icon_url as string | null) ?? null,
        source: topSource,
      };
    }
  }

  const joinedAt = (profile.created_at as string | null) ?? null;
  const joinedMidSeason = !!joinedAt && joinedAt >= season.startIso;

  const activityScore =
    newFollowers + postsPublished + engagementGiven + lfgActivity;

  return {
    season,
    profile: {
      id,
      username: profile.username as string,
      display_name: (profile.display_name as string | null) ?? null,
      avatar_url: (profile.avatar_url as string | null) ?? null,
      level: (profile.level as number) ?? 1,
      dailyStreak: (profile.daily_streak_count as number) ?? 0,
      referral_code: (profile.referral_code as string | null) ?? null,
      joinedAt,
    },
    joinedMidSeason,
    public: {
      newFollowers,
      postsPublished,
      engagementGiven,
      lfgActivity,
      topGame,
      clan,
    },
    private: {
      messagesSent,
      ncEarned,
    },
    activityScore,
    isThin: activityScore < THIN_ACTIVITY_THRESHOLD,
  };
}
