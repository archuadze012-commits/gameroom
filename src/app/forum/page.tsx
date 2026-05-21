import Link from "next/link";
import { Plus } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { ChevronButton } from "@/components/ui/chevron-button";
import { ForumSearch } from "@/components/forum/forum-search";
import { ForumTabs } from "@/components/forum/forum-tabs";
import { TrendingStrip } from "@/components/forum/trending-strip";
import { CategoryCard } from "@/components/forum/category-card";
import { ForumSidebar } from "@/components/forum/forum-sidebar";
import { mockForumCategories, mockForumThreads } from "@/lib/mock-data";

export const metadata = { title: "ფორუმი" };

export default function ForumPage() {
  // Build a "trending" strip from the hottest thread in each category.
  const trending = mockForumCategories.flatMap((cat) => {
    const threads = mockForumThreads[cat.slug] ?? [];
    const top = [...threads].sort((a, b) => b.replies - a.replies)[0];
    if (!top) return [];
    return [{
      href: `/forum/${cat.slug}/${top.slug}`,
      title: top.title,
      replies: top.replies,
      categorySlug: cat.slug,
      categoryName: cat.name,
    }];
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      {/* faint dot grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14">
        {/* hero ──────────────────────────────────────────────── */}
        <header className="mb-8">
          <nav aria-label="Breadcrumb" className="mb-4">
            <Link
              href="/"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
            >
              მთავარი / ფორუმი
            </Link>
          </nav>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <Eyebrow tone="amber">საზოგადოება</Eyebrow>
              <DisplayHeading as="h1" size="lg" className="mt-3">
                ფორუმი
              </DisplayHeading>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
                დისკუსიები, კითხვები, იდეები. დაიწყე საუბარი ან შემოუერთდი არსებულს.
              </p>
            </div>
            <ChevronButton href="/forum/new" variant="violet" size="md">
              <Plus className="h-4 w-4" /> ახალი თემა
            </ChevronButton>
          </div>

          <div className="mt-6">
            <ForumSearch />
          </div>
        </header>

        {/* trending strip ────────────────────────────────────── */}
        <div className="mb-10">
          <TrendingStrip items={trending} />
        </div>

        {/* main grid ─────────────────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="mb-5 flex items-end justify-between">
              <Eyebrow tone="violet">კატეგორიები</Eyebrow>
              <ForumTabs />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {mockForumCategories.map((cat) => (
                <CategoryCard key={cat.slug} category={cat} />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <ChevronButton href="/forum/all" variant="ghost" size="md">
                ყველა კატეგორია
              </ChevronButton>
            </div>
          </div>

          <ForumSidebar />
        </div>
      </div>
    </div>
  );
}
