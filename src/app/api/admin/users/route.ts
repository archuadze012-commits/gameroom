import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission, logAdminAction } from "@/lib/admin";
import type { UserRole } from "@/lib/types";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission("manage_users");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const format = request.nextUrl.searchParams.get("format");

  try {
    const { data, error } = await anonClient()
      .from("profiles")
      .select("id, username, display_name, avatar_url, role, banned, ban_reason, ban_expires_at, is_verified, created_at, email")
      .order("created_at");
    if (error) throw error;

    const rows = (data ?? []).map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      role: p.role,
      banned: p.banned,
      banReason: p.ban_reason,
      banExpiresAt: p.ban_expires_at,
      isVerified: p.is_verified,
      createdAt: p.created_at,
      email: p.email,
    }));

    if (format === "csv") {
      const header = "id,username,display_name,email,role,banned,is_verified,created_at\n";
      const body = rows
        .map((r) =>
          [
            r.id,
            r.username,
            r.displayName ?? "",
            r.email ?? "",
            r.role,
            r.banned,
            r.isVerified,
            r.createdAt,
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      return new NextResponse(header + body, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="users-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(rows);
  } catch (e) {
    console.error("[/api/admin/users GET]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission("manage_users");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  let body: {
    userId?: string;
    role?: UserRole;
    banned?: boolean;
    banReason?: string;
    banMinutes?: number;
    isVerified?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body.userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.role !== undefined) update.role = body.role;
  if (body.banned !== undefined) {
    update.banned = body.banned;
    update.ban_expires_at = body.banned && body.banMinutes
      ? new Date(Date.now() + body.banMinutes * 60 * 1000).toISOString()
      : null;
  }
  if (body.banReason !== undefined) update.ban_reason = body.banReason ?? null;
  if (body.isVerified !== undefined) update.is_verified = body.isVerified;

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", body.userId);
    if (error) throw error;

    await logAdminAction({
      actorId: auth.userId,
      action: "update_user",
      targetType: "profile",
      targetId: body.userId,
      metadata: {
        role: body.role,
        banned: body.banned,
        banMinutes: body.banMinutes,
        isVerified: body.isVerified,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/admin/users PATCH]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
