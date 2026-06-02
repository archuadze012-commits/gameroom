import { NextRequest, NextResponse } from "next/server";
import { readJsonObject } from "@/lib/api/json";
import { requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

type GameInsert = Database["public"]["Tables"]["games"]["Insert"];

type Body = {
  slug?: string;
  nameKa: string;
  nameEn: string;
  description: string;
  accent?: string;
  emoji?: string;
  iconUrl?: string;
  coverUrl?: string;
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export async function GET() {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("games").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const parsed = await readJsonObject<Body>(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (!body.nameKa?.trim()) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const slug = body.slug?.trim() || slugify(body.nameKa);

  // Use admin client to bypass RLS
  const supabase = createSupabaseAdminClient();

  const isEditing = !!body.slug?.trim();

  // Match the live schema: accent_color (text), no `accent` column.
  const payload: GameInsert = {
    slug,
    name_ka: body.nameKa.trim(),
    name_en: body.nameEn?.trim() || body.nameKa.trim(),
    description: body.description?.trim() || "",
    emoji: body.emoji?.trim() || null,
    icon_url: body.iconUrl?.trim() || null,
    cover_url: body.coverUrl?.trim() || null,
  };
  if (body.accent?.trim()) payload.accent_color = body.accent.trim();
  // Only set defaults on create so editing doesn't clobber active/position
  if (!isEditing) {
    payload.active = true;
    payload.position = 0;
    if (!payload.accent_color) payload.accent_color = "#a855f7";
  }

  const { data, error } = await supabase
    .from("games")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .single();

  if (error) {
    console.error("[admin/games POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
