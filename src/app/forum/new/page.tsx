import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewThreadForm } from "./new-thread-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "ახალი თემა" };
export const dynamic = "force-dynamic";

export default async function NewForumThreadPage() {
  const session = await getSession().catch(() => null);
  if (!session) {
    redirect("/auth/login?next=/forum/new");
  }

  const supabase = await createSupabaseServerClient();
  const { data: dbCategories } = await supabase
    .from("forum_categories")
    .select("id, name, slug")
    .order("position", { ascending: true });

  const categories = dbCategories || [];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto px-4 py-10 lg:py-14 max-w-4xl">
        <header className="mb-8">
          <nav aria-label="Breadcrumb" className="mb-4">
            <Link
              href="/forum"
              className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--gr-text-dim)] hover:text-[var(--gr-text-mute)]"
            >
              მთავარი / ფორუმი
            </Link>
          </nav>
          
          <Eyebrow tone="violet">დისკუსია</Eyebrow>
          <DisplayHeading as="h1" size="md" className="mt-3">
            ახალი თემის შექმნა
          </DisplayHeading>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--gr-text-mute)]">
            გაუზიარე საზოგადოებას შენი იდეა, კითხვა ან სიახლე.
          </p>
        </header>

        <div className="relative isolate">
          <div 
            className="relative bg-[var(--gr-bg-1)] p-6 sm:p-8"
            style={{ clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)" }}
          >
            <span aria-hidden className="absolute left-0 top-0 h-[2px] w-full bg-[var(--gr-grad-violet)]" />
            <NewThreadForm categories={categories} />
          </div>
          {/* Decorative cut corner border effect behind */}
          <div 
            className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--gr-violet)]/30 to-[var(--gr-magenta)]/30 blur-md opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
