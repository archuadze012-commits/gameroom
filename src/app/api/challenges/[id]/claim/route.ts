import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth";
import { awardXp } from "@/lib/gamification";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:challenges-claim");

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

  let insertedProgressId: string | null = null;

  if (existing) {
    const { error: updateError } = await adminClient
      .from("user_challenge_progress")
      .update({ claimed: true, completed: true, progress: 1, claimed_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (updateError) {
      logger.error("failed to mark challenge progress claimed", {
        userId: session.id,
        challengeId,
        error: updateError,
      });
      return NextResponse.json({ error: "Failed to claim challenge" }, { status: 500 });
    }
  } else {
    const { data: insertedProgress, error: insertError } = await adminClient
      .from("user_challenge_progress")
      .insert({
        user_id: session.id,
        challenge_id: challengeId,
        progress: 1,
        completed: true,
        claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !insertedProgress) {
      logger.error("failed to insert challenge progress", {
        userId: session.id,
        challengeId,
        error: insertError,
      });
      return NextResponse.json({ error: "Failed to claim challenge" }, { status: 500 });
    }

    insertedProgressId = insertedProgress.id;
  }

  const xpResult = await awardXp(session.id, challenge.xp_reward);
  if (!xpResult.ok) {
    if (insertedProgressId) {
      const { error: rollbackError } = await adminClient
        .from("user_challenge_progress")
        .delete()
        .eq("id", insertedProgressId);
      if (rollbackError) {
        logger.error("failed to rollback inserted challenge progress", {
          userId: session.id,
          challengeId,
          error: rollbackError,
        });
      }
    } else if (existing) {
      const { error: rollbackError } = await adminClient
        .from("user_challenge_progress")
        .update({ claimed: false, claimed_at: null })
        .eq("id", existing.id);
      if (rollbackError) {
        logger.error("failed to rollback claimed challenge progress", {
          userId: session.id,
          challengeId,
          error: rollbackError,
        });
      }
    }

    return NextResponse.json(
      { error: "Failed to award XP", code: xpResult.code },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, xp: challenge.xp_reward });
}
