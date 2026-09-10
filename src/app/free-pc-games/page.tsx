import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { crackedGames, type CrackedGame } from "@/lib/mock-data";
import { CrackedGamesClient } from "./cracked-games-client";

// Catalog changes rarely — render on the server (crawlable + no HTML→JS→fetch
// waterfall) and cache with ISR. Plain anon client so cookies() doesn't force
// this fully dynamic.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "PC თამაშები უფასოდ",
  description:
    "გადმოწერე პოპულარული PC თამაშები უფასოდ — RPG, ეკშენი, FPS, სტრატეგია და მეტი PLAYGAME.GE-ზე.",
  alternates: { canonical: "/free-pc-games" },
  openGraph: {
    title: "PC თამაშები უფასოდ",
    description: "გადმოწერე პოპულარული PC თამაშები უფასოდ PLAYGAME.GE-ზე.",
    url: "/free-pc-games",
    type: "website",
  },
};

type DbRow = {
  id: string;
  title: string;
  emoji: string;
  cover_url: string | null;
  release_year: number;
  rating: number;
  description: string;
  download_url: string;
  gameplay_url: string | null;
  accent: string;
  genres: string[];
  platforms: string[];
  trending: boolean;
  system_reqs: { min: { os: string; cpu: string; ram: string; gpu: string; storage: string }; rec: { os: string; cpu: string; ram: string; gpu: string; storage: string } };
};

function dbRowToGame(row: DbRow): CrackedGame {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    coverUrl: row.cover_url ?? undefined,
    releaseYear: row.release_year,
    rating: row.rating,
    description: row.description,
    downloadUrl: row.download_url,
    gameplayUrl: row.gameplay_url ?? undefined,
    accent: row.accent,
    genre: row.genres,
    platform: row.platforms,
    trending: row.trending,
    systemReqs: row.system_reqs,
  };
}

export default async function FreePcGamesPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const byId = new Map<string, CrackedGame>();
  crackedGames.forEach((g) => byId.set(g.id, g));

  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      { auth: { persistSession: false } },
    );

    const [rowsRes, hiddenRes] = await Promise.all([
      supabase.from("cracked_games").select("*").order("created_at", { ascending: false }),
      supabase.from("hidden_cracked_games").select("id"),
    ]);

    const dbGames = ((rowsRes.data ?? []) as unknown as DbRow[]).map(dbRowToGame);
    const hidden = new Set(((hiddenRes.data ?? []) as { id: string }[]).map((r) => r.id));

    dbGames.forEach((g) => byId.set(g.id, g));
    const games = Array.from(byId.values()).filter((g) => !hidden.has(g.id));
    return <CrackedGamesClient games={games} />;
  }

  // Merge mock + DB (DB wins on id), drop hidden. Same shape the client used to
  // compute on mount — now done once on the server.
  const games = Array.from(byId.values());

  return <CrackedGamesClient games={games} />;
}
