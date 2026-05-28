import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED = ["gg", "w", "clutch", "noob", "goat", "cringe", "heart", "pro"];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("post_reactions")
    .select("emoji, user_id")
    .eq("post_id", id);

  const counts: Record<string, number> = {};
  const mine: string[] = [];
  for (const r of rows ?? []) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    if (user && r.user_id === user.id) mine.push(r.emoji);
  }
  return NextResponse.json({ counts, mine });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { emoji?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const emoji = body.emoji ?? "";
  if (!ALLOWED.includes(emoji))
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });

  // toggle: insert or delete
  const { data: existing } = await supabase
    .from("post_reactions")
    .select("emoji")
    .eq("post_id", id)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase.from("post_reactions").delete()
      .eq("post_id", id).eq("user_id", user.id).eq("emoji", emoji);
    return NextResponse.json({ action: "removed" });
  } else {
    await supabase.from("post_reactions").insert({ post_id: id, user_id: user.id, emoji });
    return NextResponse.json({ action: "added" });
  }
}
