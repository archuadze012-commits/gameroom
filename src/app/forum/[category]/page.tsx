import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin, MessageCircle, Eye, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";
import { getForumTheme } from "@/lib/forum-themes";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

export const dynamic = "force-dynamic";

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch category
  const { data: cat } = await supabase
    .from("forum_categories")
    .select("id, name, slug, description")
    .eq("slug", category)
    .single();

  if (!cat) notFound();

  // Fetch threads belonging to the category
  const { data: dbThreads } = await supabase
    .from("forum_threads")
    .select(`
      id,
      title,
      slug,
      pinned,
      views,
      last_reply_at,
      created_at,
      profiles:author_id (
        username
      ),
      forum_posts (
        id
      )
    `)
    .eq("category_id", cat.id)
    .order("pinned", { ascending: false })
    .order("last_reply_at", { ascending: false });

  const theme = getForumTheme(category);
  const threads = (dbThreads || []).map((t: any) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    pinned: t.pinned,
    author: t.profiles?.username || "Anonymous",
    lastReplyAgo: formatDistanceToNow(new Date(t.last_reply_at || t.created_at), { addSuffix: true, locale: ka }),
    replies: Math.max(0, (t.forum_posts?.length || 0) - 1),
    views: t.views,
  }));

  const pinned = threads.filter((t) => t.pinned);
  const regular = threads.filter((t) => !t.pinned);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        <Link
          href="/forum"
          className="mb-4 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> ფორუმი / {cat.name}
        </Link>

        <PageHeader
          eyebrow="კატეგორია"
          title={cat.name}
          description={cat.description}
          actions={
            <ChevronButton href={`/forum/${cat.slug}/new`} variant="violet" size="md">
              <Plus className="h-4 w-4" /> ახალი თემა
            </ChevronButton>
          }
        />

        <div className="mt-10 space-y-2">
          {[...pinned, ...regular].map((thread) => (
            <Link key={thread.slug} href={`/forum/${cat.slug}/${thread.slug}`} className="block">
              {/* Outer border wrapper */}
              <div
                className="group relative isolate transition-all duration-300 hover:-translate-y-0.5 hover:[--card-border:rgba(236,72,153,0.85)]"
                style={{
                  clipPath: cutSm,
                  background: thread.pinned
                    ? "var(--card-border, rgba(245,165,36,0.55))"
                    : "var(--card-border, rgba(167,139,250,0.55))",
                  padding: 1,
                }}
              >
                {/* Inner card */}
                <div
                  className="relative overflow-hidden bg-[var(--gr-bg-1)] p-4"
                  style={{ clipPath: cutSm }}
                >
                  {/* Permanent top accent line */}
                  <span aria-hidden className="absolute left-0 top-0 z-10 h-[2px] w-full"
                    style={{ background: thread.pinned
                      ? "linear-gradient(90deg,transparent,rgba(245,165,36,0.8),transparent)"
                      : "linear-gradient(90deg,transparent,rgba(167,139,250,0.8),transparent)" }} />
                  {/* Magenta laser sweeper on hover */}
                  <span aria-hidden
                    className="pointer-events-none absolute left-0 top-0 z-10 h-[2px] w-full translate-x-[-100%] opacity-0
                               group-hover:translate-x-[100%] group-hover:opacity-100
                               group-hover:transition-transform group-hover:duration-700"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(236,72,153,0.9),transparent)" }} />
                  {/* Subtle glow always */}
                  <div aria-hidden className="pointer-events-none absolute inset-0"
                    style={{ background: thread.pinned
                      ? "radial-gradient(ellipse at 50% 0%,rgba(245,165,36,0.09) 0%,transparent 65%)"
                      : "radial-gradient(ellipse at 50% 0%,rgba(167,139,250,0.09) 0%,transparent 65%)" }} />
                  {/* Magenta glow on hover */}
                  <div aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(236,72,153,0.11) 0%,transparent 65%)" }} />

                  {/* Pinned amber left border */}
                  {thread.pinned && (
                    <span aria-hidden className="absolute left-0 top-0 z-20 h-full w-[3px] bg-[var(--gr-amber)] shadow-[0_0_10px_rgba(245,165,36,0.6)]" />
                  )}

                  <div className="flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {thread.pinned && (
                          <Pill tone="amber" icon={<Pin className="h-3 w-3" />}>pinned</Pill>
                        )}
                        <h3 className="truncate font-display text-[15px] font-bold uppercase tracking-tight text-[var(--gr-text)] group-hover:text-[var(--gr-violet-hi)]">
                          {thread.title}
                        </h3>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <Pill tone="base" className="px-2 py-0.5 text-[10px]">
                           @{thread.author}
                        </Pill>
                        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                           {thread.lastReplyAgo}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Pill tone={theme.accent === "amber" ? "amber" : theme.accent === "magenta" ? "violet" : theme.accent} icon={<MessageCircle className="h-3 w-3" />}>
                        {thread.replies}
                      </Pill>
                      <Pill tone="neutral" icon={<Eye className="h-3 w-3" />} className="hidden sm:inline-flex">
                        {thread.views}
                      </Pill>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}


