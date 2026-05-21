import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userIdParam = request.nextUrl.searchParams.get("userId");
  const supabase = await createSupabaseServerClient();

  let targetUserId = userIdParam;
  if (!targetUserId) {
    const user = await getSession().catch(() => null);
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    targetUserId = user.id;
  }

  const { data, error } = await supabase
    .from("linked_accounts")
    .select("provider, external_id, data, verified, linked_at, refreshed_at")
    .eq("user_id", targetUserId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
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
