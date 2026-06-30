import Link from "next/link";
import { Newspaper, Clock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { format } from "date-fns";
import { GamerCard } from "@/components/ui/gamer-card";
import { unstable_cache } from "next/cache";

export const metadata = { title: "სიახლეები" };

type NewsRow = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  excerpt: string | null;
  body: string | null;
  published_at: string | null;
  profiles: {
    username: string | null;
  } | null;
  games: {
    slug: string | null;
    name_ka: string | null;
    emoji: string | null;
  } | null;
};

const getNews = unstable_cache(
  async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("news_articles")
    .select(`
      id,
      title,
      slug,
      cover_url,
      excerpt,
      body,
      published_at,
      profiles:author_id (
        username
      ),
      games:game_id (
        slug,
        name_ka,
        emoji
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return data;
  },
  ["news"],
  { revalidate: 300, tags: ["news"] },
);

export default async function NewsPage() {
  const dbNews = await getNews();

  const news = ((dbNews ?? []) as NewsRow[]).map((n) => {
    const readMinutes = Math.max(1, Math.ceil((n.body?.length || 0) / 800));
    return {
      id: n.id,
      title: n.title,
      slug: n.slug,
      excerpt: n.excerpt,
      cover: n.cover_url || "from-violet-500/30 to-violet-500/5",
      publishedAt: n.published_at ? format(new Date(n.published_at), "yyyy-MM-dd") : "",
      author: n.profiles?.username || "Admin",
      readMinutes,
      gameSlug: n.games?.slug,
      game: n.games ? { nameKa: n.games.name_ka, emoji: n.games.emoji } : null,
    };
  });

  const [featured, ...rest] = news;
  const featuredGame = featured ? featured.game : undefined;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="violet" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 space-y-10">
        <PageHeader
          color="violet"
          eyebrow="სიახლეები"
          title="სიახლეები"
          description="გეიმინგ სამყაროს ბოლო ამბები — ადმინისტრაციის შერჩევით."
        />

        {featured && (
          <GamerCard clipSize={22} hover className="group block">
            <Link href={`/news/${featured.slug}`} className="block">
                <div className="grid md:grid-cols-[1.1fr_1fr]">
                  <div className={`relative h-48 w-full bg-gradient-to-br md:h-full ${featured.cover}`}>
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[var(--gr-bg-1)]/80 md:to-[var(--gr-bg-1)]" />
                  </div>
                  <div className="space-y-3 p-6 md:p-8">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[var(--gr-text-dim)]">
                      {featuredGame && (
                        <Pill tone="violet">{featuredGame.emoji} {featuredGame.nameKa}</Pill>
                      )}
                      <span>{featured.publishedAt}</span>
                      <span className="text-[var(--gr-text-dim)]">·</span>
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {featured.readMinutes} წთ</span>
                    </div>
                    <h2 className="font-display text-[24px] font-bold uppercase tracking-tight text-[var(--gr-text)] md:text-[28px] leading-[1.1]">
                      {featured.title}
                    </h2>
                    <p className="text-[14px] leading-relaxed text-[var(--gr-text-mute)]">{featured.excerpt}</p>
                    <div className="pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--gr-violet-hi)]">
                      @{featured.author}
                    </div>
                  </div>
                </div>
            </Link>
          </GamerCard>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((n) => {
            const game = n.game;
            return (
              <GamerCard key={n.slug} clipSize={14} hover className="group block">
                <Link href={`/news/${n.slug}`} className="block">
                    <div className={`relative h-32 w-full bg-gradient-to-br ${n.cover}`}>
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-1)] via-transparent to-transparent" />
                    </div>
                    <div className="space-y-2 p-4">
                      {game && (
                        <Pill tone="violet" className="!text-[10px]">
                          {game.emoji} {game.nameKa}
                        </Pill>
                      )}
                      <h3 className="line-clamp-2 font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] leading-tight">
                        {n.title}
                      </h3>
                      <p className="line-clamp-2 text-[12.5px] leading-relaxed text-[var(--gr-text-mute)]">{n.excerpt}</p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--gr-text-dim)]">
                        <span>{n.publishedAt}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {n.readMinutes} წთ</span>
                      </div>
                    </div>
                </Link>
              </GamerCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
