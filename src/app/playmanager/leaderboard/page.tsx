import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Coins, Crown, Medal, Trophy, TrendingUp } from 'lucide-react';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { formatGel } from '@/lib/playmanager/economy';
import { getTeam } from '@/lib/playmanager/team';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SortMode = 'level' | 'wealth' | 'division';

type LeaderRow = {
  teamId: string;
  teamName: string;
  divisionId: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  balance: number;
};

const DIVISION_LABELS = ['', 'A', 'B', 'C', 'D'];

const SORT_TABS: { key: SortMode; label: string }[] = [
  { key: 'level', label: 'დონე' },
  { key: 'wealth', label: 'სიმდიდრე' },
  { key: 'division', label: 'დივიზიონი' },
];

function rankTiebreak(a: LeaderRow, b: LeaderRow) {
  if (b.level !== a.level) return b.level - a.level;
  if (b.xp !== a.xp) return b.xp - a.xp;
  return b.balance - a.balance;
}

function sortRows(rows: LeaderRow[], mode: SortMode): LeaderRow[] {
  const copy = [...rows];
  if (mode === 'wealth') {
    copy.sort((a, b) => b.balance - a.balance || rankTiebreak(a, b));
  } else if (mode === 'division') {
    copy.sort((a, b) => a.divisionId - b.divisionId || rankTiebreak(a, b));
  } else {
    copy.sort(rankTiebreak);
  }
  return copy;
}

export default async function PlayManagerLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager/leaderboard');

  const myTeam = await getTeam(user.id);
  if (!myTeam) redirect('/playmanager/create-team');

  const params = await searchParams;
  const sort: SortMode = params.sort === 'wealth' || params.sort === 'division' ? params.sort : 'level';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any;

  const { data: teamRows } = await admin.from('pm_teams').select('id,name,division_id,user_id');
  const teams = ((teamRows ?? []) as Array<{ id: string; name: string; division_id: number; user_id: string | null }>).filter(
    (t) => Boolean(t.user_id),
  );

  const userIds = [...new Set(teams.map((t) => t.user_id as string))];
  const teamIds = teams.map((t) => t.id);

  const [{ data: profileRows }, { data: walletRows }] = await Promise.all([
    admin.from('profiles').select('id,display_name,username,avatar_url,xp,level').in('id', userIds),
    admin.from('pm_wallets').select('team_id,balance').in('team_id', teamIds),
  ]);

  const profileMap = new Map(
    ((profileRows ?? []) as Array<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null; xp: number | null; level: number | null }>).map(
      (p) => [p.id, p],
    ),
  );
  const walletMap = new Map(
    ((walletRows ?? []) as Array<{ team_id: string; balance: number }>).map((w) => [w.team_id, w.balance]),
  );

  const rows: LeaderRow[] = teams.map((t) => {
    const profile = profileMap.get(t.user_id as string);
    return {
      teamId: t.id,
      teamName: t.name,
      divisionId: t.division_id,
      userId: t.user_id as string,
      displayName: profile?.display_name ?? profile?.username ?? 'მენეჯერი',
      username: profile?.username ?? 'manager',
      avatarUrl: profile?.avatar_url ?? null,
      level: profile?.level ?? 1,
      xp: profile?.xp ?? 0,
      balance: walletMap.get(t.id) ?? 0,
    };
  });

  const ranked = sortRows(rows, sort);
  const myRank = ranked.findIndex((r) => r.userId === user.id) + 1;
  const me = ranked.find((r) => r.userId === user.id);

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1160px] space-y-4">
        <PmCard>
          <PmCardHead
            icon={Trophy}
            title="ლიდერბორდი"
            subtitle="საუკეთესო მენეჯერები PlayManager-ში"
            right={me ? <PmPill tone="green">შენი ადგილი #{myRank}</PmPill> : undefined}
          />
          <div className="flex flex-wrap gap-2">
            {SORT_TABS.map((tab) => {
              const active = tab.key === sort;
              return (
                <Link
                  key={tab.key}
                  href={`/playmanager/leaderboard?sort=${tab.key}`}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black transition ${
                    active
                      ? 'border-emerald-300/40 bg-emerald-300/20 text-emerald-50 shadow-[0_0_14px_rgba(52,211,153,0.28)]'
                      : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-emerald-300/14 hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </PmCard>

        <PmCard>
          <div className="space-y-1.5">
            {ranked.map((row, index) => {
              const rank = index + 1;
              const isMe = row.userId === user.id;
              return (
                <Link
                  key={row.teamId}
                  href={`/playmanager/managers/${row.userId}`}
                  className={`group grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                    isMe
                      ? 'border-emerald-300/34 bg-emerald-300/[0.08]'
                      : 'border-white/8 bg-black/24 hover:border-emerald-300/24 hover:bg-white/[0.04]'
                  }`}
                >
                  <RankBadge rank={rank} />
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
                    {row.avatarUrl ? (
                      <Image src={row.avatarUrl} alt="" fill sizes="40px" className="object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm font-black text-white/70">
                        {row.displayName.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-black text-white">
                      <span className="truncate">{row.displayName}</span>
                      {isMe ? <span className="shrink-0 text-[9px] font-extrabold uppercase text-emerald-400">მე</span> : null}
                    </p>
                    <p className="truncate text-[11px] font-bold text-white/44">{row.teamName} · D{row.divisionId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PmPill tone={sort === 'division' ? 'green' : undefined}>
                      {DIVISION_LABELS[row.divisionId] ?? row.divisionId}
                    </PmPill>
                    {sort === 'wealth' ? (
                      <PmPill tone="green">
                        <Coins className="h-3.5 w-3.5" /> {formatGel(row.balance)}
                      </PmPill>
                    ) : (
                      <PmPill tone={sort === 'level' ? 'green' : undefined}>
                        <TrendingUp className="h-3.5 w-3.5" /> Lv {row.level}
                      </PmPill>
                    )}
                  </div>
                </Link>
              );
            })}
            {ranked.length === 0 ? (
              <p className="py-6 text-center text-sm font-bold text-white/40">ჯერ მენეჯერები არ არიან.</p>
            ) : null}
          </div>
        </PmCard>
      </div>
    </PlayManagerLightShell>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const tone =
      rank === 1
        ? 'border-amber-300/40 bg-amber-300/15 text-amber-100'
        : rank === 2
          ? 'border-slate-200/40 bg-slate-200/15 text-slate-100'
          : 'border-orange-300/40 bg-orange-300/15 text-orange-100';
    const Icon = rank === 1 ? Crown : Medal;
    return (
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-black text-white/55">
      {rank}
    </span>
  );
}
