import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getArticleForEditor } from "@/lib/articles-db";
import { ArticleEditorForm } from "@/app/articles/article-editor-form";


const ALLOWED = ["admin", "moderator", "journalist"];

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession().catch(() => null);
  if (!session) redirect("/auth/login");

  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: games }, article] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", session.id).maybeSingle(),
    supabase.from("games").select("slug, name_ka").order("name_ka"),
    getArticleForEditor(slug).catch(() => null),
  ]);

  if (!article) notFound();
  if (!ALLOWED.includes(profile?.role ?? "")) redirect("/articles");
  if (article.author_id !== session.id) redirect(`/articles/${encodeURIComponent(slug)}`);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <div className="container relative mx-auto max-w-5xl px-4 py-10 lg:py-14">
        <h1 className="mb-8 font-display text-[24px] font-extrabold uppercase tracking-tight text-[var(--gr-text)]">
          სტატიის რედაქტირება
        </h1>
        <ArticleEditorForm
          games={games ?? []}
          initialArticle={{
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt,
            content: article.content,
            cover_url: article.cover_url,
            game_slug: article.game_slug,
            published: article.published,
          }}
        />
      </div>
    </div>
  );
}
