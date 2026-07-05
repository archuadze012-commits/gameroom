import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { NewsCommentsClient } from "./news-comments-client";


type GameRel = { name_ka: string | null; emoji: string | null };
type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  profiles: { username: string | null } | null;
};
type ArticleAuthor = { username: string | null };

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSession().catch(() => null);

  // Fetch article
  const { data: article } = await supabase
    .from("news_articles")
    .select(`
      id,
      title,
      slug,
      cover_url,
      excerpt,
      body,
      published_at,
      author_id,
      profiles:author_id (
        username
      ),
      games:game_id (
        slug,
        name_ka,
        emoji
      )
    `)
    .eq("slug", slug)
    .single();

  if (!article) notFound();
  const game = (Array.isArray(article.games) ? article.games[0] : article.games) as GameRel;

  const readMinutes = Math.max(1, Math.ceil((article.body?.length || 0) / 800));
  const formattedDate = article.published_at
    ? formatDistanceToNow(new Date(article.published_at), { addSuffix: true, locale: ka })
    : "";

  // Fetch comments
  const { data: dbComments } = await supabase
    .from("news_comments")
    .select(`
      id,
      body,
      created_at,
      profiles:user_id (
        username
      )
    `)
    .eq("article_id", article.id)
    .order("created_at", { ascending: false });

  const comments = ((dbComments ?? []) as CommentRow[]).map((c) => ({
    id: c.id,
    name: c.profiles?.username || "Anonymous",
    ago: formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ka }),
    body: c.body,
  }));

  const coverGradient = article.cover_url || "from-violet-500/40 to-violet-500/0";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/20 blur-[120px]" />

      <article className="container relative mx-auto max-w-3xl px-4 py-10 lg:py-14">
        <Link
          href="/news"
          className="mb-6 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-[var(--gr-violet-hi)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> ყველა სიახლე
        </Link>

        {/* hero cover */}
        <div
          className="relative mb-8 overflow-hidden ring-1 ring-[var(--gr-border)]"
          style={{ clipPath: cutMd }}
        >
          <div className={`h-56 w-full bg-gradient-to-br md:h-72 ${coverGradient}`} />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-transparent to-transparent" />
          <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
        </div>

        <header className="space-y-4">
          <Eyebrow tone="amber">სტატია</Eyebrow>
          {game && (
            <Pill tone="violet">{game.emoji} {game.name_ka}</Pill>
          )}
          <DisplayHeading as="h1" size="lg" className="!text-[28px] sm:!text-[36px]">
            {article.title}
          </DisplayHeading>
          <div className="flex flex-wrap items-center gap-3 text-[12px] uppercase tracking-[0.14em] text-[var(--gr-text-dim)]">
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {
              (() => {
                const p = article.profiles as ArticleAuthor | ArticleAuthor[] | null;
                return (Array.isArray(p) ? p[0]?.username : p?.username) || "Admin";
              })()
            }</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formattedDate}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {readMinutes} წთ კითხვა</span>
          </div>
        </header>

        <div className="mt-6 h-px w-full bg-[var(--gr-border)]" />

        <div className="prose prose-invert mt-6 max-w-none whitespace-pre-line text-[15px] leading-[1.75] text-[var(--gr-text)]/90">
          {article.body}
        </div>

        <NewsCommentsClient
          articleId={article.id}
          articleSlug={article.slug}
          initialComments={comments}
          currentUser={sessionUser}
        />
      </article>
    </div>
  );
}
