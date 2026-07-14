import { notFound } from "next/navigation";
import { CalendarDays, Lock } from "lucide-react";
import { getClanGameContext, getClanFixtures } from "@/lib/clan/context";
import { CinematicBackground } from "@/components/ui/cinematic-background";
import { ClanSubPageHeader } from "@/components/clan/clan-subpage-header";
import { ClanSchedule, type ScheduleFixture } from "@/app/clans/[slug]/clan-schedule";

export const dynamic = "force-dynamic";
export const metadata = { title: "გრაფიკი | კლანი", robots: { index: false } };

type RsvpRow = { tournament_id: string; user_id: string; status: string };
type Prof = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export default async function ClanSchedulePage({
  params,
}: {
  params: Promise<{ slug: string; clanSlug: string }>;
}) {
  const { slug, clanSlug } = await params;
  const ctx = await getClanGameContext(slug, clanSlug);
  if (!ctx) notFound();

  let scheduleFixtures: ScheduleFixture[] = [];
  if (ctx.isMember) {
    const fixtures = await getClanFixtures(ctx.supabase, ctx.clan.id);
    const tournamentIds = fixtures.map((f) => f.tournamentId);

    let rsvpRows: RsvpRow[] = [];
    if (tournamentIds.length > 0) {
      const { data } = await ctx.supabase
        .from("clan_fixture_rsvps")
        .select("tournament_id, user_id, status")
        .eq("clan_id", ctx.clan.id)
        .in("tournament_id", tournamentIds);
      rsvpRows = (data ?? []) as RsvpRow[];
    }

    const inUserIds = [...new Set(rsvpRows.filter((r) => r.status === "in").map((r) => r.user_id))];
    const profMap = new Map<string, Prof>();
    if (inUserIds.length > 0) {
      const { data: profs } = await ctx.supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", inUserIds);
      (profs ?? []).forEach((p) => profMap.set(p.id, p as Prof));
    }

    const viewerId = ctx.session?.id ?? null;
    scheduleFixtures = fixtures.map((f) => {
      const rs = rsvpRows.filter((r) => r.tournament_id === f.tournamentId);
      return {
        ...f,
        counts: {
          in: rs.filter((r) => r.status === "in").length,
          out: rs.filter((r) => r.status === "out").length,
          maybe: rs.filter((r) => r.status === "maybe").length,
        },
        viewerStatus: (rs.find((r) => r.user_id === viewerId)?.status as "in" | "out" | "maybe" | undefined) ?? null,
        attendeesIn: rs
          .filter((r) => r.status === "in")
          .map((r) => {
            const p = profMap.get(r.user_id);
            return { name: p?.display_name || p?.username || "წევრი", avatar: p?.avatar_url ?? null, username: p?.username ?? "" };
          }),
      };
    });
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-transparent">
      <CinematicBackground color="indigo" />
      <div className="container relative mx-auto max-w-3xl px-4 py-8 lg:py-10">
        <ClanSubPageHeader
          clanSlug={clanSlug}
          clanName={ctx.clan.name}
          clanTag={ctx.clan.tag}
          clanAvatar={ctx.clan.avatar_url}
          gameName={ctx.game.name_ka}
          title="გრაფიკი"
          icon={CalendarDays}
          tone="text-[var(--gr-lime)]"
        />

        {ctx.isMember ? (
          <>
            <p className="mb-4 text-[12.5px] text-white/40">კლანის მომავალი ფიქსტურები — რეგისტრირებული ტურნირები და scrim-ები. მონიშნე დასწრება.</p>
            <ClanSchedule clanSlug={clanSlug} isMember={ctx.isMember} fixtures={scheduleFixtures} />
          </>
        ) : (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] py-12 text-center">
            <Lock className="mx-auto h-8 w-8 text-white/20" />
            <p className="mt-3 text-[13px] text-white/45">გრაფიკი მხოლოდ კლანის წევრებისთვისაა.</p>
          </div>
        )}
      </div>
    </div>
  );
}
