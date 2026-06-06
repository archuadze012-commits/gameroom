import { NextRequest, NextResponse } from "next/server";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLogger } from "@/lib/logger";

const MAX_BYTES = 10 * 1024 * 1024;
const logger = createLogger("api:admin-upload");
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    case "image/svg+xml": return "svg";
    default: return "bin";
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type", type: file.type }, { status: 415 });
  }

  const folder = (form.get("folder") as string | null)?.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "general";
  const ext = extFromMime(file.type);
  const rand = crypto.randomUUID().replace(/-/g, "");
  const path = `${folder}/${Date.now()}_${rand}.${ext}`;

  const supabase = createSupabaseAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("site_uploads")
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "31536000",
    });

  if (upErr) {
    logger.error("failed to upload admin asset", { path, mime: file.type, size: file.size, error: upErr });
    return NextResponse.json({ error: "upload_failed", detail: upErr.message }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from("site_uploads").getPublicUrl(path);

  await logAdminAction({
    actorId: auth.userId,
    action: "site_upload",
    targetType: "storage.site_uploads",
    targetId: path,
    metadata: { mime: file.type, size: file.size },
  });

  return NextResponse.json({ url: pub.publicUrl, path }, { status: 201 });
}
