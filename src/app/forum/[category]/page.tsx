import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pin, MessageCircle, Eye, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ChevronButton } from "@/components/ui/chevron-button";
import { Pill } from "@/components/ui/pill";
import { mockForumCategories, mockForumThreads } from "@/lib/mock-data";
import { getForumTheme } from "@/lib/forum-themes";

const cutSm = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

export default async function ForumCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = mockForumCategories.find((c) => c.slug === category);
  if (!cat) notFound();
  const theme = getForumTheme(category);
  const threads = mockForumThreads[category] ?? [];
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
              <article
                className={`group relative bg-[var(--gr-bg-1)] p-4 transition-all duration-200 hover:-translate-y-0.5 gr-sweep ${
                  thread.pinned
                    ? "ring-1 ring-[var(--gr-amber)]/30 hover:ring-[var(--gr-amber)]/60"
                    : "ring-1 ring-[var(--gr-border)] hover:ring-[var(--gr-border-hi)]"
                }`}
                style={{ clipPath: cutSm }}
              >
                {thread.pinned && (
                  <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-[var(--gr-amber)] shadow-[0_0_10px_rgba(245,165,36,0.6)]" />
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
                    <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--gr-text-dim)]">
                      {thread.author} · {thread.lastReplyAgo}
                    </p>
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
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return mockForumCategories.map((c) => ({ category: c.slug }));
}
