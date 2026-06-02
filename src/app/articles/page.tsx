import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ArticleCard, type ArticleCardData } from "@/components/article-card";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { listPublishedArticles } from "@/lib/articles-db";
import { PenLine } from "lucide-react";

export const metadata = { title: "სტატიები" };
export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const supabase = await createSupabaseServerClient();
  const session = await getSession().catch(() => null);

  let favSlugs: string[] = [];
  let userRole: string = "user";
  if (session) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("favorite_game_slugs, role")
      .eq("id", session.id)
      .maybeSingle();
    favSlugs = (profile?.favorite_game_slugs as string[] | null) ?? [];
    userRole = profile?.role ?? "user";
  }

  const rows = await listPublishedArticles(60);
  const all: ArticleCardData[] = rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    cover_url: r.cover_url,
    game_slug: r.game_slug,
    game_name: r.game_name,
    author_username: r.author_username ?? "anonymous",
    published_at: r.published_at,
  }));

  const favArticles = favSlugs.length > 0 ? all.filter((a) => a.game_slug && favSlugs.includes(a.game_slug)) : [];
  const otherArticles = all.filter((a) => !favArticles.includes(a));

  const canWrite = ["admin", "moderator", "journalist"].includes(userRole);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        <PageHeader
          eyebrow="კონტენტი"
          title="სტატიები"
          description="სიახლეები, გიდები და ანალიტიკა შენი საყვარელი თამაშების შესახებ."
          actions={canWrite ? (
            <ChevronButton href="/articles/new" variant="violet" size="md">
              <PenLine className="h-4 w-4" /> ახალი სტატია
            </ChevronButton>
          ) : undefined}
        />

        {all.length === 0 ? (
          <div className="mt-20 text-center text-[var(--gr-text-dim)]">
            <p className="text-[15px]">სტატიები ჯერ არ არის</p>
          </div>
        ) : (
          <>
            {favArticles.length > 0 && (
              <section className="mt-10">
                <Eyebrow tone="violet" className="mb-4">ჩემი თამაშები</Eyebrow>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {favArticles.map((a) => <ArticleCard key={a.slug} a={a} />)}
                </div>
                {otherArticles.length > 0 && <div className="mt-10 h-px bg-[var(--gr-border)]" />}
              </section>
            )}

            {otherArticles.length > 0 && (
              <section className="mt-10">
                {favArticles.length > 0 && <Eyebrow tone="mute" className="mb-4">სხვა სტატიები</Eyebrow>}
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {otherArticles.map((a) => <ArticleCard key={a.slug} a={a} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
