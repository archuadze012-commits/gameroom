import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: hidden }] = await Promise.all([
    supabase.from("cracked_games").select("*").order("created_at", { ascending: false }),
    supabase.from("hidden_cracked_games").select("id"),
  ]);
  if (error) {
    console.error("[/api/cracked-games]", error);
    return NextResponse.json([], { status: 200 });
  }
  const hiddenIds = new Set((hidden ?? []).map((r) => r.id));
  const filtered = (data ?? []).filter((g) => !hiddenIds.has(g.id));
  return NextResponse.json({ games: filtered, hiddenIds: [...hiddenIds] });
}
