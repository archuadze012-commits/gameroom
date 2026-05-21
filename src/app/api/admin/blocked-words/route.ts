import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getIsAdmin } from "@/lib/auth";

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

  const { data, error } = await anonClient()
    .from("blocked_words")
    .select("id, word, created_at")
    .order("word");
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: { word?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const word = (body.word ?? "").trim().toLowerCase();
  if (!word) return NextResponse.json({ error: "word required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
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

  let body: { id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("blocked_words").delete().eq("id", body.id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
