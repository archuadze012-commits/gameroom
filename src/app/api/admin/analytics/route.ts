import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/admin";

export async function GET() {
  const auth = await requirePermission("view_analytics");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const t24 = new Date(now.getTime() - day).toISOString();
  const t7 = new Date(now.getTime() - 7 * day).toISOString();
  const t30 = new Date(now.getTime() - 30 * day).toISOString();

  const [
    totalUsersRes,
    bannedRes,
    verifiedRes,
    dauRes,
    wauRes,
    mauRes,
    signups7Res,
    postsRes,
    messagesRes,
    reportsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("banned", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", t24),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", t7),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen_at", t30),
    supabase.from("profiles").select("created_at").gte("created_at", t7).order("created_at"),
    supabase.from("posts").select("*", { count: "exact", head: true }).gte("created_at", t7).is("deleted_at", null),
    supabase.from("chat_messages").select("*", { count: "exact", head: true }).gte("created_at", t7).is("deleted_at", null),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);

  // build signup daily buckets
  const signups: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * day);
    const key = d.toISOString().slice(0, 10);
    signups[key] = 0;
  }
  (signups7Res.data ?? []).forEach((row: { created_at: string }) => {
    const key = row.created_at.slice(0, 10);
    if (key in signups) signups[key]++;
  });

  // top channels by msg count (last 7d)
  const { data: msgRows } = await supabase
    .from("chat_messages")
    .select("channel_id")
    .gte("created_at", t7)
    .is("deleted_at", null);
  const channelCounts: Record<string, number> = {};
  (msgRows ?? []).forEach((r: { channel_id: string }) => {
    channelCounts[r.channel_id] = (channelCounts[r.channel_id] ?? 0) + 1;
  });
  const topChannels = Object.entries(channelCounts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // top games by favorites
  const { data: profileFaves } = await supabase
    .from("profiles")
    .select("favorite_game_slugs");
  const gameCounts: Record<string, number> = {};
  (profileFaves ?? []).forEach((p: { favorite_game_slugs: string[] | null }) => {
    (p.favorite_game_slugs ?? []).forEach((s) => {
      gameCounts[s] = (gameCounts[s] ?? 0) + 1;
    });
  });
  const topGames = Object.entries(gameCounts)
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    totals: {
      users: totalUsersRes.count ?? 0,
      banned: bannedRes.count ?? 0,
      verified: verifiedRes.count ?? 0,
      openReports: reportsRes.count ?? 0,
    },
    activity: {
      dau: dauRes.count ?? 0,
      wau: wauRes.count ?? 0,
      mau: mauRes.count ?? 0,
      posts7d: postsRes.count ?? 0,
      messages7d: messagesRes.count ?? 0,
    },
    signups7d: signups,
    topChannels,
    topGames,
  });
}
