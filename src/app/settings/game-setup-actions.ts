"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { moderateText } from "@/lib/moderate";
import { createLogger } from "@/lib/logger";

const logger = createLogger("game-setup-actions");
type Result = { success: boolean; message?: string };

export type GameSetupInput = {
  gameSlug: string;
  device?: string;
  mouse?: string;
  keyboard?: string;
  headset?: string;
  monitor?: string;
  sensitivity?: string;
  notes?: string;
};

// Save (upsert) the caller's device/setup for one game. Self-write via RLS
// (profile_game_setups policy: user_id = auth.uid()).
export async function saveGameSetupAction(input: GameSetupInput): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const gameSlug = input.gameSlug.trim().slice(0, 64);
  if (!gameSlug) return { success: false, message: "აირჩიე თამაში" };

  const clean = (v: string | undefined) => (v ?? "").trim().slice(0, 120) || null;
  const notes = (input.notes ?? "").trim().slice(0, 300) || null;

  const modInput = [input.device, input.mouse, input.keyboard, input.headset, input.monitor, input.sensitivity, notes]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (modInput) {
    const mod = await moderateText(modInput).catch(() => ({ ok: true, reason: undefined as string | undefined }));
    if (!mod.ok) return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profile_game_setups").upsert(
    {
      user_id: user.id,
      game_slug: gameSlug,
      device: clean(input.device),
      mouse: clean(input.mouse),
      keyboard: clean(input.keyboard),
      headset: clean(input.headset),
      monitor: clean(input.monitor),
      sensitivity: clean(input.sensitivity),
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,game_slug" },
  );
  if (error) {
    logger.error("failed to save game setup", { gameSlug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidatePath("/settings");
  return { success: true, message: "შენახულია" };
}

export async function deleteGameSetupAction(gameSlug: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const supabase = await createSupabaseServerClient();
  await supabase.from("profile_game_setups").delete().eq("user_id", user.id).eq("game_slug", gameSlug);
  revalidatePath("/settings");
  return { success: true, message: "წაიშალა" };
}
