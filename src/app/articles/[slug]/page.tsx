import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getPublishedArticle } from "@/lib/articles-db";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { ArticleOwnerActions } from "@/components/article-owner-actions";
import { getIsAdmin, getSession } from "@/lib/auth";
import { getSiteUrl } from "@/lib/url";

// Cached per-request so generateMetadata and the page share ONE DB read.
const getArticle = cache((slug: string) => getPublishedArticle(slug).catch(() => null));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const article = await getArticle(decodeURIComponent(rawSlug));
  if (!article) return { title: "სტატია ვერ მოიძებნა", robots: { index: false } };
  const description = (article.excerpt ?? article.content).replace(/\s+/g, " ").trim().slice(0, 160);
  const url = `/articles/${encodeURIComponent(article.slug)}`;
  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url,
      publishedTime: article.published_at,
      authors: [article.author_display_name ?? article.author_username],
      images: article.cover_url ? [{ url: article.cover_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.cover_url ? [article.cover_url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const [article, session, isAdmin] = await Promise.all([
    getArticle(slug),
    getSession().catch(() => null),
    getIsAdmin().catch(() => false),
  ]);
  if (!article) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? undefined,
    image: article.cover_url ?? undefined,
    datePublished: article.published_at,
    author: { "@type": "Person", name: article.author_display_name ?? article.author_username },
    publisher: { "@type": "Organization", name: "PLAYGAME.GE" },
    mainEntityOfPage: `${getSiteUrl()}/articles/${encodeURIComponent(article.slug)}`,
  };
  const canEdit = !!session && session.id === article.author_id;
  const canDelete = canEdit || isAdmin;

  const readingMinutes = Math.max(1, Math.round(article.content.split(/\s+/).length / 180));

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-40" />

      {/* HERO — cover with overlaid title at the bottom-left */}
      <div className="relative">
        {article.cover_url ? (
          <div className="relative h-[420px] w-full overflow-hidden lg:h-[520px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_url}
              alt={article.title}
              className="h-full w-full object-cover"
            />
            {/* layered gradients — strong at bottom, subtle at top */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--gr-bg-0)]/85 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--gr-bg-0)] via-[var(--gr-bg-0)]/70 to-transparent" />

            {/* magenta accent line bottom */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[3px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(236,72,153,0.9) 30%, rgba(236,72,153,0.9) 70%, transparent)",
                boxShadow: "0 0 24px rgba(236,72,153,0.5)",
              }}
            />

            {/* back nav — over hero */}
            <div className="absolute left-0 right-0 top-0 z-10">
              <div className="container mx-auto px-4 py-6">
                <Link
                  href="/articles"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gr-bg-0)]/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text)] backdrop-blur-md ring-1 ring-[var(--gr-border)] transition-all hover:bg-[var(--gr-bg-0)]/80 hover:ring-[rgba(236,72,153,0.5)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> სტატიები
                </Link>
              </div>
            </div>

            {/* title overlay on hero */}
            <div className="absolute inset-x-0 bottom-0">
              <div className="container mx-auto px-4 pb-10 lg:pb-14">
                <div className="max-w-3xl">
                  {article.game_name && article.game_slug && (
                    <Link
                      href={`/games/${article.game_slug}`}
                      className="mb-4 inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white"
                      style={{
                        background: "rgba(236,72,153,0.92)",
                        clipPath: "polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
                        paddingRight: "1.1rem",
                      }}
                    >
                      {article.game_name}
                    </Link>
                  )}
                  <h1 className="font-display text-[32px] font-black uppercase leading-[1.05] tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] lg:text-[48px]">
                    {article.title}
                  </h1>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // no cover — simple header
          <div className="container relative mx-auto max-w-3xl px-4 pt-10">
            <Link
              href="/articles"
              className="mb-6 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> სტატიები
            </Link>
            {article.game_name && article.game_slug && (
              <Link
                href={`/games/${article.game_slug}`}
                className="mb-4 inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white"
                style={{
                  background: "rgba(236,72,153,0.92)",
                  clipPath: "polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)",
                  paddingRight: "1.1rem",
                }}
              >
                {article.game_name}
              </Link>
            )}
            <h1 className="font-display text-[32px] font-black uppercase leading-[1.05] tracking-tight text-[var(--gr-text)] lg:text-[44px]">
              {article.title}
            </h1>
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="container relative mx-auto max-w-2xl px-4 py-10">
        {/* meta strip */}
        <div className="mb-8 flex items-center justify-between gap-4 border-y border-[var(--gr-border)] py-4">
          <Link
            href={`/profile/${article.author_username}`}
            className="flex items-center gap-3 group"
          >
            <UserAvatar username={article.author_username} size="sm" className="h-9 w-9 ring-1 ring-[rgba(236,72,153,0.3)]" />
            <div>
              <p className="text-[13px] font-bold text-[var(--gr-text)] group-hover:text-[var(--gr-magenta)] transition-colors">
                {article.author_display_name ?? article.author_username}
              </p>
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--gr-text-dim)]">
                ჟურნალისტი
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-[var(--gr-text-dim)]">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              {readingMinutes} წთ კითხვა
            </span>
            <span className="h-3 w-px bg-[var(--gr-border-hi)]" />
            <span>
              {formatDistanceToNow(new Date(article.published_at), {
                addSuffix: true,
                locale: ka,
              })}
            </span>
          </div>
        </div>

        {canDelete || canEdit ? (
          <div className="mb-8 flex justify-end">
            <ArticleOwnerActions
              slug={article.slug}
              canEdit={canEdit}
              canDelete={canDelete}
              editHref={`/articles/${encodeURIComponent(article.slug)}/edit`}
            />
          </div>
        ) : null}

        {/* excerpt as lede */}
        {article.excerpt && (
          <p className="mb-10 border-l-2 border-[rgba(236,72,153,0.7)] pl-5 text-[17px] font-medium leading-[1.6] text-[var(--gr-text)]/85">
            {article.excerpt}
          </p>
        )}

        {/* body paragraphs — with drop cap on first paragraph */}
        <div className="space-y-6">
          {article.content.split(/\n\n+/).map((para, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "text-[16px] leading-[1.75] text-[var(--gr-text)]/90 first-letter:font-display first-letter:text-[56px] first-letter:font-black first-letter:leading-[0.85] first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-[var(--gr-magenta)]"
                  : "text-[16px] leading-[1.75] text-[var(--gr-text)]/90"
              }
            >
              {para}
            </p>
          ))}
        </div>

        {/* end marker */}
        <div className="mt-14 flex items-center justify-center gap-3">
          <span className="h-px w-12 bg-[var(--gr-border)]" />
          <span
            className="text-[10px] font-bold uppercase tracking-[0.32em]"
            style={{ color: "rgba(236,72,153,0.85)" }}
          >
            ◆ დასასრული ◆
          </span>
          <span className="h-px w-12 bg-[var(--gr-border)]" />
        </div>

        {/* back to articles */}
        <div className="mt-10 flex justify-center">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gr-text)] transition-all hover:text-[var(--gr-magenta)]"
            style={{
              background: "rgba(236,72,153,0.08)",
              clipPath: "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)",
              padding: "0.7rem 1.5rem",
            }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> ყველა სტატია
          </Link>
        </div>
      </div>
    </div>
  );
}
