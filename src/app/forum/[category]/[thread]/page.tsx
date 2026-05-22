import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Eye } from "lucide-react";
import { ThreadClient } from "./thread-client";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Pill } from "@/components/ui/pill";
import { mockForumCategories, mockForumThreads } from "@/lib/mock-data";

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ category: string; thread: string }>;
}) {
  const { category, thread } = await params;
  const cat = mockForumCategories.find((c) => c.slug === category);
  const t = mockForumThreads[category]?.find((x) => x.slug === thread);
  if (!cat || !t) notFound();

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
            <Pill tone="neutral">{t.author}</Pill>
            <Pill tone="violet" icon={<MessageCircle className="h-3 w-3" />}>
              {t.replies} პოსტი
            </Pill>
            <Pill tone="neutral" icon={<Eye className="h-3 w-3" />}>
              {t.views} ნახვა
            </Pill>
          </div>
        </header>

        <ThreadClient />
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return Object.entries(mockForumThreads).flatMap(([category, threads]) =>
    threads.map((t) => ({ category, thread: t.slug })),
  );
}
