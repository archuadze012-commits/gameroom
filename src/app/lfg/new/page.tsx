import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewLfgForm } from "./new-lfg-form";
import { getSession } from "@/lib/auth";
import { mockGames } from "@/lib/mock-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "ახალი LFG" };
export const dynamic = "force-dynamic";

export default async function NewLfgPage() {
  const user = await getSession();
  if (!user) redirect("/auth/login?next=/lfg/new");

  const supabase = await createSupabaseServerClient();

  const [{ data: dbGames }, { data: profileRows }, { data: myProfile }] = await Promise.all([
    supabase.from("games").select("slug, name_ka, emoji"),
    supabase.from("profiles").select("favorite_game_slugs"),
    supabase.from("profiles").select("favorite_game_slugs").eq("id", user.id).single(),
  ]);

  // Count how many users have each game as favorite
  const favCount: Record<string, number> = {};
  for (const row of profileRows ?? []) {
    for (const slug of (row.favorite_game_slugs as string[] | null) ?? []) {
      favCount[slug] = (favCount[slug] ?? 0) + 1;
    }
  }

  const userFavSlugs: string[] = (myProfile?.favorite_game_slugs as string[] | null) ?? [];
  const userFavSet = new Set(userFavSlugs);

  // Build unified list: DB games override mock by slug
  const dbSlugs = new Set((dbGames ?? []).map((g) => g.slug));
  const allGames = [
    ...(dbGames ?? []).map((g) => ({ slug: g.slug, nameKa: g.name_ka, emoji: g.emoji })),
    ...mockGames.filter((m) => !dbSlugs.has(m.slug)).map((m) => ({ slug: m.slug, nameKa: m.nameKa, emoji: m.emoji })),
  ];

  // Sort: user's favorites first, then by global fav count desc
  const games = allGames.sort((a, b) => {
    const aFav = userFavSet.has(a.slug) ? 1 : 0;
    const bFav = userFavSet.has(b.slug) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    const aCount = favCount[a.slug] ?? 0;
    const bCount = favCount[b.slug] ?? 0;
    return bCount - aCount;
  });

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-2xl">ახალი LFG</CardTitle>
          <p className="text-sm text-muted-foreground">
            დაწერე რას ეძებ — რა თამაში, რა რანკი, რა რეგიონი. ხალხი მიგწერს.
          </p>
        </CardHeader>
        <CardContent>
          <NewLfgForm games={games} />
        </CardContent>
      </Card>
    </div>
  );
}
