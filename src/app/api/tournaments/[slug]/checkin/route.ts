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
    .select("id, name, status")
    .eq("slug", slug)
    .single();

  if (tErr || !t) {
    return NextResponse.json({ error: "tournament_not_found" }, { status: 404 });
  }

  if (t.status !== "checkin") {
    return NextResponse.json({ error: "checkin_not_active" }, { status: 400 });
  }

  // Update participant status
  const { data: participant, error: pErr } = await supabase
    .from("tournament_participants")
    .update({ checked_in: true })
    .eq("tournament_id", t.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (pErr) {
    console.error("[POST /api/tournaments/[slug]/checkin] update error", pErr);
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }

  if (!participant) {
    return NextResponse.json({ error: "not_registered" }, { status: 400 });
  }

  // Create notification
  await supabase.from("notifications").insert({
    user_id: user.id,
    type: "tournament_checkin",
    title: "Check-in დადასტურებულია! 🏆",
    body: `თქვენ წარმატებით გაიარეთ check-in ტურნირზე: "${t.name}"`,
    link: `/tournaments/${slug}`,
  });

  return NextResponse.json({ ok: true });
}
