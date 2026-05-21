import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { moderateText } from "@/lib/moderate";

export async function POST(request: NextRequest) {
  const user = await getSession().catch(() => null);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    gameSlug?: string;
    title?: string;
    description?: string;
    rank?: string;
    region?: string;
    slotsTotal?: number;
    voiceRequired?: boolean;
    modes?: string[];
    ranked?: string;
    weapons?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const gameSlug = (body.gameSlug ?? "").trim();
  if (!gameSlug) return NextResponse.json({ error: "game_required" }, { status: 400 });

  let title = (body.title ?? "").trim();
  if (!title) {
    // Auto-generate title from game-specific fields
    const parts: string[] = [];
    if (body.modes?.length) parts.push(body.modes.join(", "));
    if (body.ranked) parts.push(body.ranked);
    if (body.weapons?.length) parts.push(body.weapons.join(", "));
    title = parts.length ? parts.join(" · ") : gameSlug;
  }
  if (title.length > 200) return NextResponse.json({ error: "title_required" }, { status: 400 });

  // AI moderation (inline — no loopback HTTP call)
  const textToCheck = [title, body.description ?? ""].filter(Boolean).join(" ");
  const mod = await moderateText(textToCheck).catch(() => ({ ok: true, reason: undefined as string | undefined }));
  if (!mod.ok) {
    return NextResponse.json({ error: "content_blocked", reason: mod.reason ?? "შეუსაბამო კონტენტი" }, { status: 422 });
  }

  const row = {
    author_id: user.id,
    game_slug: gameSlug.slice(0, 64),
    title: title.slice(0, 200),
    description: (body.description ?? "").trim().slice(0, 2000),
    rank: body.rank?.trim().slice(0, 64) || null,
    region: body.region?.trim().slice(0, 32) || null,
    slots_total: Math.min(10, Math.max(1, Number(body.slotsTotal) || 4)),
    voice_required: !!body.voiceRequired,
  };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lfg_posts")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("[/api/lfg POST]", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  // award XP for posting LFG
  try {
    await supabase.rpc("award_xp", { p_user_id: user.id, p_amount: 5 });
  } catch {}

  return NextResponse.json(data, { status: 201 });
}
