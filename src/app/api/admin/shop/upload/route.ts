import { NextRequest, NextResponse } from "next/server";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_shop");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "file_required" }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "unsupported_file_type" }, { status: 415 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "max_8mb" }, { status: 400 });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `shop-products/${auth.userId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from("site_uploads")
    .upload(path, buffer, { upsert: false, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const {
    data: { publicUrl },
  } = supabase.storage.from("site_uploads").getPublicUrl(path);

  await logAdminAction({ actorId: auth.userId, action: "shop.asset_upload", targetType: "storage", targetId: path });
  return NextResponse.json({ url: publicUrl });
}
