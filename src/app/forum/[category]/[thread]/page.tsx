import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Eye } from "lucide-react";
import { ThreadClient } from "./thread-client";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ category: string; thread: string }>;
}) {
  const { category, thread } = await params;
  const supabase = await createSupabaseServerClient();
  const sessionUser = await getSession().catch(() => null);

  // Fetch category
  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, name, slug")
    .eq("slug", category)
    .single();

  if (!cat) notFound();

  // Fetch thread
  const { data: t } = await supabase
    .from("forum_threads")
    .select(`
      id,
      title,
      slug,
      views,
      created_at,
      pinned,
      author_id,
      profiles:author_id (
        username
      )
    `)
    .eq("category_id", cat.id)
    .eq("slug", thread)
    .single();

  if (!t) notFound();

  // Increment view count
  await supabase
    .from("forum_threads")
    .update({ views: (t.views || 0) + 1 })
    .eq("id", t.id);

  // Fetch posts for the thread
  const { data: dbPosts } = await supabase
    .from("forum_posts")
    .select(`
      id,
      body,
      created_at,
      author_id,
      profiles:author_id (
        username,
        avatar_url
      ),
      forum_likes (
        user_id
      )
    `)
    .eq("thread_id", t.id)
    .order("created_at", { ascending: true });

  const posts = (dbPosts || []).map((p: any) => {
    const likes = p.forum_likes || [];
    const hasLiked = sessionUser ? likes.some((l: any) => l.user_id === sessionUser.id) : false;
    return {
      id: p.id,
      author: p.profiles?.username || "Anonymous",
      authorId: p.author_id,
      ago: formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ka }),
      body: p.body,
      likes: likes.length,
      hasLiked,
    };
  });

  const repliesCount = Math.max(0, posts.length - 1);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-4xl px-4 py-10 lg:py-14">
        <Link
          href={`/forum/${category}`}
          className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> ფორუმი / {cat.name}
        </Link>

        <header
          className="relative mt-2 mb-8 pb-6 after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-gradient-to-r after:from-[var(--gr-violet)]/40 after:via-[var(--gr-violet)]/10 after:to-transparent"
        >
          <Eyebrow tone="violet">თემა</Eyebrow>
          <DisplayHeading as="h1" size="lg" className="mt-3" uppercase={false}>
            {t.title}
          </DisplayHeading>
          <div className="mt-4 flex items-center gap-2">
            <Pill tone="neutral">
              {(() => {
                const p = t.profiles;
                return (Array.isArray(p) ? p[0]?.username : (p as any)?.username) || "Anonymous";
              })()}
            </Pill>
            <Pill tone="violet" icon={<MessageCircle className="h-3 w-3" />}>
              {repliesCount} პასუხი
            </Pill>
            <Pill tone="neutral" icon={<Eye className="h-3 w-3" />}>
              {(t.views || 0) + 1} ნახვა
            </Pill>
          </div>
        </header>

        <ThreadClient
          threadId={t.id}
          initialPosts={posts}
          currentUser={sessionUser}
          threadAuthorId={t.author_id}
        />
      </div>
    </div>
  );
}
