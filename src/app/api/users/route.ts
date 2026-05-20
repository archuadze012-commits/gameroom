import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { PublicProfile } from "@/lib/types";

function client() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(request: NextRequest) {
  const rawQ = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // Strip PostgREST structural/wildcard chars so a crafted `q` can't break out
  // of the .or() filter string (filter injection). Keep it to a safe length.
  const q = rawQ.replace(/[,()*:%\\]/g, " ").trim().slice(0, 64);
  try {
    let query = client()
      .from("profiles")
      .select("username, display_name, avatar_url, role, region, voice_chat, bio")
      .eq("banned", false)
      .order("created_at");

    if (q) {
      query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const profiles: PublicProfile[] = (data ?? []).map((r) => ({
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_url,
      role: r.role,
      region: r.region,
      voiceChat: r.voice_chat,
      bio: r.bio,
    }));

    return NextResponse.json(profiles);
  } catch (e) {
    console.error("[/api/users]", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
