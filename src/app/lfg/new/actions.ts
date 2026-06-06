"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { moderateText } from "@/lib/moderate";
import { awardBonusXp } from "@/lib/gamification";
import { createLogger } from "@/lib/logger";
import {
  LFG_DESCRIPTION_MAX_LENGTH,
  LFG_SLOTS_DEFAULT,
  LFG_SLOTS_MAX,
  LFG_TITLE_MAX_LENGTH,
  PROFILE_MEDIUM_TEXT_MAX_LENGTH,
  PROFILE_SHORT_TEXT_MAX_LENGTH,
} from "@/lib/constants";

const logger = createLogger("lfg-new-actions");

const createLfgSchema = z.object({
  gameSlug: z.string().min(1, "თამაში აუცილებელია"),
  title: z.string().max(LFG_TITLE_MAX_LENGTH, "სათაური ზედმეტად გრძელია").optional(),
  description: z.string().max(LFG_DESCRIPTION_MAX_LENGTH, "აღწერა ზედმეტად გრძელია").optional(),
  rank: z.string().max(PROFILE_MEDIUM_TEXT_MAX_LENGTH).optional(),
  region: z.string().max(PROFILE_SHORT_TEXT_MAX_LENGTH).optional(),
  slotsTotal: z.number().min(1).max(LFG_SLOTS_MAX).default(LFG_SLOTS_DEFAULT),
  voiceRequired: z.boolean().default(false),
  modes: z.array(z.string()).optional(),
  ranked: z.string().optional(),
  weapons: z.array(z.string()).optional(),
});

export type LfgActionState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export async function createLfgAction(
  prevState: LfgActionState,
  formData: FormData
): Promise<LfgActionState> {
  const user = await getSession();
  if (!user) {
    return { success: false, message: "ავტორიზაცია აუცილებელია" };
  }

  const optionalString = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };

  const rawData = {
    gameSlug: formData.get("gameSlug"),
    title: optionalString("title"),
    description: optionalString("description"),
    rank: optionalString("rank"),
    region: optionalString("region"),
    slotsTotal: Number(formData.get("slotsTotal") || LFG_SLOTS_DEFAULT),
    voiceRequired: formData.get("voiceRequired") === "on",
    modes: formData.getAll("modes") as string[],
    ranked: optionalString("ranked"),
    weapons: formData.getAll("weapons") as string[],
  };

  const validated = createLfgSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
      message: "გთხოვთ შეავსოთ ყველა სავალდებულო ველი სწორად",
    };
  }

  const { data: body } = validated;

  let title = (body.title ?? "").trim();
  if (!title) {
    const parts: string[] = [];
    if (body.modes?.length) parts.push(body.modes.join(", "));
    if (body.ranked) parts.push(body.ranked);
    if (body.weapons?.length) parts.push(body.weapons.join(", "));
    title = parts.length ? parts.join(" · ") : body.gameSlug;
  }

  // AI moderation
  const textToCheck = [title, body.description ?? ""].filter(Boolean).join(" ");
  const mod = await moderateText(textToCheck).catch(() => ({
    ok: true,
    reason: undefined as string | undefined,
  }));
  if (!mod.ok) {
    return {
      success: false,
      message: mod.reason ?? "კონტენტი დაიბლოკა — შეუსაბამო ტექსტი",
    };
  }

  const modeSlug =
    body.modes?.includes("1 vs 1")
      ? "1v1"
      : body.modes?.includes("Classic")
      ? "classic"
      : body.modes?.[0]?.toLowerCase().replace(/\s+/g, "-") ?? null;

  const supabase = createSupabaseAdminClient();

  // Server action already validates the signed-in user; admin client keeps writes
  // behind this guarded path instead of depending on browser-side table grants.
  const gameSlug = body.gameSlug.slice(0, 64);
  const { data: gameRow } = await supabase
    .from("games")
    .select("id")
    .eq("slug", gameSlug)
    .eq("active", true)
    .maybeSingle();
  if (!gameRow) {
    return { success: false, message: "თამაში ვერ მოიძებნა" };
  }

  const row = {
    author_id: user.id,
    game_id: gameRow.id,
    game_slug: gameSlug,
    title: title.slice(0, LFG_TITLE_MAX_LENGTH),
    description: (body.description ?? "").trim().slice(0, LFG_DESCRIPTION_MAX_LENGTH),
    rank: body.rank?.trim().slice(0, PROFILE_MEDIUM_TEXT_MAX_LENGTH) || null,
    region: body.region?.trim().slice(0, PROFILE_SHORT_TEXT_MAX_LENGTH) || null,
    slots_total: body.slotsTotal,
    voice_required: body.voiceRequired,
    mode: modeSlug,
  };

  const { error } = await supabase.from("lfg_posts").insert(row);

  if (error) {
    logger.error("failed to create LFG post", { userId: user.id, gameSlug, error });
    return { success: false, message: "ლოკალის გამოქვეყნება ვერ მოხერხდა" };
  }

  await awardBonusXp(user.id, 5, "lfg:create-post");

  revalidatePath("/lfg");
  revalidatePath("/");

  return { success: true, message: "ლოკალი გამოქვეყნდა!" };
}
