import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

// OAuth access/refresh tokens are persisted in linked_accounts.metadata (e.g. the
// TikTok callback stores access_token/refresh_token there). The UI never needs
// them, so strip any secret-bearing key before the metadata reaches the browser —
// otherwise an XSS / malicious extension / shared HAR could lift a live token and
// take over the linked third-party account.
function redactSecrets(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== "object") return metadata;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (/token|secret|password/i.test(key)) continue;
    out[key] = value;
  }
  return out;
}

export async function GET(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userIdParam = request.nextUrl.searchParams.get("userId")?.trim();
  if (userIdParam && userIdParam !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("linked_accounts")
    .select("provider, external_id, external_name, metadata, created_at, updated_at")
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const accounts = (data ?? []).map((row) => ({
    provider: row.provider,
    external_id: row.external_id,
    data: redactSecrets(row.metadata),
    verified: row.provider === "steam",
    linked_at: row.created_at,
    refreshed_at: row.updated_at,
  }));

  return NextResponse.json(accounts);
}

export async function DELETE(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const provider = request.nextUrl.searchParams.get("provider");
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("linked_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  return NextResponse.json({ ok: true });
}
