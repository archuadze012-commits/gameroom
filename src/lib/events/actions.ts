"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OpenBoxResult } from "@/types/events";

export async function openBox(boxId: string): Promise<OpenBoxResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("open_box", { p_box_id: boxId });

  if (error) return { success: false, error: "unknown" };

  const result = data as {
    success: boolean;
    error?: string;
    item?: OpenBoxResult extends { success: true } ? OpenBoxResult["item"] : never;
  };

  if (!result.success) {
    const e = result.error;
    if (e === "insufficient_funds" || e === "box_not_found" || e === "not_authenticated") {
      return { success: false, error: e };
    }
    return { success: false, error: "unknown" };
  }

  return { success: true, item: result.item as NonNullable<typeof result.item> };
}
