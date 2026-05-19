import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getIsAdmin } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  try {
    const { data, error } = await anonClient()
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, banned, ban_reason, created_at, email")
      .order("created_at");
    if (error) throw error;

    return NextResponse.json(
      (data ?? []).map((p) => ({
        id: p.id,
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        role: p.role,
        banned: p.banned,
        banReason: p.ban_reason,
        createdAt: p.created_at,
        email: p.email,
      })),
    );
  } catch (e) {
    console.error("[/api/admin/users GET]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { userId?: string; role?: UserRole; banned?: boolean; banReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body.userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.role !== undefined) update.role = body.role;
  if (body.banned !== undefined) update.banned = body.banned;
  if (body.banReason !== undefined) update.ban_reason = body.banReason ?? null;

  try {
    const { error } = await anonClient()
      .from("profiles")
      .update(update)
      .eq("id", body.userId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/admin/users PATCH]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
