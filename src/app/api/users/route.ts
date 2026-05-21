import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PublicProfile } from "@/lib/types";

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  try {
    const sb = client();
    let query = sb
      .from("profiles")
      .select("id, username, display_name, avatar_url, banner_url, is_verified, role, region, voice_chat, bio, last_seen_at, favorite_game_slugs")
      .eq("banned", false);

    if (q) {
      query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // tally followers per user from the follows table
    const { data: follows } = await sb.from("follows").select("following_id");
    const followerCounts = new Map<string, number>();
    for (const row of follows ?? []) {
      const id = (row as { following_id: string }).following_id;
      followerCounts.set(id, (followerCounts.get(id) ?? 0) + 1);
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
    console.error("[/api/users]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
