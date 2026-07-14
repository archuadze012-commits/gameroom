"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { resolveClanRole, awardClanXp } from "@/lib/clan/server-utils";
import { rateLimitShared } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger("clan-treasury-actions");
type Result = { success: boolean; message?: string };

function revalidate(slug: string) {
  revalidatePath(`/clans/${slug}/treasury`);
  revalidatePath(`/clans/${slug}`);
  revalidatePath(`/c/${slug}`);
}

// Donate personal NC → clan treasury (any member). The atomic wallet debit +
// treasury credit happens in the clan_donate_nc SECURITY DEFINER RPC.
export async function donateClanNcAction(clanSlug: string, amount: number): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  if (!(await rateLimitShared(`clan-donate:${user.id}`, 20, 60_000)))
    return { success: false, message: "ძალიან ხშირად — სცადე ცოტა ხანში" };

  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !info.role) return { success: false, message: "მხოლოდ წევრებს შეუძლიათ" };

  const amt = Math.floor(amount);
  if (!Number.isFinite(amt) || amt <= 0) return { success: false, message: "არასწორი თანხა" };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("clan_donate_nc", { p_user: user.id, p_clan: info.clanId, p_amount: amt });
  if (error) {
    logger.error("clan_donate_nc failed", { clanSlug, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  const res = (data ?? {}) as { success?: boolean; error?: string };
  if (!res.success) {
    const map: Record<string, string> = {
      insufficient_funds: "არ გყოფნის NC",
      not_member: "არ ხარ ამ კლანის წევრი",
      bad_amount: "არასწორი თანხა",
    };
    return { success: false, message: map[res.error ?? ""] ?? "ვერ მოხერხდა" };
  }
  await awardClanXp(info.clanId, user.id, Math.min(200, Math.floor(amt / 100)));
  revalidate(clanSlug);
  return { success: true, message: `შემოწირე ${amt.toLocaleString()} NC 💰` };
}

// Buy a cosmetic from the treasury (leader/officer). Cost is authoritative in the
// clan_buy_cosmetic RPC (from the catalog).
export async function buyClanCosmeticAction(clanSlug: string, key: string): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !["leader", "officer"].includes(info.role ?? "")) return { success: false, message: "მხოლოდ ლიდერს/ოფიცერს" };

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("clan_buy_cosmetic", { p_user: user.id, p_clan: info.clanId, p_key: key });
  if (error) {
    logger.error("clan_buy_cosmetic failed", { clanSlug, key, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  const res = (data ?? {}) as { success?: boolean; error?: string };
  if (!res.success) {
    const map: Record<string, string> = {
      insufficient_treasury: "ხაზინა არ ჰყოფნის",
      already_owned: "უკვე შეძენილია",
      forbidden: "უფლება არ გაქვს",
      not_found: "ვერ მოიძებნა",
    };
    return { success: false, message: map[res.error ?? ""] ?? "ვერ მოხერხდა" };
  }
  revalidate(clanSlug);
  return { success: true, message: "შეძენილია! 🎨" };
}

// Equip / unequip an owned cosmetic (leader/officer). Verifies ownership + type,
// then writes the equipped value onto the clan row (admin client, no RPC needed).
export async function equipClanCosmeticAction(
  clanSlug: string,
  type: "accent" | "emblem",
  key: string | null,
): Promise<Result> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };
  const info = await resolveClanRole(clanSlug, user.id);
  if (!info || !["leader", "officer"].includes(info.role ?? "")) return { success: false, message: "მხოლოდ ლიდერს/ოფიცერს" };

  const admin = createSupabaseAdminClient();
  let value: string | null = null;
  if (key) {
    const { data: owned } = await admin
      .from("clan_cosmetics")
      .select("cosmetic_key")
      .eq("clan_id", info.clanId)
      .eq("cosmetic_key", key)
      .maybeSingle();
    if (!owned) return { success: false, message: "ეს კოსმეტიკა არ გაქვს" };
    const { data: cat } = await admin.from("clan_cosmetic_catalog").select("type, value").eq("key", key).maybeSingle();
    if (!cat || cat.type !== type) return { success: false, message: "არასწორი კოსმეტიკა" };
    value = cat.value;
  }
  const patch: { accent_color?: string | null; emblem?: string | null } =
    type === "accent" ? { accent_color: value } : { emblem: value };
  const { error } = await admin.from("clans").update(patch).eq("id", info.clanId);
  if (error) {
    logger.error("equip cosmetic failed", { clanSlug, type, key, error });
    return { success: false, message: "ვერ მოხერხდა" };
  }
  revalidate(clanSlug);
  return { success: true, message: key ? "აღიჭურვა ✨" : "მოხსნილია" };
}
