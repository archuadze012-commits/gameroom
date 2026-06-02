import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { lobbyGameSlugSchema, type LoadoutData } from "@/lib/lobby/loadout";
import { normalizeUserLobbyLoadout } from "@/lib/lobby/loadout-access";

export async function getLobbyLoadout(
  userId: string,
  gameSlug: string,
): Promise<LoadoutData | null> {
  const parsedGameSlug = lobbyGameSlugSchema.safeParse(gameSlug);
  if (!parsedGameSlug.success) return null;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("user_lobby_loadouts")
    .select("loadout")
    .eq("user_id", userId)
    .eq("game_slug", parsedGameSlug.data)
    .maybeSingle();

  if (!data?.loadout) return null;
  return normalizeUserLobbyLoadout(userId, parsedGameSlug.data, data.loadout);
}
