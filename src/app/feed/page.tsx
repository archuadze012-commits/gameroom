import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession, isAdminFromProfile } from "@/lib/auth";
import { mockNews, mockGames } from "@/lib/mock-data";
import { FeedClient } from "./feed-client";

export const metadata = { title: "პოსტები" };

export default async function FeedPage() {
  const user = await getSession().catch(() => null);
  if (!user) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();

  // One profiles read covers both the composer identity and the admin check;
  // follows doesn't depend on it, so the two run in the same round trip.
  const [{ data: profile }, { data: followRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, favorite_game_slugs, role, banned")
      .eq("id", user.id)
      .single(),
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id),
  ]);

  const isAdmin = isAdminFromProfile(profile, user.email);
  const followingIds = (followRows ?? []).map((r: { following_id: string }) => r.following_id);

  // Posts from followed users, with the viewer's own like embedded so the
  // liked-state doesn't need a second round trip (post_likes select is public).
  let posts: FeedPost[] = [];
  let likedPostIds: string[] = [];
  if (followingIds.length > 0) {
    const { data } = await supabase
      .from("posts")
      .select("id, content, media_urls, likes_count, created_at, profiles!posts_author_id_profiles_id_fk(username, display_name, avatar_url, is_verified, role), post_likes(post_id)")
      .in("author_id", followingIds)
      .is("deleted_at", null)
      .eq("post_likes.user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as unknown as (FeedPost & { post_likes?: { post_id: string }[] })[];
    likedPostIds = rows.filter((p) => (p.post_likes?.length ?? 0) > 0).map((p) => p.id);
    posts = rows.map((row) => {
      const post = { ...row };
      delete post.post_likes;
      return post as FeedPost;
    });
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
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Cinematic Ambient Background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.1),transparent_70%)]" />
      
      <div className="container relative mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <FeedClient
          currentUser={{
            id: user.id,
            username: profile?.username ?? user.email?.split("@")[0] ?? "",
            displayName: profile?.display_name ?? "",
            avatarUrl: profile?.avatar_url ?? "",
            favoriteGameSlugs: favSlugs,
            isAdmin,
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
  author_id?: string;
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
