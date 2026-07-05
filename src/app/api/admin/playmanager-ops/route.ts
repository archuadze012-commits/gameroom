import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MATCH_STATUS } from "@/lib/playmanager/status";

export async function GET() {
  const auth = await requirePermission("view_playmanager_ops");
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: auth.status });

  const db = createSupabaseAdminClient();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const t7 = new Date(now - 7 * day).toISOString();
  const t30 = new Date(now - 30 * day).toISOString();
  // Recovery already reclaims a stranded 'processing' claim after 2 minutes
  // (see processDueCupMatches/processDueLeagueMatches); a wider 15-minute
  // window here means "still processing after recovery should have kicked
  // in" rather than duplicating that fast-path window.
  const stuckClaimBefore = new Date(now - 15 * 60 * 1000).toISOString();
  // A 'ready' fixture whose start_time has passed only advances once someone
  // loads a page that calls processDue* (there's no cron) — flag anything
  // overdue by more than an hour as a sign that path hasn't run recently.
  const overdueSince = new Date(now - 60 * 60 * 1000).toISOString();

  const [
    walletRes,
    transactionsRes,
    offersRes,
    activeListingsRes,
    freeAgentRes,
    pendingRepackRes,
    stuckCupRes,
    overdueCupRes,
    stuckLeagueRes,
    overdueLeagueRes,
  ] = await Promise.all([
    db.from("pm_wallets").select("balance"),
    db
      .from("pm_transactions")
      .select("id, amount, reason, created_at, team:pm_teams(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("pm_transfer_offers")
      .select("from_team_id, to_team_id, amount_gel, from_team:pm_teams!from_team_id(name), to_team:pm_teams!to_team_id(name)")
      .eq("status", "accepted")
      .gte("created_at", t30),
    db.from("pm_transfer_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    db
      .from("pm_players")
      .select("id", { count: "exact", head: true })
      .is("owner_id", null)
      .eq("status", "active")
      .not("pending_repack", "is", true),
    db.from("pm_players").select("id", { count: "exact", head: true }).eq("pending_repack", true),
    db
      .from("pm_cup_matches")
      .select("id, round, status, claimed_at, team1:pm_teams!team1_id(name), team2:pm_teams!team2_id(name)")
      .eq("status", MATCH_STATUS.processing)
      .lt("claimed_at", stuckClaimBefore),
    db
      .from("pm_cup_matches")
      .select("id, round, status, start_time, team1:pm_teams!team1_id(name), team2:pm_teams!team2_id(name)")
      .eq("status", MATCH_STATUS.ready)
      .lt("start_time", overdueSince),
    db
      .from("pm_league_fixtures")
      .select("id, round, status, claimed_at, home_team:pm_teams!home_team_id(name), away_team:pm_teams!away_team_id(name)")
      .eq("status", MATCH_STATUS.processing)
      .lt("claimed_at", stuckClaimBefore),
    db
      .from("pm_league_fixtures")
      .select("id, round, status, start_time, home_team:pm_teams!home_team_id(name), away_team:pm_teams!away_team_id(name)")
      .eq("status", MATCH_STATUS.ready)
      .lt("start_time", overdueSince),
  ]);

  const wallets = walletRes.data ?? [];
  const walletSupply = wallets.reduce((sum, w) => sum + w.balance, 0);

  const transactions = (transactionsRes.data ?? []).map((t) => ({
    id: t.id,
    amount: t.amount,
    reason: t.reason,
    createdAt: t.created_at,
    teamName: firstRel(t.team)?.name ?? "—",
  }));

  // Group accepted offers by unordered team pair — repeated trades between the
  // same two teams (which the RPC already caps at 2/season) are worth a human
  // glance, since it's the pattern a wash-trade / money-loop would produce.
  const pairCounts = new Map<string, { teamA: string; teamB: string; count: number; totalGel: number }>();
  for (const row of offersRes.data ?? []) {
    const [a, b] = [row.from_team_id, row.to_team_id].sort();
    const key = `${a}:${b}`;
    const fromName = firstRel(row.from_team)?.name ?? "—";
    const toName = firstRel(row.to_team)?.name ?? "—";
    const existing = pairCounts.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalGel += row.amount_gel;
    } else {
      pairCounts.set(key, { teamA: fromName, teamB: toName, count: 1, totalGel: row.amount_gel });
    }
  }
  const transferPairs = [...pairCounts.values()]
    .sort((x, y) => y.count - x.count)
    .slice(0, 20);

  const stuckFixtures = [
    ...(stuckCupRes.data ?? []).map((m) => ({
      kind: "cup" as const,
      id: m.id,
      round: m.round,
      status: m.status,
      since: m.claimed_at,
      label: `${firstRel(m.team1)?.name ?? "?"} vs ${firstRel(m.team2)?.name ?? "?"}`,
    })),
    ...(overdueCupRes.data ?? []).map((m) => ({
      kind: "cup" as const,
      id: m.id,
      round: m.round,
      status: m.status,
      since: m.start_time,
      label: `${firstRel(m.team1)?.name ?? "?"} vs ${firstRel(m.team2)?.name ?? "?"}`,
    })),
    ...(stuckLeagueRes.data ?? []).map((f) => ({
      kind: "league" as const,
      id: f.id,
      round: f.round,
      status: f.status,
      since: f.claimed_at,
      label: `${firstRel(f.home_team)?.name ?? "?"} vs ${firstRel(f.away_team)?.name ?? "?"}`,
    })),
    ...(overdueLeagueRes.data ?? []).map((f) => ({
      kind: "league" as const,
      id: f.id,
      round: f.round,
      status: f.status,
      since: f.start_time,
      label: `${firstRel(f.home_team)?.name ?? "?"} vs ${firstRel(f.away_team)?.name ?? "?"}`,
    })),
  ];

  return NextResponse.json({
    economy: {
      teamCount: wallets.length,
      walletSupply,
      activeListings: activeListingsRes.count ?? 0,
      freeAgentPool: freeAgentRes.count ?? 0,
      pendingRepack: pendingRepackRes.count ?? 0,
    },
    transactions,
    transferPairs,
    stuckFixtures,
    generatedAt: new Date(now).toISOString(),
    windows: { t7, t30 },
  });
}

function firstRel<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
