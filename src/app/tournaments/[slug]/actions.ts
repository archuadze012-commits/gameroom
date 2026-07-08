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

  const maxParticipants = t.max_participants || 8;

  // 2. Fast-path capacity check (cheap early reject; NOT the authoritative guard).
  const { count } = await supabase
    .from("tournament_participants")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if ((count ?? 0) >= maxParticipants) {
    return { success: false, message: "ადგილები შევსებულია" };
  }

  // 3. Insert (seed is provisional — corrected below). The (tournament_id,
  // user_id) unique index makes this idempotent per user.
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

  // 4. Reconcile against concurrent registrations. `count`-then-insert races let
  // several users past step 2 at once — overfilling the bracket and colliding on
  // `seed`. Rank everyone by immutable `registered_at`: the earliest
  // `maxParticipants` win deterministically; anyone beyond removes their own row.
  // Seed is then set from that stable rank, so concurrent registrants never share
  // a seed. (No DB migration; a unique (tournament_id, seed) constraint + atomic
  // RPC would be the airtight version — say the word and I'll add it.)
  const { data: ordered, error: orderErr } = await supabase
    .from("tournament_participants")
    .select("user_id, registered_at")
    .eq("tournament_id", tournamentId)
    .order("registered_at", { ascending: true });

  if (orderErr || !ordered) {
    // Reconciliation read failed — leave the registration as-is (step 2 already
    // gated the common case) rather than wrongly rejecting a valid signup.
    logger.error("failed to reconcile tournament seeds", { userId: user.id, tournamentId, error: orderErr });
    revalidatePath(`/tournaments/${slug}`);
    return { success: true, message: "წარმატებით დარეგისტრირდი!" };
  }

  const rank = ordered.findIndex((r) => r.user_id === user.id);

  if (rank >= maxParticipants) {
    // We lost the race for the last slot(s) — undo our own insert.
    const { error: delErr } = await supabase
      .from("tournament_participants")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("user_id", user.id);
    if (delErr) {
      logger.error("failed to remove over-capacity registration", { userId: user.id, tournamentId, error: delErr });
    }
    return { success: false, message: "ადგილები შევსებულია" };
  }

  // Set our final seed from the stable registration order (1-based).
  await supabase
    .from("tournament_participants")
    .update({ seed: rank + 1 })
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id);

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

  // Validate scores server-side — the client controls these and there is no
  // CHECK constraint on the columns, so reject negatives / non-integers / absurd
  // values before they're persisted (e.g. a participant reporting -5 : 99999).
  const MAX_SCORE = 999;
  if (
    !Number.isInteger(score1) || !Number.isInteger(score2) ||
    score1 < 0 || score2 < 0 || score1 > MAX_SCORE || score2 > MAX_SCORE
  ) {
    return { success: false, message: "არასწორი ანგარიში" };
  }

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
