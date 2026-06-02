import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServerClient();
  const session = await getSession().catch(() => null);

  const { data: challenges, error } = await supabase
    .from("daily_challenges")
    .select("id, title, description, challenge_type, xp_reward, target_count, active_date")
    .eq("active_date", today)
    .eq("is_active", true)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!challenges || challenges.length === 0) {
    return NextResponse.json([]);
  }

  if (!session) {
    return NextResponse.json(challenges.map((c) => ({ ...c, claimed: false, progress: 0 })));
  }

  const challengeIds = challenges.map((c) => c.id);
  const { data: progressRows } = await supabase
    .from("user_challenge_progress")
    .select("challenge_id, progress, completed, claimed")
    .eq("user_id", session.id)
    .in("challenge_id", challengeIds);

  const progressMap = new Map(
    (progressRows ?? []).map((r) => [r.challenge_id, r])
  );

  return NextResponse.json(
    challenges.map((c) => {
      const p = progressMap.get(c.id);
      return { ...c, progress: p?.progress ?? 0, completed: p?.completed ?? false, claimed: p?.claimed ?? false };
    })
  );
}
