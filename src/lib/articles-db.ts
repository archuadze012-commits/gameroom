import postgres from "postgres";

declare global {
  var __sqlArticlesDb: ReturnType<typeof postgres> | undefined;
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!global.__sqlArticlesDb) {
    global.__sqlArticlesDb = postgres(url, {
      prepare: false,
      max: 1,
      connection: { search_path: "public" },
    });
  }
  return global.__sqlArticlesDb;
}

export type ArticleListRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  game_slug: string | null;
  game_name: string | null;
  author_username: string;
  published_at: string;
};

export async function listPublishedArticles(limit = 60): Promise<ArticleListRow[]> {
  const db = sql();
  const rows = await db<ArticleListRow[]>`
    SELECT
      a.slug, a.title, a.excerpt, a.cover_url, a.game_slug,
      g.name_ka AS game_name,
      p.username AS author_username,
      a.published_at::text AS published_at
    FROM public.articles a
    LEFT JOIN public.games g ON g.slug = a.game_slug
    LEFT JOIN public.profiles p ON p.id = a.author_id
    WHERE a.published = true
    ORDER BY a.published_at DESC
    LIMIT ${limit}
  `;
  return rows;
}

export type ArticleFull = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  game_slug: string | null;
  game_name: string | null;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  published_at: string;
};

export async function getPublishedArticle(slug: string): Promise<ArticleFull | null> {
  const db = sql();
  const rows = await db<ArticleFull[]>`
    SELECT
      a.slug, a.title, a.excerpt, a.content, a.cover_url, a.game_slug,
      g.name_ka AS game_name,
      p.username AS author_username,
      p.display_name AS author_display_name,
      p.avatar_url AS author_avatar_url,
      a.published_at::text AS published_at
    FROM public.articles a
    LEFT JOIN public.games g ON g.slug = a.game_slug
    LEFT JOIN public.profiles p ON p.id = a.author_id
    WHERE a.slug = ${slug} AND a.published = true
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function insertArticle(data: {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  game_slug: string | null;
  author_id: string;
  published: boolean;
  published_at: string | null;
}) {
  const db = sql();
  await db`
    INSERT INTO public.articles (slug, title, excerpt, content, cover_url, game_slug, author_id, published, published_at)
    VALUES (${data.slug}, ${data.title}, ${data.excerpt}, ${data.content}, ${data.cover_url}, ${data.game_slug}, ${data.author_id}, ${data.published}, ${data.published_at})
  `;
}
