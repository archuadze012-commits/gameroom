import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { logAdminAction, requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  SHOP_PRODUCT_COLUMNS,
  normalizeShopProductRows,
  shopProductSchema,
} from "@/lib/shop-products/admin";

export async function GET() {
  const auth = await requirePermission("manage_shop");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select(SHOP_PRODUCT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(normalizeShopProductRows(data));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_shop");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsedJson = await readJsonObject(request);
  if (!parsedJson.ok) return parsedJson.response;

  const parsed = shopProductSchema.safeParse(parsedJson.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_product", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("shop_products")
    .insert({ ...parsed.data, created_by: auth.userId })
    .select(SHOP_PRODUCT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "shop_product_create",
    targetType: "shop_product",
    targetId: data.id,
    metadata: { title: data.title },
  });

  return NextResponse.json(normalizeShopProductRows([data])[0], { status: 201 });
}
