"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { moderateText } from "@/lib/moderate";
import { rateLimitShared } from "@/lib/rate-limit";
import { resolveClanRole } from "@/lib/clan/server-utils";
import { isClanManager } from "@/lib/clan/roles";
import { detectPlatform } from "@/lib/clan/highlights";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-highlight-actions");
type Result = { success: boolean; message?: string };

// Any clan member can share a highlight clip (external embed link).
export async function addClanHighlightAction(clanSlug: string, url: string, title: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  if (!(await rateLimitShared(`clan-hl:${user.id}`, 15, 60_000)))
    return { success: false, message: "ძალიან ხშირად — სცადე ცოტა ხანში" };

  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !info.role) return { success: false, message: "მხოლოდ წევრებს შეუძლიათ" };

  const link = url.trim().slice(0, 500);
  if (!/^https?:\/\/.+\..+/i.test(link)) return { success: false, message: "ჩასვი სწორი ბმული (https://...)" };

  const t = (title ?? "").trim().slice(0, 120);
  if (t) {
    const mod = await moderateText(t).catch(() => ({ ok: true, reason: undefined as string | undefined }));
    if (!mod.ok) return { success: false, message: mod.reason || "შინაარსი დაბლოკილია" };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("clan_highlights").insert({
    clan_id: info.clanId,
    user_id: user.id,
    url: link,
    title: t || null,
    platform: detectPlatform(link),
  });
  if (error) {
    logger.error("failed to add highlight", { clanSlug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidatePath(`/clans/${clanSlug}`);
  return { success: true, message: "ჰაილაითი დაემატა 🎬" };
}

// The author or any manager may remove a highlight.
export async function deleteClanHighlightAction(clanSlug: string, highlightId: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !info.role) return { success: false, message: "უფლება არ გაქვს" };

  const admin = createSupabaseAdminClient();
  const { data: hl } = await admin.from("clan_highlights").select("user_id").eq("id", highlightId).eq("clan_id", info.clanId).maybeSingle();
  if (!hl) return { success: false, message: "ვერ მოიძებნა" };
  if (hl.user_id !== user.id && !isClanManager(info.role)) {
    return { success: false, message: "მხოლოდ ავტორს ან ლიდერს შეუძლია" };
  }
  await admin.from("clan_highlights").delete().eq("id", highlightId).eq("clan_id", info.clanId);
  revalidatePath(`/clans/${clanSlug}`);
  return { success: true };
}
