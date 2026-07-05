import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TeamPrivacy = {
  hideSquad: boolean;
  hideWallet: boolean;
  hideTransfers: boolean;
};

const OPEN: TeamPrivacy = { hideSquad: false, hideWallet: false, hideTransfers: false };

// A team's privacy toggles. Read with the service-role client because the public
// manager/team/player pages (viewed by OTHER users) must resolve it — the RLS
// select policy only exposes it to the owner. Missing row = nothing hidden.
export async function getTeamPrivacy(teamId: string | null | undefined): Promise<TeamPrivacy> {
  if (!teamId) return OPEN;
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from("pm_team_privacy")
    .select("hide_squad, hide_wallet, hide_transfers")
    .eq("team_id", teamId)
    .maybeSingle();
  if (!data) return OPEN;
  return {
    hideSquad: data.hide_squad,
    hideWallet: data.hide_wallet,
    hideTransfers: data.hide_transfers,
  };
}
