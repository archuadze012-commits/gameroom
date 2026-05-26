"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export type LoadoutData = {
  character?: string;
  lobby?: string;
  effect?: string;
  nameCard?: string;
};

export async function saveLobbyLoadout(gameSlug: string, loadout: LoadoutData) {
  const user = await getSession();
  if (!user) return { success: false, error: "not_authenticated" } as const;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("user_lobby_loadouts")
    .upsert(
      { user_id: user.id, game_slug: gameSlug, loadout, updated_at: new Date().toISOString() },
      { onConflict: "user_id,game_slug" },
    );

  if (error) return { success: false, error: error.message } as const;
  return { success: true } as const;
}
