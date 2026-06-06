"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("tournament-actions");

export type TournamentActionState = {
  success: boolean;
  message?: string;
};

export async function registerForTournamentAction(
  tournamentId: string,
  slug: string
): Promise<TournamentActionState> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  // 1. Check if tournament is open
  const { data: t, error: tErr } = await supabase
    .from("tournaments")
    .select("status, max_participants")
    .eq("id", tournamentId)
    .single();

  if (tErr || !t) return { success: false, message: "ტურნირი ვერ მოიძებნა" };
  if (t.status !== "open") return { success: false, message: "რეგისტრაცია დახურულია" };

  // 2. Check current participant count
  const { count } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if ((count ?? 0) >= (t.max_participants || 8)) {
    return { success: false, message: "ადგილები შევსებულია" };
  }

  // 3. Register
  const { error } = await supabase
    .from("tournament_participants")
    .insert({
      tournament_id: tournamentId,
      user_id: user.id,
      seed: (count ?? 0) + 1,
    });

  if (error) {
    if (error.code === "23505") return { success: false, message: "უკვე დარეგისტრირებული ხარ" };
    logger.error("failed to register for tournament", { userId: user.id, tournamentId, error });
    return { success: false, message: "რეგისტრაცია ვერ მოხერხდა" };
  }

  revalidatePath(`/tournaments/${slug}`);
  return { success: true, message: "წარმატებით დარეგისტრირდი!" };
}

export async function checkinForTournamentAction(
  tournamentId: string,
  slug: string
): Promise<TournamentActionState> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  // Check if check-in is allowed
  const { data: t } = await supabase
    .from("tournaments")
    .select("status")
    .eq("id", tournamentId)
    .single();

  if (!t || t.status !== "checkin") {
    return { success: false, message: "Check-in ჯერ არ დაწყებულა" };
  }

  const { error } = await supabase
    .from("tournament_participants")
    .update({ checked_in: true })
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id);

  if (error) {
    logger.error("failed to check in for tournament", { userId: user.id, tournamentId, error });
    return { success: false, message: "Check-in ვერ მოხერხდა" };
  }

  revalidatePath(`/tournaments/${slug}`);
  return { success: true, message: "Check-in წარმატებულია!" };
}

export async function reportMatchScoreAction(
  matchId: string,
  score1: number,
  score2: number,
  slug: string
): Promise<TournamentActionState> {
  const user = await getSession();
  if (!user) return { success: false, message: "ავტორიზაცია აუცილებელია" };

  const supabase = await createSupabaseServerClient();

  // 1. Verify match existence and user participation
  const { data: m, error: mErr } = await supabase
    .from("tournament_matches")
    .select("id, player1_id, player2_id, status")
    .eq("id", matchId)
    .single();

  if (mErr || !m) return { success: false, message: "მატჩი ვერ მოიძებნა" };
  if (m.player1_id !== user.id && m.player2_id !== user.id) {
    return { success: false, message: "თქვენ არ ხართ ამ მატჩის მონაწილე" };
  }
  if (m.status !== "live" && m.status !== "ready") {
    return { success: false, message: "ამ მატჩის შედეგის შეტანა შეუძლებელია" };
  }

  // 2. Update score (in a real app, we'd need confirmation from both or admin)
  // For MVP, we'll mark it as 'reported'
  const { error } = await supabase
    .from("tournament_matches")
    .update({
      score1,
      score2,
      status: "reported",
    })
    .eq("id", matchId);

  if (error) {
    logger.error("failed to report match score", { userId: user.id, matchId, error });
    return { success: false, message: "შედეგის შენახვა ვერ მოხერხდა" };
  }

  revalidatePath(`/tournaments/${slug}`);
  return { success: true, message: "შედეგი გაიგზავნა დასადასტურებლად!" };
}
