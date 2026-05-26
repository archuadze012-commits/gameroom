import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoadoutData = {
  character?: string;
  lobby?: string;
  effect?: string;
  nameCard?: string;
};

export async function getLobbyLoadout(
  userId: string,
  gameSlug: string,
): Promise<LoadoutData | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_lobby_loadouts")
    .select("loadout")
    .eq("user_id", userId)
    .eq("game_slug", gameSlug)
    .maybeSingle();

  if (!data?.loadout) return null;
  return data.loadout as LoadoutData;
}
