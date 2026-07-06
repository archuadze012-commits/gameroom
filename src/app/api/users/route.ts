import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";
import { rateLimitShared } from "@/lib/rate-limit";
import type { PublicProfile } from "@/lib/types";

const logger = createLogger("api:users");

// Cap how many profiles a single request can pull. Without this the endpoint
// returned the ENTIRE non-banned userbase, enabling one-request scraping and an
// unbounded follows-table scan (a DoS amplifier as the tables grow).
const MAX_RESULTS = 50;

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  if (!(await rateLimitShared(`users-search:${ip}`, 30, 60_000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const rawQ = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // Strip PostgREST structural/wildcard chars so a crafted `q` can't break out
  // of the .or() filter string (filter injection). Keep it to a safe length.
  const q = rawQ.replace(/[,()*:%\\]/g, " ").trim().slice(0, 64);
  try {
    const sb = client();
    let query = sb
      .from("profiles")
      .select("id, username, display_name, avatar_url, banner_url, is_verified, role, region, voice_chat, bio, last_seen_at, favorite_game_slugs")
      .eq("banned", false)
      .limit(MAX_RESULTS);

    if (q) {
      query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Tally followers ONLY for the (bounded) users we're returning — never scan
    // the whole follows table.
    const ids = (data ?? []).map((r) => r.id);
    const followerCounts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: follows } = await sb.from("follows").select("following_id").in("following_id", ids);
      for (const row of follows ?? []) {
        const id = (row as { following_id: string }).following_id;
        followerCounts.set(id, (followerCounts.get(id) ?? 0) + 1);
      }
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const profiles: PublicProfile[] = (data ?? []).map((r) => {
      const lastSeen = r.last_seen_at ? new Date(r.last_seen_at) : null;
      return {
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        bannerUrl: r.banner_url,
        isVerified: !!r.is_verified,
        role: r.role,
        region: r.region,
        voiceChat: r.voice_chat,
        bio: r.bio,
        isOnline: lastSeen ? lastSeen > fiveMinutesAgo : false,
        favoriteGameSlugs: Array.isArray(r.favorite_game_slugs) ? r.favorite_game_slugs : [],
        followerCount: followerCounts.get(r.id) ?? 0,
      };
    });

    // sort by follower count desc, then by username asc as tiebreaker
    profiles.sort((a, b) => {
      if (b.followerCount !== a.followerCount) return b.followerCount - a.followerCount;
      return a.username.localeCompare(b.username);
    });

    return NextResponse.json(profiles);
  } catch (e) {
    logger.error("failed to fetch users", { error: e });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
