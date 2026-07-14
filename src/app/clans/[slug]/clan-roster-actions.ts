"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { resolveClanRole } from "@/lib/clan/server-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-roster-actions");
type Result = { success: boolean; message?: string };

const LINEUP_STATUSES = ["starter", "sub", "bench"];

function revalidate(clanSlug: string, gameSlug: string | null) {
  revalidatePath(`/clans/${clanSlug}`);
  if (gameSlug) revalidatePath(`/games/${gameSlug}/rosters/${clanSlug}`);
}

// Set a member's competitive lineup fields (position / starter-sub-bench /
// jersey). Leader/officer only; admin-client write after the role check.
export async function setClanMemberLineupAction(
  clanSlug: string,
  memberId: string,
  patch: { position?: string | null; lineupStatus?: string; jerseyNumber?: number | null },
): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !["leader", "officer"].includes(info.role ?? "")) return { success: false, message: "უფლება არ გაქვს" };

  const update: { position?: string | null; lineup_status?: string; jersey_number?: number | null } = {};
  if (patch.position !== undefined) {
    const pos = (patch.position ?? "").trim().slice(0, 24);
    update.position = pos || null;
  }
  if (patch.lineupStatus !== undefined) {
    if (!LINEUP_STATUSES.includes(patch.lineupStatus)) return { success: false, message: "არასწორი სტატუსი" };
    update.lineup_status = patch.lineupStatus;
  }
  if (patch.jerseyNumber !== undefined) {
    const n = patch.jerseyNumber;
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 999)) return { success: false, message: "ნომერი 0-999 შუალედში" };
    update.jersey_number = n;
  }
  if (Object.keys(update).length === 0) return { success: true };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("clan_members").update(update).eq("id", memberId).eq("clan_id", info.clanId);
  if (error) {
    if (error.code === "23505") return { success: false, message: "ეს ნომერი უკვე დაკავებულია" };
    logger.error("lineup update failed", { clanSlug, memberId, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidate(clanSlug, info.gameSlug);
  return { success: true, message: "განახლდა" };
}

// Captain is exclusive per clan — assigning one clears any existing captain.
export async function setClanCaptainAction(clanSlug: string, memberId: string, isCaptain: boolean): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !["leader", "officer"].includes(info.role ?? "")) return { success: false, message: "უფლება არ გაქვს" };

  const admin = createSupabaseAdminClient();
  if (isCaptain) {
    await admin.from("clan_members").update({ is_captain: false }).eq("clan_id", info.clanId).eq("is_captain", true);
  }
  const { error } = await admin.from("clan_members").update({ is_captain: isCaptain }).eq("id", memberId).eq("clan_id", info.clanId);
  if (error) {
    logger.error("captain set failed", { clanSlug, memberId, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidate(clanSlug, info.gameSlug);
  return { success: true, message: isCaptain ? "კაპიტანი დაინიშნა 🅒" : "კაპიტანობა მოხსნილია" };
}
