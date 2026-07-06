import { NextRequest, NextResponse } from "next/server";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: auth.status },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const path = formData.get("path") as string | null;

  if (!file || !path) return NextResponse.json({ error: "file and path required" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Max 10MB" }, { status: 400 });

  // Only allow raster image types (no SVG — inline-served SVG is an XSS vector).
  // Don't trust the client contentType for the actual store either.
  const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
  }
  // Constrain the client-supplied path: no traversal / absolute / control chars,
  // safe charset only, so it can't overwrite assets outside the intended tree.
  if (path.includes("..") || path.startsWith("/") || !/^[a-zA-Z0-9/_.-]{1,200}$/.test(path)) {
    return NextResponse.json({ error: "invalid path" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from("site_uploads")
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("site_uploads").getPublicUrl(path);
  await logAdminAction({ actorId: auth.userId, action: "content.game.asset_upload", targetType: "storage", targetId: path });
  return NextResponse.json({ url: publicUrl });
}
