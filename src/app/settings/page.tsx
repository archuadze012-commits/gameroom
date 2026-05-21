import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "./settings-form";
import { LinkedAccountsSection } from "@/components/linked-accounts-section";
import { SkillAssessment } from "@/components/skill-assessment";
import { PushBell } from "@/components/push-bell";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockGames } from "@/lib/mock-data";

export const metadata = { title: "პარამეტრები" };

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/auth/login?next=/settings");

  const supabase = await createSupabaseServerClient();

  const [{ data: dbGames }, { data: profileData }] = await Promise.all([
    supabase.from("games").select("slug, name_ka, emoji"),
    supabase.from("profiles").select("favorite_game_slugs").eq("id", user.id).maybeSingle(),
  ]);

  const favSlugs: string[] = (profileData?.favorite_game_slugs as string[] | null) ?? [];
  const dbSlugs = new Set((dbGames ?? []).map((g) => g.slug));

  const allGames = [
    ...(dbGames ?? []).map((g) => ({ slug: g.slug, nameKa: g.name_ka, emoji: g.emoji })),
    ...mockGames.filter((m) => !dbSlugs.has(m.slug)).map((m) => ({ slug: m.slug, nameKa: m.nameKa, emoji: m.emoji })),
  ];

  const games = favSlugs.length > 0
    ? allGames.filter((g) => favSlugs.includes(g.slug))
    : allGames;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8">
      <PageHeader
        title="პარამეტრები"
        description="შენი პროფილი, ხელმისაწვდომობა, თამაშების ცნობარი."
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>პროფილი</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm games={games} />
        </CardContent>
      </Card>

      <SkillAssessment games={games} />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>Push შეტყობინებები</CardTitle>
          <CardDescription>
            ჩართე ბრაუზერის push შეტყობინებები — მიიღებ სიახლეებს ახალი გამოცხადებების, შეტყობინებებისა და მოწვევების შესახებ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushBell />
        </CardContent>
      </Card>

      <LinkedAccountsSection />
    </div>
  );
}
