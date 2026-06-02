import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePermission, logAdminAction } from "@/lib/admin";

export async function GET() {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("*")
    .order("active_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("manage_content");
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status });

  const body = (await req.json()) as {
    title: string;
    description?: string;
    challenge_type?: string;
    xp_reward?: number;
    target_count?: number;
    active_date: string;
  };

  if (!body.title?.trim() || !body.active_date?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json({ error: "title and active_date (YYYY-MM-DD) required" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("daily_challenges")
    .insert({
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      challenge_type: body.challenge_type ?? "manual",
      xp_reward: body.xp_reward ?? 50,
      target_count: body.target_count ?? 1,
      active_date: body.active_date,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction({ actorId: auth.userId, action: "create_challenge", targetId: data.id });
  return NextResponse.json(data, { status: 201 });
}
