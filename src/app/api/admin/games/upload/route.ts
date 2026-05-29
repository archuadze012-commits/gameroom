import { NextRequest, NextResponse } from "next/server";
import { getIsAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const isAdmin = await getIsAdmin().catch(() => false);
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const path = formData.get("path") as string | null;

  if (!file || !path) return NextResponse.json({ error: "file and path required" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Max 10MB" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from("site_uploads")
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage.from("site_uploads").getPublicUrl(path);
  return NextResponse.json({ url: publicUrl });
}
