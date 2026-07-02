import Link from 'next/link';
import { ArrowLeft, UsersRound, CalendarDays, Award, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatGel } from '@/lib/playmanager/economy';

export const dynamic = 'force-dynamic';

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  division_id: number;
  user_id: string;
  created_at: string;
};

type LooseQuery = {
  select: (columns: string, options?: { count?: 'exact'; head?: boolean }) => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  in: (column: string, values: unknown[]) => LooseQuery;
  order: (column: string, options?: { ascending?: boolean }) => LooseQuery;
  maybeSingle: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
};

type PlayManagerLooseDb = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => LooseQuery;
};

type SquadPlayerRow = {
  id: string;
  display_name: string;
  primary_position: string | null;
  ovr_current: number;
  age: number;
  real_age: number | null;
  current_transfer_value_gel: number;
};

export default async function PlayManagerTeamPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id: teamId } = await props.params;
  const db = (await createSupabaseServerClient()) as unknown as PlayManagerLooseDb;

  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    redirect(`/auth/login?next=/playmanager/teams/${teamId}`);
  }

  const { data: team } = await db
    .from('pm_teams')
    .select('id,name,division_id,user_id,created_at')
    .eq('id', teamId)
    .maybeSingle<TeamRow>();

  if (!team) {
    return <TeamEmptyState />;
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id,display_name,username,avatar_url')
    .eq('id', team.user_id)
    .maybeSingle<ProfileRow>();

  const { data: squadRefs } = await (db
    .from('pm_squads')
    .select('player_id')
    .eq('team_id', team.id) as unknown as Promise<{ data: Array<{ player_id: string }> | null }>);

  let squadPlayers: SquadPlayerRow[] = [];
  if (squadRefs && squadRefs.length > 0) {
    const playerIds = (squadRefs as Array<{ player_id: string }>).map((s: { player_id: string }) => s.player_id);
    const { data: players } = await (db
      .from('pm_players')
      .select('id,display_name,primary_position,ovr_current,age,real_age,current_transfer_value_gel')
      .in('id', playerIds)
      .order('ovr_current', { ascending: false }) as unknown as Promise<{ data: SquadPlayerRow[] | null }>);
    if (players) {
      squadPlayers = players;
    }
  }

  const isMe = team.user_id === userData.user.id;

  const avgOvr = squadPlayers.length
    ? Math.round(squadPlayers.reduce((sum, p) => sum + p.ovr_current, 0) / squadPlayers.length)
    : 0;
  const squadValue = squadPlayers.reduce((sum, p) => sum + p.current_transfer_value_gel, 0);

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1160px] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/playmanager/search?type=teams"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-3 text-xs font-black text-white/70 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            ძებნაში დაბრუნება
          </Link>
          {isMe && <PmPill tone="green">ჩემი გუნდი</PmPill>}
        </div>

        {/* ── TEAM IDENTITY ── */}
        <PmCard>
          <PmCardHead
            icon={Shield}
            title={team.name}
            subtitle="გუნდის პროფილი"
            right={<PmPill tone="green">D{team.division_id}</PmPill>}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/24 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <Award className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/40">დივიზიონი</p>
                <p className="truncate text-sm font-black text-white">Division {team.division_id}</p>
              </div>
            </div>

            <Link
              href={`/playmanager/managers/${team.user_id}`}
              className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/24 p-3 transition hover:border-emerald-300/24 hover:bg-white/[0.04]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <UsersRound className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/40">მენეჯერი</p>
                <p className="truncate text-sm font-black text-emerald-200">{profile?.display_name ?? profile?.username ?? 'მენეჯერი'}</p>
              </div>
            </Link>

            <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/24 p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/18 bg-emerald-300/10 text-emerald-100">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-white/40">დარეგისტრირდა</p>
                <p className="truncate text-sm font-black text-white">
                  {new Date(team.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </PmCard>

        {/* ── SQUAD ── */}
        <PmCard>
          <PmCardHead icon={UsersRound} title="შემადგენლობა" subtitle={`${squadPlayers.length} ფეხბურთელი`} />
          <div className="grid grid-cols-3 gap-2">
            <NestedMiniBox label="მოთამაშეები" value={String(squadPlayers.length)} />
            <NestedMiniBox label="საშ. OVR" value={String(avgOvr)} />
            <NestedMiniBox label="ღირებულება" value={formatGel(squadValue)} />
          </div>
          {squadPlayers.length === 0 ? (
            <p className="py-6 text-center text-sm font-bold text-white/40">ამ გუნდს ჯერ ფეხბურთელები არ ჰყავს.</p>
          ) : (
            <div className="space-y-1.5">
              {squadPlayers.map((player) => (
                <Link
                  key={player.id}
                  href={`/playmanager/players/${player.id}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-black/24 px-3 py-2.5 transition hover:border-emerald-300/24 hover:bg-white/[0.04]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white transition group-hover:text-emerald-100">{player.display_name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-white/44">
                      <span className="rounded border border-white/12 bg-white/[0.05] px-1.5 py-px text-[10px] font-black tracking-wide text-white/65">
                        {(player.primary_position ?? 'CM').toUpperCase()}
                      </span>
                      OVR {player.ovr_current} · {player.real_age ?? player.age} წელი
                    </p>
                  </div>
                  <PmPill tone="green">{formatGel(player.current_transfer_value_gel)}</PmPill>
                </Link>
              ))}
            </div>
          )}
        </PmCard>
      </div>
    </PlayManagerLightShell>
  );
}

function TeamEmptyState() {
  return (
    <PlayManagerLightShell>
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <Shield className="mb-4 h-16 w-16 text-white/10" />
        <h2 className="text-xl font-black text-white">გუნდი ვერ მოიძებნა</h2>
        <p className="mt-2 text-sm font-bold text-white/40">
          შესაძლოა ბმული არასწორია ან გუნდი წაიშალა.
        </p>
        <Link
          href="/playmanager/search"
          className="mt-6 rounded-2xl bg-emerald-500/20 px-6 py-3 text-sm font-black text-emerald-400 transition hover:bg-emerald-500/30"
        >
          ძებნაში დაბრუნება
        </Link>
      </div>
    </PlayManagerLightShell>
  );
}
