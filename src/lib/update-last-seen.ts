import { createSupabaseAdminClient } from "./supabase/admin";
import { awardXp } from "./gamification";
import { sendPushToUser } from "./push";
import { createLogger } from "./logger";

const logger = createLogger("update-last-seen");

export async function updateLastSeen(userId?: string) {
  try {
    const targetUserId = userId;
    if (!targetUserId) return { ok: true as const };

    const supabase = createSupabaseAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // Check if we should award daily login XP

    // Check if we should award daily login XP
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_login_award_at, daily_streak_count")
      .eq("id", targetUserId)
      .maybeSingle();

    const lastAward = profile?.last_login_award_at;
    if (lastAward !== today) {
      // Award +5 XP and bump streak
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const newStreak = lastAward === yesterday ? (profile?.daily_streak_count ?? 0) + 1 : 1;

      // Update profiles conditionally to ensure only one concurrent request awards XP
      const { data, error } = await supabase
        .from("profiles")
        .update({
          last_seen_at: new Date().toISOString(),
          last_login_award_at: today,
          daily_streak_count: newStreak,
        })
        .eq("id", targetUserId)
        .or(`last_login_award_at.is.null,last_login_award_at.neq.${today}`)
        .select("id");

      if (error) {
        logger.error("daily login profile update failed", { userId: targetUserId, error });
        return { ok: false as const, error: error.message };
      }

      // If data is returned, we were the ones who successfully updated last_login_award_at to today
      if (data && data.length > 0) {
        const xpResult = await awardXp(targetUserId, 5);
        if (!xpResult.ok) {
          logger.error("daily login XP award failed after successfully claiming the login date", {
            userId: targetUserId,
            code: xpResult.code,
            message: xpResult.message,
          });
        }

        // Fresh-day activity is exactly the "returned on a later day" signal a
        // pending referral needs — evaluate qualification once per day. No-op
        // (fast) for users without a pending referral.
        const { data: refRewarded, error: refError } = await supabase.rpc("process_referral_qualification", {
          p_referred: targetUserId,
        });
        if (refError) {
          logger.warn("referral qualification check failed", { userId: targetUserId, error: refError });
        } else if (refRewarded === true) {
          // A pending referral just qualified — nudge the referrer with a push
          // (the in-app notification is created inside the RPC).
          const { data: ref } = await supabase
            .from("referrals")
            .select("referrer_id")
            .eq("referred_id", targetUserId)
            .eq("status", "rewarded")
            .maybeSingle();
          if (ref?.referrer_id) {
            await sendPushToUser(ref.referrer_id, {
              title: "შენი მოწვევა გააქტიურდა! 🎉",
              body: "მიიღე +1000 NC — მეგობარი შემოგვიერთდა",
              url: "/invite",
              tag: "referral-activated",
            }).catch((e) => logger.warn("referral push failed", { error: e }));
          }
        }

        // "Better together" co-op bonus — fires the first fresh day the user has
        // actually interacted with a referral partner (either direction). No-op
        // (fast) for users with no un-coop-rewarded referral.
        const { error: coopError } = await supabase.rpc("process_referral_coop", {
          p_user: targetUserId,
        });
        if (coopError) {
          logger.warn("referral co-op check failed", { userId: targetUserId, error: coopError });
        }
      }
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", targetUserId);
      if (error) {
        logger.error("last_seen update failed", { userId: targetUserId, error });
        return { ok: false as const, error: error.message };
      }
    }
    return { ok: true as const };
  } catch (error) {
    logger.error("updateLastSeen threw", { error });
    return { ok: false as const, error: "update_failed" };
  }
}
