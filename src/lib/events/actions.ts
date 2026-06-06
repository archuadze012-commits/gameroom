"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";
import type { OpenBoxBundleResult, OpenBoxResult, OpenedBoxItem } from "@/types/events";

const logger = createLogger("events-actions");

async function spinOpen(boxId: string): Promise<OpenBoxResult> {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("open_box_as", {
      p_user_id: user.id,
      p_box_id: boxId,
    });

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
  } catch (err) {
    logger.error("spinOpen failed", { boxId, error: err });
    return { success: false, error: "unknown" };
  }
}

export async function openBox(boxId: string): Promise<OpenBoxResult> {
  return spinOpen(boxId);
}

// Canonical bundle ratio — the single source of truth for "buy N, get M".
// Never accept these from the client: the cost is paid-opens based while items
// dispensed are total-opens based, so a client-controlled ratio lets a caller
// pay for 1 and receive up to 50 items.
const BUNDLE_PAID_OPENS = 10;
const BUNDLE_TOTAL_OPENS = 12;

export async function openBoxBundle(boxId: string): Promise<OpenBoxBundleResult> {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return { success: false, error: "not_authenticated" };

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("open_box_bundle_as", {
      p_user_id: user.id,
      p_box_id: boxId,
      p_paid_opens: BUNDLE_PAID_OPENS,
      p_total_opens: BUNDLE_TOTAL_OPENS,
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
  } catch (err) {
    logger.error("openBoxBundle failed", { boxId, error: err });
    return { success: false, error: "unknown" };
  }
}
