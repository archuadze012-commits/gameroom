import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventBox } from "@/types/events";

const HIDDEN_BOX_NAMES = new Set([
  "noob crate",
  "pro crate",
  "borjgali pro crate",
]);

export async function getActiveBoxes(): Promise<EventBox[]> {
  const supabase = await createSupabaseServerClient();

  const { data: boxes } = await supabase
    .from("event_boxes")
    .select("id, name, description, image_url, cost_currency, cost_amount")
    .eq("is_active", true)
    .order("sort_order");

  if (!boxes?.length) return [];

  const visibleBoxes = boxes.filter((box) => !HIDDEN_BOX_NAMES.has(box.name.trim().toLowerCase()));
  if (!visibleBoxes.length) return [];

  const { data: items } = await supabase
    .from("box_items")
    .select("id, box_id, item_name, item_type, tier, image_url, weight")
    .in("box_id", visibleBoxes.map((b) => b.id));

  return visibleBoxes.map((box) => ({
    ...box,
    items: (items ?? []).filter((i) => i.box_id === box.id),
  })) as EventBox[];
}
