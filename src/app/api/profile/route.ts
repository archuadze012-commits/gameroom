import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.username === "string" && body.username.trim())
    update.username = body.username.trim().slice(0, 32);
  if (typeof body.displayName === "string")
    update.display_name = body.displayName.trim().slice(0, 64) || null;
  if (typeof body.bio === "string")
    update.bio = body.bio.trim() || null;
  if (typeof body.region === "string")
    update.region = body.region.trim() || null;
  if (typeof body.voiceChat === "boolean")
    update.voice_chat = body.voiceChat;

  try {
    const { error } = await anonClient()
      .from("profiles")
      .update(update)
      .eq("id", user.id);
    if (error) {
      if (error.code === "23505")
        return NextResponse.json({ error: "username_taken" }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/profile]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
