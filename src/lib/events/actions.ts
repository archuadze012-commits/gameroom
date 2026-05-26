"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OpenBoxBundleResult, OpenBoxResult, OpenedBoxItem } from "@/types/events";

type BoxPricing = {
  cost_amount: number;
  cost_currency: "nc" | "pro";
};

async function getBoxPricing(boxId: string): Promise<BoxPricing | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("event_boxes")
    .select("cost_amount, cost_currency")
    .eq("id", boxId)
    .maybeSingle();

  if (!data) return null;
  return {
    cost_amount: data.cost_amount,
    cost_currency: data.cost_currency,
  };
}

async function getWalletBalance(userId: string, currency: "nc" | "pro"): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("wallets")
    .select("nc_balance, pro_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return 0;
  return currency === "nc" ? (data.nc_balance ?? 0) : (data.pro_balance ?? 0);
}

async function creditWallet(userId: string, currency: "nc" | "pro", amount: number): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("wallets")
    .select("nc_balance, pro_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return false;

  const nextValue = (currency === "nc" ? (data.nc_balance ?? 0) : (data.pro_balance ?? 0)) + amount;
  const patch = currency === "nc"
    ? { nc_balance: nextValue }
    : { pro_balance: nextValue };

  const { error } = await supabase
    .from("wallets")
    .update(patch)
    .eq("user_id", userId);

  return !error;
}

async function spinOpen(boxId: string): Promise<OpenBoxResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("open_box", { p_box_id: boxId });

  if (error) return { success: false, error: "unknown" };

  const result = data as {
    success: boolean;
    error?: string;
    item?: OpenedBoxItem;
  };

  if (!result.success) {
    const e = result.error;
    if (e === "insufficient_funds" || e === "box_not_found" || e === "not_authenticated") {
      return { success: false, error: e };
    }
    return { success: false, error: "unknown" };
  }

  return { success: true, item: result.item as OpenedBoxItem };
}

export async function openBox(boxId: string): Promise<OpenBoxResult> {
  return spinOpen(boxId);
}

export async function openBoxBundle(
  boxId: string,
  paidOpens = 10,
  totalOpens = 12,
): Promise<OpenBoxBundleResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "not_authenticated" };

  const pricing = await getBoxPricing(boxId);
  if (!pricing) return { success: false, error: "box_not_found" };

  const balance = await getWalletBalance(user.id, pricing.cost_currency);
  const requiredBalance = pricing.cost_amount * paidOpens;
  if (balance < requiredBalance) {
    return { success: false, error: "insufficient_funds" };
  }

  const items: OpenedBoxItem[] = [];

  for (let index = 0; index < paidOpens; index += 1) {
    const result = await spinOpen(boxId);
    if (!result.success) return result;
    items.push(result.item);
  }

  const bonusCount = Math.max(totalOpens - paidOpens, 0);
  let bonusAwarded = 0;

  if (bonusCount > 0) {
    const credited = await creditWallet(user.id, pricing.cost_currency, pricing.cost_amount * bonusCount);
    if (credited) {
      for (let index = 0; index < bonusCount; index += 1) {
        const result = await spinOpen(boxId);
        if (!result.success) break;
        items.push(result.item);
        bonusAwarded += 1;
      }
    }
  }

  return {
    success: true,
    items,
    paidOpens,
    totalOpens: items.length,
    bonusAwarded,
  };
}
