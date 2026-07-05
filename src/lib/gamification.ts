import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createLogger, getErrorMessage } from "@/lib/logger";

const logger = createLogger("gamification");

export type AwardXpResult =
  | { ok: true }
  | { ok: false; code: "invalid_input" | "rpc_failed" | "exception"; message: string };

export async function awardXp(userId: string, amount: number): Promise<AwardXpResult> {
  if (!userId || !Number.isInteger(amount) || amount <= 0) {
    return {
      ok: false,
      code: "invalid_input",
      message: "awardXp requires a valid user id and positive integer amount",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("award_xp", {
      p_user_id: userId,
      p_amount: amount,
    });

    if (error) {
      logger.error("awardXp RPC failed", { userId, amount, error });
      return { ok: false, code: "rpc_failed", message: error.message };
    }

    return { ok: true };
  } catch (error) {
    logger.error("awardXp threw", { userId, amount, error });
    return { ok: false, code: "exception", message: getErrorMessage(error) };
  }
}

export async function awardBonusXp(
  userId: string,
  amount: number,
  context: string,
): Promise<AwardXpResult> {
  const result = await awardXp(userId, amount);
  if (!result.ok) {
    logger.warn("bonus XP award failed", {
      userId,
      amount,
      context,
      code: result.code,
      message: result.message,
    });
  }
  return result;
}

/**
 * Idempotent XP award: grants `amount` to `userId` at most once per
 * (sourceType, sourceId) pair, ever. Use this for XP tied to a reversible social
 * action (a like, a follow) so re-toggling can't farm XP — the key must encode
 * the specific relationship, e.g. `${followerId}:${followingId}`.
 */
export async function awardBonusXpOnce(
  userId: string,
  amount: number,
  sourceType: string,
  sourceId: string,
): Promise<AwardXpResult> {
  if (!userId || !Number.isInteger(amount) || amount <= 0 || !sourceType || !sourceId) {
    return { ok: false, code: "invalid_input", message: "awardBonusXpOnce requires valid args" };
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("award_xp_once", {
      p_user_id: userId,
      p_amount: amount,
      p_source_type: sourceType,
      p_source_id: sourceId,
    });
    if (error) {
      logger.error("awardBonusXpOnce RPC failed", { userId, amount, sourceType, sourceId, error });
      return { ok: false, code: "rpc_failed", message: error.message };
    }
    return { ok: true };
  } catch (error) {
    logger.error("awardBonusXpOnce threw", { userId, amount, sourceType, sourceId, error });
    return { ok: false, code: "exception", message: getErrorMessage(error) };
  }
}
