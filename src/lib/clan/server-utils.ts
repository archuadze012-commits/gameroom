import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-server-utils");

// Resolve the caller's clan id + game slug + role from a clan slug, using the
// admin client so role checks are reliable regardless of RLS. Shared by the
// clan feature server actions (roster/schedule/matches).
export async function resolveClanRole(slug: string, userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: clan } = await admin.from("clans").select("id, game_slug").eq("slug", slug).maybeSingle();
  if (!clan) return null;
  const { data: m } = await admin
    .from("clan_members")
    .select("role")
    .eq("clan_id", clan.id)
    .eq("user_id", userId)
    .maybeSingle();
  return {
    clanId: clan.id as string,
    gameSlug: (clan.game_slug as string | null) ?? null,
    role: (m?.role as string | undefined) ?? null,
  };
}

// Clan XP curve: every 1000 XP is a level. Best-effort; never throws.
export async function awardClanXp(clanId: string, userId: string, amount: number) {
  const admin = createSupabaseAdminClient();
  try {
    await admin.rpc("award_clan_xp", { p_clan: clanId, p_user: userId, p_amount: amount });
  } catch (e) {
    logger.warn("award_clan_xp failed", { clanId, error: e });
  }
}
