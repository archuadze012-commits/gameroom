import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { NewLfgForm } from "./new-lfg-form";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DisplayHeading } from "@/components/ui/display-heading";
import { GamerCard } from "@/components/ui/gamer-card";

export const metadata = { title: "ახალი ლოკალი" };

const neonText = {
  color: "#ffffff",
  textShadow: "0 0 6px rgba(196,30,58,0.48), 0 0 16px rgba(196,30,58,0.22)",
} as const;

const neonMute = {
  color: "rgba(255,255,255,0.72)",
  textShadow: "0 0 4px rgba(196,30,58,0.24)",
} as const;

export default async function NewLfgPage() {
  const user = await getSession();
  if (!user) redirect("/auth/login?next=/lfg/new");

  const supabase = await createSupabaseServerClient();

  const [{ data: dbGames }, { data: profileRows }, { data: myProfile }] = await Promise.all([
    supabase
      .from("games")
      .select("slug, name_ka, emoji")
      .eq("active", true)
      .order("position", { ascending: true })
      .order("name_ka", { ascending: true }),
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

  const allGames = (dbGames ?? []).map((g) => ({
    slug: g.slug,
    nameKa: g.name_ka,
    emoji: g.emoji ?? "🎮",
  }));

  const favoriteGames = allGames.filter((g) => userFavSet.has(g.slug));
  const filtered = favoriteGames.length > 0 ? favoriteGames : allGames;
  const games = filtered.sort((a, b) => {
    const aCount = favCount[a.slug] ?? 0;
    const bCount = favCount[b.slug] ?? 0;
    return bCount - aCount;
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <div aria-hidden className="pointer-events-none absolute inset-0 gr-dot-grid opacity-50" />

      <div className="container relative mx-auto max-w-2xl px-4 py-10 lg:py-14">
        <GamerCard
          clipSize={14}
          sideGlow={false}
          className="overflow-hidden"
          surfaceClassName="bg-[linear-gradient(180deg,color-mix(in_srgb,var(--gr-bg-1)_97%,black),color-mix(in_srgb,var(--gr-bg-2)_90%,black))]"
        >
          <div className="relative p-6 sm:p-7">
            <header className="mb-6 border-b border-[rgba(196,30,58,0.22)] pb-5">
              <p
                className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: "rgb(103,232,249)", textShadow: "0 0 8px rgba(34,211,238,0.72)" }}
              >
                ახალი ლოკალი
              </p>
              <DisplayHeading as="h1" size="md" className="mt-2 flex items-center gap-2" style={neonText}>
                <Users className="h-5 w-5 text-white drop-shadow-[0_0_8px_rgba(196,30,58,0.68)]" />
                იპოვე გუნდი
              </DisplayHeading>
              <p className="mt-3 text-[13px] leading-relaxed sm:text-[14px]" style={neonMute}>
                დაწერე რას ეძებ — რა თამაში, რა რანკი, რა რეგიონი. ხალხი მიგწერს.
              </p>
            </header>
            <NewLfgForm games={games} />
          </div>
        </GamerCard>
      </div>
    </div>
  );
}
