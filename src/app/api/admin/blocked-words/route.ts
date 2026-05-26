import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { getIsAdmin } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await createSupabaseAdminClient()
    .from("blocked_words")
    .select("id, word, created_at")
    .order("word");
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = await readJsonObject<{ word?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const word = (body.word ?? "").trim().toLowerCase();
  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("blocked_words")
    .insert({ word })
    .select("id, word, created_at")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "duplicate" }, { status: 409 });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = await readJsonObject<{ id?: string }>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("blocked_words").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
