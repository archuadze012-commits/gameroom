import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/admin";

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
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("games").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  let body: Body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!body.nameKa?.trim()) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const slug = body.slug?.trim() || slugify(body.nameKa);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("games")
    .upsert({
      slug,
      name_ka: body.nameKa.trim(),
      name_en: body.nameEn?.trim() || body.nameKa.trim(),
      description: body.description?.trim() || "",
      accent: body.accent?.trim() || "from-indigo-500/30 to-indigo-500/5",
      emoji: body.emoji?.trim() || "🎮",
      icon_url: body.iconUrl?.trim() || null,
      cover_url: body.coverUrl?.trim() || null,
    }, { onConflict: "slug" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
