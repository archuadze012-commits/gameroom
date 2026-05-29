import { createSupabaseAdminClient } from "./supabase/admin";
import { getSession } from "./auth";
import { awardXp } from "./gamification";

export async function updateLastSeen() {
  try {
    const session = await getSession().catch(() => null);
    if (!session?.id) return;

    const supabase = createSupabaseAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    // Check if we should award daily login XP
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_login_award_at, daily_streak_count")
      .eq("id", session.id)
      .maybeSingle();

    const lastAward = profile?.last_login_award_at;
    if (lastAward !== today) {
      // Award +5 XP and bump streak
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      const newStreak = lastAward === yesterday ? (profile?.daily_streak_count ?? 0) + 1 : 1;
      await awardXp(session.id, 5);
      await supabase
        .from("profiles")
        .update({
          last_seen_at: new Date().toISOString(),
          last_login_award_at: today,
          daily_streak_count: newStreak,
        })
        .eq("id", session.id);
    } else {
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", session.id);
    }
  } catch {
    // silently fail
  }
}
