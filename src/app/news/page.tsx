import Link from "next/link";
import { Newspaper, Clock } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { format } from "date-fns";


export const metadata = { title: "სიახლეები" };
export const dynamic = "force-dynamic";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";
const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.55))";


export default async function NewsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: dbNews } = await supabase
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

  const news = (dbNews || []).map((n: any) => {
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
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/20 blur-[120px]" />
      <span aria-hidden className="pointer-events-none absolute top-40 -left-20 h-72 w-72 rounded-full bg-[var(--gr-magenta)]/15 blur-[120px]" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 space-y-10">
        <header>
          <Eyebrow tone="amber">სიახლეები</Eyebrow>
          <DisplayHeading as="h1" size="lg" className="mt-3 flex items-center gap-3">
            <Newspaper className="h-7 w-7 text-[var(--gr-violet-hi)]" />
            სიახლეები
          </DisplayHeading>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
            გეიმინგ სამყაროს ბოლო ამბები — ადმინისტრაციის შერჩევით.
          </p>
        </header>

        {featured && (
          <Link href={`/news/${featured.slug}`} className="group block">
            <div
              className="relative isolate"
              style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
            >
              <div
                className="relative overflow-hidden bg-[var(--gr-bg-1)] gr-sweep"
                style={{ clipPath: cutMd }}
              >
                <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
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
              </div>
            </div>
          </Link>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((n) => {
            const game = n.game;
            return (
              <Link key={n.slug} href={`/news/${n.slug}`} className="group block">
                <div
                  className="relative isolate"
                  style={{ background: cardBorder, padding: 1, clipPath: cutSm }}
                >
                  <div
                    className="relative bg-[var(--gr-bg-1)] gr-sweep"
                    style={{ clipPath: cutSm }}
                  >
                    <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
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
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
