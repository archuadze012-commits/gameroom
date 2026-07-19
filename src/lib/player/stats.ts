import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type PlayerRatingEntry = { rating: number; games: number; w: number; l: number; d: number };

export type PlayerStats = {
  rating: number | null;
  rank: number | null; // global rank among rated players
  games: number;
  w: number;
  l: number;
  d: number;
  winRate: number;
  tournaments: number;
  championships: number;
  form: ("win" | "loss" | "draw")[]; // last 5, newest first
};

function anonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}

// Per-PLAYER competitive rating (ELO), derived from the tournament engine's played
// matches. Both players in a match are real profiles, so both update from a 1000
// base (K=32). Global + viewer-independent → cached (mirrors clan power ratings).
async function computePlayerRatings(): Promise<Record<string, PlayerRatingEntry>> {
  const supabase = anonClient();
  const { data: matchesData } = await supabase
    .from("tournament_matches")
    .select("player1_id, player2_id, winner_id, status, scheduled_at, created_at");

  const played = ((matchesData ?? []) as Array<{
    player1_id: string | null; player2_id: string | null; winner_id: string | null;
    status: string; scheduled_at: string | null; created_at: string;
  }>)
    .filter((m) => m.player1_id && m.player2_id && (["reported", "confirmed"].includes(m.status) || m.winner_id != null))
    .sort((a, b) => new Date(a.scheduled_at ?? a.created_at).getTime() - new Date(b.scheduled_at ?? b.created_at).getTime());

  const BASE = 1000;
  const K = 32;
  const ratings = new Map<string, PlayerRatingEntry>();
  const entry = (id: string) => ratings.get(id) ?? { rating: BASE, games: 0, w: 0, l: 0, d: 0 };

  for (const m of played) {
    const a = m.player1_id!;
    const b = m.player2_id!;
    const eA = entry(a);
    const eB = entry(b);
    const rA = eA.rating;
    const rB = eB.rating;
    const sA = m.winner_id === a ? 1 : m.winner_id === b ? 0 : 0.5;
    const expA = 1 / (1 + Math.pow(10, (rB - rA) / 400));

    eA.rating = rA + K * (sA - expA);
    eA.games += 1;
    if (sA === 1) eA.w += 1;
    else if (sA === 0) eA.l += 1;
    else eA.d += 1;
    ratings.set(a, eA);

    eB.rating = rB + K * (1 - sA - (1 - expA));
    eB.games += 1;
    if (sA === 0) eB.w += 1;
    else if (sA === 1) eB.l += 1;
    else eB.d += 1;
    ratings.set(b, eB);
  }

  const out: Record<string, PlayerRatingEntry> = {};
  for (const [k, v] of ratings) out[k] = { ...v, rating: Math.round(v.rating) };
  return out;
}

const cachedPlayerRatings = unstable_cache(computePlayerRatings, ["player-power-ratings"], {
  revalidate: 60,
  tags: ["player-power"],
});

export async function getPlayerPowerRatings(): Promise<Map<string, PlayerRatingEntry>> {
  return new Map(Object.entries(await cachedPlayerRatings()));
}

// Full competitive stats for one player: rating + global rank (from the cached
// map) + tournaments entered + championships (2 cheap counts) + last-5 form.
export async function getPlayerStats(supabase: SupabaseServer, userId: string): Promise<PlayerStats> {
  const [ratings, { count: tournaments }, { count: championships }, { data: recentMatches }] = await Promise.all([
    getPlayerPowerRatings(),
    supabase.from("tournament_participants").select("tournament_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("winner_id", userId).eq("status", "completed"),
    supabase
      .from("tournament_matches")
      .select("player1_id, player2_id, winner_id, status, scheduled_at, created_at")
      .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(20),
  ]);

  const entry = ratings.get(userId) ?? null;
  let rank: number | null = null;
  if (entry) {
    rank = 1 + [...ratings.values()].filter((v) => v.rating > entry.rating).length;
  }

  const form = ((recentMatches ?? []) as Array<{ player1_id: string | null; player2_id: string | null; winner_id: string | null; status: string }>)
    .filter((m) => ["reported", "confirmed"].includes(m.status) || m.winner_id != null)
    .slice(0, 5)
    .map((m): "win" | "loss" | "draw" => (m.winner_id === userId ? "win" : m.winner_id ? "loss" : "draw"));

  const games = entry?.games ?? 0;
  const w = entry?.w ?? 0;
  const l = entry?.l ?? 0;
  const d = entry?.d ?? 0;
  return {
    rating: entry?.rating ?? null,
    rank,
    games,
    w,
    l,
    d,
    winRate: games > 0 ? Math.round((w / games) * 100) : 0,
    tournaments: tournaments ?? 0,
    championships: championships ?? 0,
    form,
  };
}
