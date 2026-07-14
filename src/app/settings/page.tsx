import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { SettingsForm } from "./settings-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { LinkedAccountsSection } from "@/components/linked-accounts-section";
import { SkillAssessment } from "@/components/skill-assessment";
import { PushBell } from "@/components/push-bell";
import { ReferralRedeemSection } from "@/components/referral-redeem-section";
import { LogoutButton } from "@/components/logout-button";
import { LogOut } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mockGames } from "@/lib/mock-data";

export const metadata = { title: "პარამეტრები" };

// Mirror of REDEEM_WINDOW_DAYS in app/api/referral/redeem — only surface the
// promo-code field to accounts still inside the manual-attribution window (and
// not already attributed). The API re-enforces both, so this is UX-only.
const REFERRAL_REDEEM_WINDOW_DAYS = 14;

function withinRedeemWindow(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= REFERRAL_REDEEM_WINDOW_DAYS * 86_400_000;
}

function SettingsSection({
  eyebrow,
  title,
  description,
  children,
  accentColor = "#8b5cf6"
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <section className="pubg-loadout-card relative overflow-hidden p-6 sm:p-8">
      <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
      <span
        aria-hidden
        className="pubg-loadout-rail absolute left-0 top-0 h-full w-[3px] z-[5]"
        style={{
          background: accentColor,
          boxShadow: `0 0 10px ${accentColor}`
        }}
      />
      <span aria-hidden className="pubg-loadout-corner absolute right-0 top-0 h-12 w-12 opacity-25 z-[5]" />
      
      <div className="relative z-10">
        <header className="mb-6">
          <Eyebrow tone="violet">{eyebrow}</Eyebrow>
          <h2 className="mt-2 font-display text-[20px] font-bold uppercase tracking-wider text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-[13px] text-white/60">{description}</p>
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

  const [{ data: dbGames }, { data: profile }] = await Promise.all([
    supabase.from("games").select("slug, name_ka, emoji"),
    supabase.from("profiles").select("username, display_name, avatar_url, created_at").eq("id", user.id).maybeSingle(),
  ]);

  // Whether to show the "enter your inviter's promo code" field. Gated to new
  // accounts that haven't already been attributed a referrer. The referred-side
  // read now works through the anon/RLS server client thanks to the
  // referrals_select_referred policy (a user may read the row where they are the
  // referred party) — no service-role client needed.
  let canRedeemReferral = false;
  if (profile?.created_at && withinRedeemWindow(profile.created_at)) {
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_id", user.id)
      .maybeSingle();
    canRedeemReferral = !existingReferral;
  }

  // Avatar upload was previously only reachable from the profile page. Surface it
  // here too — settings is where users expect to change their photo. AvatarUpload
  // handles its own storage upload + profiles.avatar_url write off the auth user.
  const avatarUsername = profile?.username ?? "user";
  const avatarDisplayName = profile?.display_name ?? avatarUsername;
  const avatarUrl = profile?.avatar_url ?? null;

  // Always expose the full catalog. Filtering to the user's existing
  // favorite_game_slugs looked helpful but was a trap: a new user's first
  // pick becomes their only favorite, which then permanently locked the
  // "main game" dropdown to that single game with no way to change or add.
  const dbSlugs = new Set((dbGames ?? []).map((g) => g.slug));
  const games = [
    ...(dbGames ?? []).map((g) => ({ slug: g.slug, nameKa: g.name_ka, emoji: g.emoji ?? "🎮" })),
    ...mockGames.filter((m) => !dbSlugs.has(m.slug)).map((m) => ({ slug: m.slug, nameKa: m.nameKa, emoji: m.emoji })),
  ];

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

        <SettingsSection eyebrow="პერსონალური" title="პროფილი" accentColor="#a78bfa">
          <div className="mb-6 flex items-center gap-4">
            <AvatarUpload
              username={avatarUsername}
              displayName={avatarDisplayName}
              avatarUrl={avatarUrl}
              isOwner
            />
            <div>
              <p className="text-[13px] font-semibold text-white">პროფილის ფოტო</p>
              <p className="text-[12px] text-white/50">დააჭირე ფოტოს ასატვირთად ან შესაცვლელად. მაქს. 5MB.</p>
            </div>
          </div>
          <SettingsForm games={games} />
        </SettingsSection>

        <SkillAssessment games={games} />

        <SettingsSection
          eyebrow="შეტყობინებები"
          title="Push შეტყობინებები"
          accentColor="#ec4899"
          description="ჩართე ბრაუზერის push შეტყობინებები — მიიღებ სიახლეებს ახალი გამოცხადებების, შეტყობინებებისა და მოწვევების შესახებ."
        >
          <PushBell />
        </SettingsSection>

        <LinkedAccountsSection />

        {canRedeemReferral && (
          <SettingsSection
            eyebrow="მოწვევა"
            title="პრომოკოდი"
            accentColor="#10b981"
            description="მოგიწვია მეგობარმა? ჩაწერე მისი კოდი და ორივემ მიიღეთ ჯილდო."
          >
            <ReferralRedeemSection />
          </SettingsSection>
        )}

        <SettingsSection eyebrow="ანგარიში" title="ანგარიში" accentColor="#f59e0b">
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/50">ელფოსტა</p>
              <p className="mt-1 text-[14px] font-medium text-white break-all">{user.email ?? "—"}</p>
            </div>
            <div className="h-px w-full bg-white/[0.06]" />
            <div className="inline-flex w-fit items-center gap-2 border border-white/10 bg-white/5 px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 [clip-path:polygon(0_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%)]">
              <LogOut className="h-3.5 w-3.5" />
              <LogoutButton />
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}
