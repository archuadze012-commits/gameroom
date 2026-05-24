import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { NewLfgForm } from "./new-lfg-form";
import { getSession } from "@/lib/auth";
import { mockGames } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DisplayHeading } from "@/components/ui/display-heading";

export const metadata = { title: "ახალი ლოკალი" };
export const dynamic = "force-dynamic";

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

export default async function NewLfgPage() {
  const user = await getSession();
  if (!user) redirect("/auth/login?next=/lfg/new");

  const supabase = await createSupabaseServerClient();

  const [{ data: dbGames }, { data: profileRows }, { data: myProfile }] = await Promise.all([
    supabase.from("games").select("slug, name_ka, emoji"),
    supabase.from("profiles").select("favorite_game_slugs"),
    supabase.from("profiles").select("favorite_game_slugs").eq("id", user.id).single(),
  ]);

  const favCount: Record<string, number> = {};
  for (const row of profileRows ?? []) {
    for (const slug of (row.favorite_game_slugs as string[] | null) ?? []) {
      favCount[slug] = (favCount[slug] ?? 0) + 1;
    }
  }

  const userFavSlugs: string[] = (myProfile?.favorite_game_slugs as string[] | null) ?? [];
  const userFavSet = new Set(userFavSlugs);

  const dbSlugs = new Set((dbGames ?? []).map((g) => g.slug));
  const allGames = [
    ...(dbGames ?? []).map((g) => ({ slug: g.slug, nameKa: g.name_ka, emoji: g.emoji })),
    ...mockGames.filter((m) => !dbSlugs.has(m.slug)).map((m) => ({ slug: m.slug, nameKa: m.nameKa, emoji: m.emoji })),
  ];

  const filtered = userFavSet.size > 0
    ? allGames.filter((g) => userFavSet.has(g.slug))
    : allGames;
  const games = filtered.sort((a, b) => {
    const aCount = favCount[a.slug] ?? 0;
    const bCount = favCount[b.slug] ?? 0;
    return bCount - aCount;
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-[var(--gr-bg-0)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[var(--gr-violet)]/20 blur-[120px]" />

      <div className="container relative mx-auto max-w-2xl px-4 py-10 lg:py-14">
        <section
          className="relative isolate"
          style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
        >
          <div className="relative bg-[var(--gr-bg-1)] p-7 gr-sweep" style={{ clipPath: cutMd }}>
            <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
            <header className="mb-6">
              <Eyebrow tone="amber">ახალი ლოკალი</Eyebrow>
              <DisplayHeading as="h1" size="md" className="mt-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--gr-violet-hi)]" />
                იპოვე გუნდი
              </DisplayHeading>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--gr-text-mute)]">
                დაწერე რას ეძებ — რა თამაში, რა რანკი, რა რეგიონი. ხალხი მიგწერს.
              </p>
            </header>
            <NewLfgForm games={games} />
          </div>
        </section>
      </div>
    </div>
  );
}
