"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-actions");

const createClanSchema = z.object({
  name: z.string().min(3, "სახელი მინიმუმ 3 ასო").max(100),
  tag: z.string().min(2, "ტეგი მინიმუმ 2 ასო").max(10),
  description: z.string().max(1000).optional(),
});

export type ClanActionState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  clanSlug?: string;
};

export async function createClanAction(
  prevState: ClanActionState,
  formData: FormData
): Promise<ClanActionState> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const rawData = {
    name: formData.get("name"),
    tag: formData.get("tag"),
    description: formData.get("description"),
  };

  const validated = createClanSchema.safeParse(rawData);

  if (!validated.success) {
    return {
      success: false,
      errors: validated.error.flatten().fieldErrors,
      message: "არასწორი მონაცემები",
    };
  }

  const { name, tag, description } = validated.data;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const supabase = await createSupabaseServerClient();

  // 1. Check if user already in a clan
  const { data: existing } = await supabase
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { success: false, message: "ჯერ გადი ამჟამინდელი კლანიდან" };
  }

  // 2. Create clan
  const { data: clan, error: createErr } = await supabase
    .from("clans")
    .insert({
      name,
      slug,
      tag: tag.toUpperCase(),
      description,
      created_by: user.id,
    })
    .select("id, slug")
    .single();

  if (createErr || !clan) {
    if (createErr?.code === "23505") {
      return { success: false, message: "სახელი ან ტეგი უკვე დაკავებულია" };
    }
    logger.error("failed to create clan", { userId: user.id, slug, error: createErr });
    return { success: false, message: "კლანის შექმნა ვერ მოხერხდა" };
  }

  // 3. Add user as leader
  const { error: memberErr } = await supabase.from("clan_members").insert({
    clan_id: clan.id,
    user_id: user.id,
    role: "leader",
  });

  if (memberErr) {
    logger.error("failed to insert clan leader membership", { userId: user.id, clanId: clan.id, error: memberErr });
    // Rollback clan creation since member insert failed
    await supabase.from("clans").delete().eq("id", clan.id);
    return { success: false, message: "კლანის შექმნა ვერ მოხერხდა (უფლებების შეცდომა)" };
  }

  revalidatePath("/clans");
  return { success: true, message: "კლანი შეიქმნა!", clanSlug: clan.slug };
}

export async function requestJoinClanAction(
  clanId: string,
  message?: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  // check if already in a clan
  const { data: existing } = await supabase
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { success: false, message: "ჯერ გადი ამჟამინდელი კლანიდან" };

  const { error } = await supabase
    .from("clan_requests")
    .insert({
      clan_id: clanId,
      user_id: user.id,
      message,
    });

  if (error) {
    if (error.code === "23505") return { success: false, message: "მოთხოვნა უკვე გაგზავნილია" };
    logger.error("failed to create clan join request", { userId: user.id, clanId, error });
    return { success: false, message: "მოთხოვნის გაგზავნა ვერ მოხერხდა" };
  }

  revalidatePath(`/clans`);
  return { success: true, message: "მოთხოვნა გაიგზავნა!" };
}
