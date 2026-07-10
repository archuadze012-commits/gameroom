import { NextResponse } from "next/server";

import { createLogger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const logger = createLogger("api:games");

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("games")
    .select("slug, name_ka, name_en, description, cover_url, accent_color, emoji")
    .eq("active", true)
    .order("position", { ascending: true })
    .limit(200);

  if (error) {
    logger.error("failed to fetch public games", { error });
    return NextResponse.json({ error: "games_fetch_failed" }, { status: 500 });
  }

  return NextResponse.json(
    (data ?? []).map((game) => ({
      slug: game.slug,
      nameKa: game.name_ka,
      nameEn: game.name_en,
      description: game.description ?? "",
      coverUrl: game.cover_url ?? undefined,
      accent: game.accent_color ?? "from-indigo-500/30 to-cyan-500/10",
      emoji: game.emoji ?? "🎮",
    })),
  );
}
