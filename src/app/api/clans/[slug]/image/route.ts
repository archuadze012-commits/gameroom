import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimitShared } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:clan-image");
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

// Clan avatar/banner upload. Storage RLS scopes user-writable folders to their
// own uid, so clan-folder writes go through the admin client here, gated on the
// caller being the clan leader.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await rateLimitShared(`clan-image:${user.id}`, 10, 60_000)))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { slug } = await params;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const kind = form.get("kind");
  if (kind !== "avatar" && kind !== "banner") {
    return NextResponse.json({ error: "bad_kind" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "empty_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: "unsupported_type" }, { status: 415 });

  const supabase = await createSupabaseServerClient();
  const { data: clan } = await supabase.from("clans").select("id").eq("slug", slug).maybeSingle();
  if (!clan) return NextResponse.json({ error: "clan_not_found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("clan_members")
    .select("role")
    .eq("clan_id", clan.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || membership.role !== "leader") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const bucket = kind === "avatar" ? "avatars" : "banners";
  const path = `clans/${clan.id}/${kind}.jpg`;

  const admin = createSupabaseAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: true, cacheControl: "3600" });
  if (upErr) {
    logger.error("failed to upload clan image", { slug, kind, error: upErr });
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  const patch = kind === "avatar" ? { avatar_url: pub.publicUrl } : { banner_url: pub.publicUrl };
  const { error: updErr } = await admin.from("clans").update(patch).eq("id", clan.id);
  if (updErr) {
    logger.error("failed to update clan image url", { slug, kind, error: updErr });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ url: `${pub.publicUrl}?t=${Date.now()}` }, { status: 201 });
}
