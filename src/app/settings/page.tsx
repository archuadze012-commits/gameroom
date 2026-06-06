import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { SettingsForm } from "./settings-form";
import { LinkedAccountsSection } from "@/components/linked-accounts-section";
import { SkillAssessment } from "@/components/skill-assessment";
import { PushBell } from "@/components/push-bell";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockGames } from "@/lib/mock-data";

export const metadata = { title: "პარამეტრები" };

const cutMd = "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)";
const cardBorder = "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(192,38,211,0.5))";

function AngularSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="relative isolate"
      style={{ background: cardBorder, padding: 1, clipPath: cutMd }}
    >
      <div className="relative bg-[var(--gr-bg-1)] p-6 gr-sweep" style={{ clipPath: cutMd }}>
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[var(--gr-grad-card)]" />
        <header className="mb-5">
          <Eyebrow tone="amber">{eyebrow}</Eyebrow>
          <h2 className="mt-2 font-display text-[20px] font-bold uppercase tracking-tight text-[var(--gr-text)]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[13px] text-[var(--gr-text-mute)]">{description}</p>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}

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
    ...(dbGames ?? []).map((g) => ({ slug: g.slug, nameKa: g.name_ka, emoji: g.emoji ?? "🎮" })),
    ...mockGames.filter((m) => !dbSlugs.has(m.slug)).map((m) => ({ slug: m.slug, nameKa: m.nameKa, emoji: m.emoji })),
  ];

  const games = favSlugs.length > 0
    ? allGames.filter((g) => favSlugs.includes(g.slug))
    : allGames;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      {/* Cinematic Ambient Background */}
      <CinematicBackground color="violet" />

      <div className="container relative mx-auto max-w-3xl px-4 py-10 lg:py-14 space-y-6">
        <PageHeader
          color="violet"
          eyebrow="ანგარიში"
          title="პარამეტრები"
          description="შენი პროფილი, ხელმისაწვდომობა, თამაშების ცნობარი."
        />

        <AngularSection eyebrow="პერსონალური" title="პროფილი">
          <SettingsForm games={games} />
        </AngularSection>

        <SkillAssessment games={games} />

        <AngularSection
          eyebrow="შეტყობინებები"
          title="Push შეტყობინებები"
          description="ჩართე ბრაუზერის push შეტყობინებები — მიიღებ სიახლეებს ახალი გამოცხადებების, შეტყობინებებისა და მოწვევების შესახებ."
        >
          <PushBell />
        </AngularSection>

        <LinkedAccountsSection />
      </div>
    </div>
  );
}
