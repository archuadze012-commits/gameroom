import postgres from "postgres";

declare global {
  var __articlesMigrated: boolean | undefined;
}

/**
 * Idempotently create the articles table & journalist role in the app's
 * actual DATABASE_URL target. Runs once per server process.
 */
export async function ensureArticlesSchema() {
  if (global.__articlesMigrated) return;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const db = postgres(url, { prepare: false, max: 1 });
  try {
    // Add journalist to user_role enum if not present (must run outside a DO block)
    const enumCheck = await db<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'journalist'
      ) AS exists
    `;
    if (!enumCheck[0]?.exists) {
      await db.unsafe(`ALTER TYPE user_role ADD VALUE 'journalist'`);
    }

    await db.unsafe(`
      CREATE TABLE IF NOT EXISTS public.articles (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug         TEXT UNIQUE NOT NULL,
        title        TEXT NOT NULL,
        excerpt      TEXT,
        content      TEXT NOT NULL,
        cover_url    TEXT,
        game_slug    TEXT REFERENCES public.games(slug) ON DELETE SET NULL,
        author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        published    BOOLEAN NOT NULL DEFAULT false,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        published_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS articles_game_slug_idx ON public.articles(game_slug);
      CREATE INDEX IF NOT EXISTS articles_author_id_idx ON public.articles(author_id);
      CREATE INDEX IF NOT EXISTS articles_published_idx ON public.articles(published_at DESC) WHERE published = true;
    `);

    await db.unsafe(`
      ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
    `);

    // Drop & recreate policies idempotently
    await db.unsafe(`
      DROP POLICY IF EXISTS articles_public_read ON public.articles;
      CREATE POLICY articles_public_read ON public.articles
        FOR SELECT USING (published = true);

      DROP POLICY IF EXISTS articles_author_all ON public.articles;
      CREATE POLICY articles_author_all ON public.articles
        FOR ALL USING (auth.uid() = author_id);
    `);

    global.__articlesMigrated = true;
  } finally {
    await db.end({ timeout: 5 });
  }
}
