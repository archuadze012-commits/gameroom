import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission, logAdminAction } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SysReqRow = { os: string; cpu: string; ram: string; gpu: string; storage: string };

type Body = {
  id?: string;
  title: string;
  emoji?: string;
  coverUrl?: string;
  releaseYear?: number;
  rating?: number;
  metacriticScore?: number;
  description: string;
  downloadUrl?: string;
  gameplayUrl?: string;
  accent?: string;
  genres?: string[];
  platforms?: string[];
  trending?: boolean;
  systemReqs?: { min: SysReqRow; rec: SysReqRow };
};

const BLANK_REQ: SysReqRow = { os: "", cpu: "", ram: "", gpu: "", storage: "" };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject<Body>(request, 128 * 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "title_and_description_required" }, { status: 400 });
  }

  const id = body.id?.trim() || slugify(body.title);
  if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const row = {
    id,
    title: body.title.trim().slice(0, 200),
    emoji: (body.emoji?.trim() || "🎮").slice(0, 8),
    cover_url: body.coverUrl?.trim() || null,
    release_year: Number.isFinite(body.releaseYear) ? Number(body.releaseYear) : new Date().getFullYear(),
    rating: Number.isFinite(body.rating) ? Math.min(10, Math.max(0, Number(body.rating))) : 0,
    metacritic_score: Number.isFinite(body.metacriticScore) ? Math.min(100, Math.max(0, Number(body.metacriticScore))) : null,
    description: body.description.trim().slice(0, 4000),
    download_url: body.downloadUrl?.trim() || "#",
    gameplay_url: body.gameplayUrl?.trim() || null,
    accent: body.accent?.trim() || "from-amber-500/30 to-amber-500/5",
    genres: Array.isArray(body.genres) ? body.genres.filter((g) => typeof g === "string").slice(0, 20) : [],
    platforms: Array.isArray(body.platforms) ? body.platforms.filter((p) => typeof p === "string").slice(0, 20) : [],
    trending: !!body.trending,
    system_reqs: body.systemReqs ?? { min: BLANK_REQ, rec: BLANK_REQ },
    created_by: auth.userId,
    updated_at: new Date().toISOString(),
  };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cracked_games")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("[/api/admin/cracked-games POST]", error);
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  await logAdminAction({
    actorId: auth.userId,
    action: "cracked_games.upsert",
    targetType: "cracked_game",
    targetId: id,
    metadata: { title: row.title },
  });

  return NextResponse.json(data, { status: 201 });
}

export async function GET() {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("cracked_games")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}
