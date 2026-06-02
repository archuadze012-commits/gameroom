import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { logAdminAction, requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  SHOP_PRODUCT_COLUMNS,
  normalizeShopProductRows,
  shopProductUpdateSchema,
} from "@/lib/shop-products/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("manage_shop");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const { id } = await params;
  const parsedJson = await readJsonObject(request);
  if (!parsedJson.ok) return parsedJson.response;

  const parsed = shopProductUpdateSchema.safeParse(parsedJson.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_product", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("shop_products")
    .update(parsed.data)
    .eq("id", id)
    .select(SHOP_PRODUCT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "shop_product_update",
    targetType: "shop_product",
    targetId: id,
    metadata: { title: data.title },
  });

  return NextResponse.json(normalizeShopProductRows([data])[0]);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission("manage_shop");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const { id } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("shop_products")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("shop_products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({
    actorId: auth.userId,
    action: "shop_product_delete",
    targetType: "shop_product",
    targetId: id,
    metadata: { title: existing?.title ?? null },
  });

  return NextResponse.json({ ok: true });
}
