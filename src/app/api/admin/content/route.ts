import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE_CONTENT_CACHE_TAG } from "@/lib/site-content";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:admin-content");

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
    logger.error("failed to fetch site content", { error: e });
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
        value: value as never,
        updated_at: new Date().toISOString(),
        updated_by: auth.userId,
      },
      { onConflict: "key" }
    )
    .select("key, value, updated_at")
    .single();

  if (error) {
    logger.error("failed to upsert site content", { key, error });
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  // Invalidate the persistent unstable_cache entries so the edit is visible
  // on the next request instead of waiting out the 5-minute revalidate window.
  // { expire: 0 } forces immediate expiry (this is a Route Handler, not a
  // Server Action, so the recommended `profile: 'max'` stale-while-revalidate
  // path would still serve one more stale read before refreshing).
  revalidateTag(SITE_CONTENT_CACHE_TAG, { expire: 0 });

  await logAdminAction({
    actorId: auth.userId,
    action: "site_content.upsert",
    targetType: "site_content",
    targetId: key,
  });

  return NextResponse.json(data, { status: 201 });
}

