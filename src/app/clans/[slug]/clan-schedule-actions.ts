"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { resolveClanRole } from "@/lib/clan/server-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-schedule-actions");
type Result = { success: boolean; message?: string };

const RSVP_STATUSES = ["in", "out", "maybe"];

// A clan member marks their availability (in / out / maybe) for an upcoming
// FIXTURE — a tournament/scrim the clan is registered for. Fixtures themselves
// are not created here; they appear automatically on registration.
export async function rsvpClanFixtureAction(clanSlug: string, tournamentId: string, status: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !info.role) return { success: false, message: "მხოლოდ წევრებს შეუძლიათ" };
  if (!RSVP_STATUSES.includes(status)) return { success: false, message: "არასწორი პასუხი" };

  const admin = createSupabaseAdminClient();
  // The clan must actually be registered for this tournament for a fixture to exist.
  const { data: entry } = await admin
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("clan_id", info.clanId)
    .maybeSingle();
  if (!entry) return { success: false, message: "კლანი ამ ფიქსტურაზე არ არის რეგისტრირებული" };

  const { error } = await admin
    .from("clan_fixture_rsvps")
    .upsert({ clan_id: info.clanId, tournament_id: tournamentId, user_id: user.id, status }, { onConflict: "clan_id,tournament_id,user_id" });
  if (error) {
    logger.error("fixture rsvp failed", { clanSlug, tournamentId, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidatePath(`/clans/${clanSlug}`);
  if (info.gameSlug) revalidatePath(`/games/${info.gameSlug}/schedule/${clanSlug}`);
  return { success: true };
}
