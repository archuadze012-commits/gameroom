"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { lobbyGameSlugSchema, type LoadoutData } from "@/lib/lobby/loadout";
import { normalizeUserLobbyLoadout } from "@/lib/lobby/loadout-access";
import { createLogger } from "@/lib/logger";

const logger = createLogger("lobby-loadout-actions");

export async function saveLobbyLoadout(gameSlug: string, loadout: LoadoutData) {
  const user = await getSession();
  if (!user) return { success: false, error: "not_authenticated" } as const;

  const parsedGameSlug = lobbyGameSlugSchema.safeParse(gameSlug);
  if (!parsedGameSlug.success) {
    return { success: false, error: "invalid_game_slug" } as const;
  }

  const normalizedLoadout = await normalizeUserLobbyLoadout(user.id, parsedGameSlug.data, loadout);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_lobby_loadouts")
    .upsert(
      {
        user_id: user.id,
        game_slug: parsedGameSlug.data,
        loadout: normalizedLoadout,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,game_slug" },
    );

  if (error) {
    logger.error("failed to save lobby loadout", { userId: user.id, gameSlug: parsedGameSlug.data, error });
    return { success: false, error: error.message } as const;
  }
  return { success: true } as const;
}
