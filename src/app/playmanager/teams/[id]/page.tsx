import Link from 'next/link';
import { ArrowLeft, UsersRound, CalendarDays, Award, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
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

  return (
    <PlayManagerLightShell>
      <section className="relative overflow-hidden rounded-xl bg-[#020806]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.08),transparent_30%),linear-gradient(135deg,rgba(2,18,10,0.98),rgba(0,0,0,0.98)_64%)]" />
        </div>

        <div className="relative z-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/playmanager/search?type=teams"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-black/44 px-4 text-sm font-black text-white/70 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              ძებნაში დაბრუნება
            </Link>
            {isMe && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-400">
                ჩემი გუნდი
              </span>
            )}
          </div>

          <div className="mx-auto max-w-4xl">
            <div className="rounded-[32px] border border-emerald-300/14 bg-black/40 p-6 shadow-[inset_0_0_55px_rgba(16,185,129,0.04)] sm:p-8">
              <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border-2 border-emerald-300/20 bg-emerald-950/40 shadow-2xl">
                  <Shield className="h-12 w-12 text-emerald-400/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/60">
                    გუნდის პროფილი
                  </p>
                  <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl md:text-5xl">
                    {team.name}
                  </h1>
                  
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                        <Award className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-white/40">დივიზიონი</p>
                        <p className="truncate text-sm font-black text-white">Division {team.division_id}</p>
                      </div>
                    </div>
                    
                    <Link href={`/playmanager/managers/${team.user_id}`} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                        <UsersRound className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-white/40">მენეჯერი</p>
                        <p className="truncate text-sm font-black text-purple-300">{profile?.display_name ?? profile?.username ?? 'მენეჯერი'}</p>
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                        <CalendarDays className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-white/40">დარეგისტრირდა</p>
                        <p className="truncate text-sm font-black text-white">
                          {new Date(team.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-[32px] border border-white/10 bg-black/40 p-6 sm:p-8">
              <h2 className="mb-6 flex items-center gap-3 text-lg font-black text-white">
                <UsersRound className="h-5 w-5 text-emerald-400" />
                შემადგენლობა ({squadPlayers.length})
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {squadPlayers.map((player) => (
                  <Link
                    key={player.id}
                    href={`/playmanager/players/${player.id}`}
                    className="block rounded-2xl border border-white/8 bg-white/[0.03] p-3 transition hover:border-emerald-300/26 hover:bg-emerald-300/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{player.display_name}</p>
                        <p className="mt-1 truncate text-[11px] font-bold text-white/46">
                          {(player.primary_position ?? 'CM').toUpperCase()} · OVR {player.ovr_current} · {player.real_age ?? player.age} წელი
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-black text-emerald-100">
                        {formatGel(player.current_transfer_value_gel)}
                      </span>
                    </div>
                  </Link>
                ))}
                {squadPlayers.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm font-bold text-white/40">
                    ამ გუნდს ჯერ ფეხბურთელები არ ჰყავს.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
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
