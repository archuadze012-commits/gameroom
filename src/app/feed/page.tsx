import { redirect } from "next/navigation";
import { Rss, Newspaper } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { mockNews, mockGames } from "@/lib/mock-data";
import { FeedClient } from "./feed-client";

export const metadata = { title: "პოსტები" };

export default async function FeedPage() {
  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();

  // current user profile (username, avatar, favorite_game_slugs)
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, favorite_game_slugs")
    .eq("id", user.id)
    .single();

  // who the user follows
  const { data: followRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = (followRows ?? []).map((r: { following_id: string }) => r.following_id);

  // posts from followed users
  let posts: FeedPost[] = [];
  if (followingIds.length > 0) {
    const { data } = await supabase
      .from("posts")
      .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_fkey(username, display_name, avatar_url, is_verified, role)")
      .in("author_id", followingIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    posts = (data ?? []) as unknown as FeedPost[];
  }

  // which posts the current user liked
  let likedPostIds: string[] = [];
  if (posts.length > 0) {
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", posts.map((p) => p.id));
    likedPostIds = (data ?? []).map((r: { post_id: string }) => r.post_id);
  }

  // news filtered by favorite game slugs
  const favSlugs: string[] = profile?.favorite_game_slugs ?? [];
  const filteredNews = favSlugs.length > 0
    ? mockNews.filter((n) => n.gameSlug != null && favSlugs.includes(n.gameSlug))
    : [];

  const newsWithGame = filteredNews.map((n) => ({
    ...n,
    game: mockGames.find((g) => g.slug === n.gameSlug) ?? null,
  }));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <div className="container relative mx-auto max-w-2xl px-4 py-10 lg:py-14">
        <FeedClient
          currentUser={{
            id: user.id,
            username: profile?.username ?? user.email?.split("@")[0] ?? "",
            displayName: profile?.display_name ?? "",
            avatarUrl: profile?.avatar_url ?? "",
            favoriteGameSlugs: favSlugs,
          }}
          initialPosts={posts}
          initialLikedIds={likedPostIds}
          news={newsWithGame}
          followingCount={followingIds.length}
        />
      </div>
    </div>
  );
}

export type FeedPost = {
  id: string;
  content: string;
  media_urls?: string[] | null;
  likes_count: number;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string | null;
    is_verified?: boolean;
    role?: string | null;
  };
};

export type NewsWithGame = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readMinutes: number;
  cover: string;
  gameSlug?: string;
  author: string;
  game: { nameKa: string; emoji?: string } | null;
};
