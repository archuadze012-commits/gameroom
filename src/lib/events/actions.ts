"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OpenBoxBundleResult, OpenBoxResult, OpenedBoxItem } from "@/types/events";

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
  const { data, error } = await supabase.rpc("open_box_bundle", {
    p_box_id: boxId,
    p_paid_opens: paidOpens,
    p_total_opens: totalOpens,
  });

  if (error) return { success: false, error: "unknown" };

  const result = data as
    | {
        success: true;
        items: OpenedBoxItem[];
        paidOpens: number;
        totalOpens: number;
        bonusAwarded: number;
      }
    | {
        success: false;
        error?: string;
      };

  if (!result.success) {
    const rpcError = result.error;
    if (rpcError === "insufficient_funds" || rpcError === "box_not_found" || rpcError === "not_authenticated") {
      return { success: false, error: rpcError };
    }

    return { success: false, error: "unknown" };
  }

  return result;
}
