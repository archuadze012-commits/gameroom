import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Row = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

type Body = {
  key?: string;
  value?: Record<string, unknown>;
};

function sanitizeKey(input: string) {
  const k = input.trim();
  if (!k) return null;
  if (k.length > 120) return null;
  // keep keys predictable: a-z0-9 . _ - :
  if (!/^[a-z0-9._:-]+$/i.test(k)) return null;
  return k;
}

export async function GET() {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value, updated_at")
      .order("key", { ascending: true });
    if (error) throw error;
    return NextResponse.json((data ?? []) as Row[]);
  } catch (e) {
    console.error("[/api/admin/content GET]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject<Body>(request, 64 * 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const key = sanitizeKey(String(body.key ?? ""));
  if (!key) return NextResponse.json({ error: "invalid_key" }, { status: 400 });

  const value = body.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return NextResponse.json({ error: "invalid_value" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("site_content")
    .upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      },
      { onConflict: "key" }
    )
    .select("key, value, updated_at")
    .single();

  if (error) {
    console.error("[/api/admin/content POST]", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  await logAdminAction({
    actorId: auth.userId,
    action: "site_content.upsert",
    targetType: "site_content",
    targetId: key,
  });

  return NextResponse.json(data, { status: 201 });
}

