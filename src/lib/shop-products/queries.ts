import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeShopProduct, type ShopProduct } from "./types";

const SHOP_PRODUCT_COLUMNS =
  "id,title,description,price,image_url,category,is_active,status,stock,created_by,created_at,updated_at";

function getQueryErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "unknown_error";
  const candidate = error as { code?: string; message?: string; details?: string; hint?: string };
  return [candidate.code, candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(" | ") || "unknown_error";
}

export async function getActiveShopProducts(): Promise<ShopProduct[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select(SHOP_PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn(`[shop_products active] ${getQueryErrorMessage(error)}`);
    return [];
  }

  return (data ?? []).map(normalizeShopProduct);
}

export async function getActiveShopProductById(id: string): Promise<ShopProduct | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select(SHOP_PRODUCT_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.warn(`[shop_products detail] ${getQueryErrorMessage(error)}`);
    return null;
  }

  return data ? normalizeShopProduct(data) : null;
}
