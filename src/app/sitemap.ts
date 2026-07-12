import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { listPublishedArticles } from "@/lib/articles-db";
import { getSiteUrl } from "@/lib/url";

// Rebuild hourly. Uses a plain anon client (no cookies) so this route stays
// ISR-friendly and doesn't get forced dynamic by cookies().
export const revalidate = 3600;

function anon() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
}

async function rows<T>(q: PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  try {
    const { data } = await q;
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const supabase = anon();

  const staticPaths = [
    "", "/games", "/tournaments", "/clans", "/articles", "/news",
    "/lfg", "/streams", "/free-pc-games", "/leaderboard", "/shop",
  ];
  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "daily",
    priority: p === "" ? 1 : 0.7,
  }));

  const [articles, games, tournaments, clans, news, cracked] = supabase ? await Promise.all([
    listPublishedArticles(1000).catch(() => []),
    rows<{ slug: string }>(supabase.from("games").select("slug")),
    rows<{ slug: string }>(supabase.from("tournaments").select("slug")),
    rows<{ slug: string }>(supabase.from("clans").select("slug")),
    rows<{ slug: string; published_at: string | null }>(
      supabase.from("news_articles").select("slug, published_at").eq("status", "published"),
    ),
    rows<{ id: string }>(supabase.from("cracked_games").select("id")),
  ]) : [[], [], [], [], [], []];

  const dynamic: MetadataRoute.Sitemap = [
    ...articles.map((a) => ({
      url: `${base}/articles/${encodeURIComponent(a.slug)}`,
      lastModified: a.published_at ? new Date(a.published_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...news.map((n) => ({
      url: `${base}/news/${encodeURIComponent(n.slug)}`,
      lastModified: n.published_at ? new Date(n.published_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...games.map((g) => ({ url: `${base}/games/${g.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...tournaments.map((t) => ({ url: `${base}/tournaments/${t.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    ...clans.map((c) => ({ url: `${base}/clans/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
    ...cracked.map((c) => ({ url: `${base}/free-pc-games/${c.id}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];

  return [...staticEntries, ...dynamic];
}
