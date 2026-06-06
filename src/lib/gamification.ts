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
