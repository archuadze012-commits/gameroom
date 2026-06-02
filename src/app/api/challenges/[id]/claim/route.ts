import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { awardXp } from "@/lib/gamification";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: challengeId } = await params;
  const session = await getSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServerClient();
  const adminClient = createSupabaseAdminClient();

  const { data: challenge } = await supabase
    .from("daily_challenges")
    .select("id, xp_reward, active_date, is_active")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge || !challenge.is_active || challenge.active_date !== today) {
    return NextResponse.json({ error: "Challenge not available" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("user_challenge_progress")
    .select("id, claimed")
    .eq("user_id", session.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (existing?.claimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 400 });
  }

  if (existing) {
    await adminClient
      .from("user_challenge_progress")
      .update({ claimed: true, completed: true, progress: 1, claimed_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await adminClient.from("user_challenge_progress").insert({
      user_id: session.id,
      challenge_id: challengeId,
      progress: 1,
      completed: true,
      claimed: true,
      claimed_at: new Date().toISOString(),
    });
  }

  await awardXp(session.id, challenge.xp_reward);

  return NextResponse.json({ ok: true, xp: challenge.xp_reward });
}
