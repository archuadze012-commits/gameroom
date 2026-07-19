"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { moderateText } from "@/lib/moderate";
import { rateLimitShared } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-actions");

const createClanSchema = z.object({
  name: z.string().min(3, "სახელი მინიმუმ 3 ასო").max(100),
  tag: z.string().min(2, "ტეგი მინიმუმ 2 ასო").max(10),
  gameSlug: z.string().min(1, "აირჩიე თამაში").max(64),
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

  if (!(await rateLimitShared(`clan-create:${user.id}`, 5, 60_000)))
    return { success: false, message: "ძალიან ხშირად — სცადე ცოტა ხანში" };

  const rawData = {
    name: formData.get("name"),
    tag: formData.get("tag"),
    gameSlug: formData.get("gameSlug"),
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

  const { name, tag, gameSlug, description } = validated.data;

  // Clan name/tag/description render across the site — moderate them like every
  // other user-generated text channel (posts, LFG, chat, comments).
  const mod = await moderateText([name, tag, description ?? ""].filter(Boolean).join(" ")).catch(() => ({
    ok: true,
    reason: undefined as string | undefined,
  }));
  if (!mod.ok) {
    return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const supabase = await createSupabaseServerClient();

  // 0. Validate the chosen game exists (clans are game-scoped).
  const { data: gameRow } = await supabase
    .from("games")
    .select("slug")
    .eq("slug", gameSlug)
    .eq("active", true)
    .maybeSingle();
  if (!gameRow) {
    return { success: false, message: "არასწორი თამაში" };
  }

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
      game_slug: gameSlug,
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

  revalidatePath(`/games/${gameSlug}/clans`);
  return { success: true, message: "კლანი შეიქმნა!", clanSlug: clan.slug };
}

const updateClanSchema = z.object({
  slug: z.string().min(1),
  description: z.string().max(1000).optional(),
  status: z.enum(["open", "invite_only", "closed"]),
  recruiting: z.boolean().optional(),
  recruitNote: z.string().max(200).optional(),
  rules: z.string().max(4000).optional(),
  discordUrl: z.string().max(300).optional(),
  youtubeUrl: z.string().max(300).optional(),
  tiktokUrl: z.string().max(300).optional(),
  instagramUrl: z.string().max(300).optional(),
  twitchUrl: z.string().max(300).optional(),
  recruitingRoles: z.string().max(400).optional(),
});

function sanitizeUrl(v: string | undefined): string | null {
  const s = (v ?? "").trim().slice(0, 200);
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

// "IGL, Entry, Sniper" → distinct, capped tags for structured recruiting.
function parseRecruitingRoles(v: string | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (v ?? "").split(",")) {
    const t = part.trim().slice(0, 24);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

// Leader-only edit of a clan's description + join policy.
export async function updateClanAction(
  prevState: ClanActionState,
  formData: FormData
): Promise<ClanActionState> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const validated = updateClanSchema.safeParse({
    slug: formData.get("slug"),
    description: formData.get("description"),
    status: formData.get("status"),
    recruiting: formData.get("recruiting") === "on",
    recruitNote: formData.get("recruitNote"),
    rules: formData.get("rules"),
    discordUrl: formData.get("discordUrl"),
    youtubeUrl: formData.get("youtubeUrl"),
    tiktokUrl: formData.get("tiktokUrl"),
    instagramUrl: formData.get("instagramUrl"),
    twitchUrl: formData.get("twitchUrl"),
    recruitingRoles: formData.get("recruitingRoles"),
  });
  if (!validated.success) {
    return { success: false, errors: validated.error.flatten().fieldErrors, message: "არასწორი მონაცემები" };
  }
  const { slug, description, status, recruiting, recruitNote, rules, recruitingRoles } = validated.data;

  const roles = parseRecruitingRoles(recruitingRoles);
  // Moderate every free-text field the leader controls (all render publicly).
  const modInput = [description, rules, recruitNote, roles.join(" ")].filter(Boolean).join("\n").trim();
  if (modInput) {
    const mod = await moderateText(modInput).catch(() => ({ ok: true, reason: undefined as string | undefined }));
    if (!mod.ok) return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  if (!clan) return { success: false, message: "კლანი ვერ მოიძებნა" };

  const { data: membership } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clan.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "leader") {
    return { success: false, message: "მხოლოდ ლიდერს შეუძლია რედაქტირება" };
  }

  const { error } = await supabase
    .from("clans")
    .update({
      description: description ?? null,
      status,
      recruiting: recruiting ?? false,
      recruit_note: (recruitNote ?? "").trim().slice(0, 200) || null,
      rules: (rules ?? "").trim().slice(0, 4000) || null,
      recruiting_roles: roles,
      discord_url: sanitizeUrl(validated.data.discordUrl),
      youtube_url: sanitizeUrl(validated.data.youtubeUrl),
      tiktok_url: sanitizeUrl(validated.data.tiktokUrl),
      instagram_url: sanitizeUrl(validated.data.instagramUrl),
      twitch_url: sanitizeUrl(validated.data.twitchUrl),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clan.id);
  if (error) {
    logger.error("failed to update clan", { slug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }

  revalidatePath(`/clans/${slug}`);
  return { success: true, message: "კლანი განახლდა", clanSlug: slug };
}

export async function requestJoinClanAction(
  clanId: string,
  message?: string
): Promise<{ success: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  // Cap join requests per user so one account can't spam requests across clans.
  if (!(await rateLimitShared(`clan-join:${user.id}`, 20, 60_000)))
    return { success: false, message: "ძალიან ხშირად — სცადე ცოტა ხანში" };

  const supabase = await createSupabaseServerClient();

  // check if already in a clan
  const { data: existing } = await supabase
    .from("clan_members")
    .select("clan_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { success: false, message: "ჯერ გადი ამჟამინდელი კლანიდან" };

  // Fetch clan status + slug — an "open" clan grants instant membership, others
  // take a join request that leadership approves.
  const { data: clan } = await supabase
    .from("clans")
    .select("status, slug, game_slug")
    .eq("id", clanId)
    .maybeSingle();
  if (!clan) return { success: false, message: "კლანი ვერ მოიძებნა" };
  if (clan.status === "closed") return { success: false, message: "ამ კლანში მიღება დახურულია" };

  // ── Open clan → instant join ────────────────────────────────
  if (clan.status === "open") {
    const { error: joinErr } = await supabase.from("clan_members").insert({
      clan_id: clanId,
      user_id: user.id,
      role: "member",
    });
    if (joinErr) {
      if (joinErr.code === "23505") return { success: false, message: "უკვე კლანის წევრი ხარ" };
      logger.error("failed to join open clan", { userId: user.id, clanId, error: joinErr });
      return { success: false, message: "გაწევრიანება ვერ მოხერხდა" };
    }
    revalidatePath(`/clans/${clan.slug}`);
    if (clan.game_slug) revalidatePath(`/games/${clan.game_slug}/clans`);
    return { success: true, message: "მოგესალმებით კლანში! 🎉" };
  }

  // ── invite_only clan → join request ─────────────────────────
  // The join-request message is free text shown to clan leadership — moderate it.
  if (message && message.trim()) {
    const mod = await moderateText(message).catch(() => ({
      ok: true,
      reason: undefined as string | undefined,
    }));
    if (!mod.ok) return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };
  }

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

  revalidatePath(`/clans/${clan.slug}`);
  return { success: true, message: "მოთხოვნა გაიგზავნა!" };
}
