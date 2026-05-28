import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  // Fetch tournament
  const { data: t, error: tErr } = await supabase
    .from("tournaments")
    .select("id, status, max_participants")
    .eq("slug", slug)
    .single();

  if (tErr || !t) {
    return NextResponse.json({ error: "tournament_not_found" }, { status: 404 });
  }

  if (t.status !== "open") {
    return NextResponse.json({ error: "registration_closed" }, { status: 400 });
  }

  // Count current participants
  const { count, error: countErr } = await supabase
    .from("tournament_participants")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", t.id);

  if (countErr) {
    console.error("[POST /api/tournaments/[slug]/register] count error", countErr);
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }

  const currentCount = count || 0;
  if (currentCount >= (t.max_participants || 8)) {
    return NextResponse.json({ error: "tournament_full" }, { status: 400 });
  }

  // Check if already registered
  const { data: existing } = await supabase
    .from("tournament_participants")
    .select("id")
    .eq("tournament_id", t.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already_registered" }, { status: 400 });
  }

  // Register user
  const { error: insertErr } = await supabase
    .from("tournament_participants")
    .insert({
      tournament_id: t.id,
      user_id: user.id,
      seed: currentCount + 1,
      checked_in: false,
    });

  if (insertErr) {
    console.error("[POST /api/tournaments/[slug]/register] insert error", insertErr);
    return NextResponse.json({ error: "registration_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
