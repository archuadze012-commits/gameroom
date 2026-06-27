import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, Shield, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PlayerFutCard } from '@/components/playmanager/player-fut-card';
import { formatGel } from '@/lib/playmanager/economy';
import { getTeam } from '@/lib/playmanager/team';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; type?: string; page?: string }>;

type ManagerRow = {
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
};

type PlayerRow = {
  id: string;
  display_name: string;
  normalized_name: string;
  primary_position: string | null;
  card_image_url: string | null;
  real_age: number | null;
  age: number;
  ovr_current: number;
  talent: number;
  current_transfer_value_gel: number;
  owner_id: string | null;
};

const CATEGORY_ITEMS = [
  { key: 'managers', label: 'მენეჯერები' },
  { key: 'teams', label: 'გუნდები' },
  { key: 'players', label: 'ფეხბურთელები' },
] as const;

export default async function PlayManagerSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/playmanager/search');

  const myTeam = await getTeam(user.id);
  if (!myTeam) redirect('/playmanager/create-team');

  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const activeType = params.type ?? 'managers';
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const admin = createSupabaseAdminClient() as any;
  const searchTerm = q.replaceAll(',', ' ').replaceAll("'", '').trim();

  // Show welcome state if no query is entered and no explicit category tab is selected yet
  const showWelcome = !q && !params.type;

  let managerResults: Array<{ profile: ManagerRow; team: TeamRow }> = [];
  let teams: TeamRow[] = [];
  let players: PlayerRow[] = [];
  let totalCount = 0;
  let ownerTeamMap = new Map<string, string>();

  if (!showWelcome) {
    if (activeType === 'managers') {
      if (searchTerm) {
        // Search matching profiles first
        const profilesRes = await admin
          .from('profiles')
          .select('id,display_name,username,avatar_url')
          .or(`display_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`);

        const matchedProfiles = (profilesRes.data ?? []) as ManagerRow[];
        if (matchedProfiles.length) {
          const profileIds = matchedProfiles.map((p: ManagerRow) => p.id);
          // Get teams for these profiles (only active managers have teams)
          const teamsRes = await admin
            .from('pm_teams')
            .select('id,name,division_id,user_id', { count: 'exact' })
            .in('user_id', profileIds);

          const teamMap = new Map<string, TeamRow>();
          ((teamsRes.data ?? []) as TeamRow[]).forEach((t: TeamRow) => teamMap.set(t.user_id, t));

          const allResults = matchedProfiles
            .filter((p: ManagerRow) => teamMap.has(p.id))
            .map((p: ManagerRow) => ({
              profile: p,
              team: teamMap.get(p.id)!,
            }));

          totalCount = allResults.length;
          managerResults = allResults.slice(offset, offset + pageSize);
        }
      } else {
        // Browse: Query pm_teams directly first to ensure we get active managers
        const teamsRes = await admin
          .from('pm_teams')
          .select('id,name,division_id,user_id', { count: 'exact' })
          .order('division_id', { ascending: true })
          .range(offset, offset + pageSize - 1);

        const activeTeams = (teamsRes.data ?? []) as TeamRow[];
        totalCount = teamsRes.count ?? 0;

        if (activeTeams.length) {
          const userIds = activeTeams
            .map((t: TeamRow) => t.user_id)
            .filter((id: string): id is string => Boolean(id));
          const profilesRes = await admin
            .from('profiles')
            .select('id,display_name,username,avatar_url')
            .in('id', userIds);

          const profileMap = new Map<string, ManagerRow>();
          ((profilesRes.data ?? []) as ManagerRow[]).forEach((p: ManagerRow) => profileMap.set(p.id, p));

          managerResults = activeTeams
            .filter((t: TeamRow) => profileMap.has(t.user_id))
            .map((t: TeamRow) => ({
              profile: profileMap.get(t.user_id)!,
              team: t,
            }));
        }
      }
    } else if (activeType === 'teams') {
      const teamQuery = admin
        .from('pm_teams')
        .select('id,name,division_id,user_id', { count: 'exact' })
        .order('division_id', { ascending: true });

      const res = await (searchTerm
        ? teamQuery.ilike('name', `%${searchTerm}%`).range(offset, offset + pageSize - 1)
        : teamQuery.range(offset, offset + pageSize - 1));

      teams = (res.data ?? []) as TeamRow[];
      totalCount = res.count ?? 0;
    } else if (activeType === 'players') {
      const playerQuery = admin
        .from('pm_players')
        .select('id,display_name,normalized_name,primary_position,card_image_url,real_age,age,ovr_current,talent,current_transfer_value_gel,owner_id', { count: 'exact' })
        .order('ovr_current', { ascending: false });

      const res = await (searchTerm
        ? playerQuery.or(`display_name.ilike.%${searchTerm}%,normalized_name.ilike.%${searchTerm}%`).range(offset, offset + pageSize - 1)
        : playerQuery.range(offset, offset + pageSize - 1));

      players = (res.data ?? []) as PlayerRow[];
      totalCount = res.count ?? 0;

      if (players.length) {
        const ownerTeamIds = [...new Set(players.map((p: PlayerRow) => p.owner_id).filter((id: string | null): id is string => Boolean(id)))];
        if (ownerTeamIds.length) {
          const { data: ownerTeams } = await admin.from('pm_teams').select('id,name').in('id', ownerTeamIds);
          ownerTeamMap = new Map(((ownerTeams ?? []) as Array<{ id: string; name: string }>).map((row: { id: string; name: string }) => [row.id, row.name]));
        }
      }
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <PlayManagerLightShell>
      <section className="relative overflow-hidden rounded-xl bg-[#020806]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(34,197,94,0.16),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_30%),linear-gradient(135deg,rgba(2,18,10,0.98),rgba(0,0,0,0.98)_64%)]" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/70">Search hub</p>
              <h1 className="mt-2 flex items-center gap-3 text-3xl font-black leading-none text-white sm:text-4xl">
                <Search className="h-7 w-7 text-emerald-300" />
                ძებნა
              </h1>
              <p className="mt-2 text-sm font-bold text-white/52">მენეჯერები, გუნდები და ფეხბურთელები ერთ სივრცეში</p>
            </div>

            <form action="/playmanager/search" className="flex w-full max-w-[420px] gap-2">
              <input type="hidden" name="type" defaultValue={activeType} />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="მოძებნე სახელი..."
                className="h-12 flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/34"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-emerald-300/18 bg-emerald-300/12 px-4 text-sm font-black text-white transition hover:bg-emerald-300/18"
              >
                ძებნა
              </button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORY_ITEMS.map((item) => {
              const isActive = activeType === item.key;
              return (
                <Link
                  key={item.key}
                  href={`/playmanager/search?type=${item.key}&q=${q}`}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black transition-all ${
                    isActive
                      ? 'border-emerald-300/30 bg-emerald-300/18 text-white shadow-[0_0_12px_rgba(52,211,153,0.18)]'
                      : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-emerald-300/14 hover:bg-[#071710] hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {showWelcome ? (
            <div className="mt-8 rounded-2xl border border-dashed border-emerald-500/20 bg-[#04140c]/40 px-6 py-16 text-center">
              <Search className="mx-auto h-12 w-12 text-emerald-400/60" />
              <h3 className="mt-4 text-lg font-black text-white">საძიებო ჰაბი</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/52">
                შეიყვანეთ საძიებო სიტყვა მენეჯერების, გუნდების და ფეხბურთელების მოსაძებნად, ან აირჩიეთ კატეგორია სიის სანახავად.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/playmanager/search?type=managers&q=${q}`}
                  className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-black text-white transition hover:bg-white/8"
                >
                  მენეჯერების ბრაუზი
                </Link>
                <Link
                  href={`/playmanager/search?type=teams&q=${q}`}
                  className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-black text-white transition hover:bg-white/8"
                >
                  გუნდების ბრაუზი
                </Link>
                <Link
                  href={`/playmanager/search?type=players&q=${q}`}
                  className="rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2 text-xs font-black text-white transition hover:bg-white/8"
                >
                  ფეხბურთელების ბრაუზი
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              {activeType === 'managers' && (
                <div className="rounded-2xl border border-white/8 bg-black/34 p-4">
                  <SectionHeader icon={<Shield className="h-4 w-4" />} title="მენეჯერები" count={totalCount} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {managerResults.length ? managerResults.map(({ profile, team: managerTeam }) => (
                      <ManagerCard key={profile.id} profile={profile} team={managerTeam} isMe={profile.id === user.id} />
                    )) : <EmptyState q={q} />}
                  </div>
                </div>
              )}

              {activeType === 'teams' && (
                <div className="rounded-2xl border border-white/8 bg-black/34 p-4">
                  <SectionHeader icon={<UsersRound className="h-4 w-4" />} title="გუნდები" count={totalCount} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {teams.length ? teams.map((row) => (
                      <TeamCard key={row.id} team={row} isMine={row.id === myTeam.id} />
                    )) : <EmptyState q={q} />}
                  </div>
                </div>
              )}

              {activeType === 'players' && (
                <div className="border-t border-white/8 pt-5">
                  <SectionHeader icon={<Search className="h-4 w-4" />} title="ფეხბურთელები" count={totalCount} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {players.length ? players.map((player) => (
                      <PlayerCard key={player.id} player={player} ownerTeamMap={ownerTeamMap} />
                    )) : <EmptyState q={q} />}
                  </div>
                </div>
              )}

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <Link
                    href={`/playmanager/search?type=${activeType}&q=${q}&page=${page - 1}`}
                    className={`inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-xs font-black text-white transition ${
                      page <= 1 ? 'pointer-events-none opacity-40' : 'bg-white/[0.04] hover:bg-white/10'
                    }`}
                  >
                    უკან
                  </Link>
                  <span className="text-xs font-bold text-white/60">
                    გვერდი {page} / {totalPages}
                  </span>
                  <Link
                    href={`/playmanager/search?type=${activeType}&q=${q}&page=${page + 1}`}
                    className={`inline-flex h-10 items-center justify-center rounded-xl border border-white/10 px-4 text-xs font-black text-white transition ${
                      page >= totalPages ? 'pointer-events-none opacity-40' : 'bg-white/[0.04] hover:bg-white/10'
                    }`}
                  >
                    წინ
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </PlayManagerLightShell>
  );
}

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-300/16 bg-emerald-300/10 text-emerald-100">
          {icon}
        </span>
        <p className="text-lg font-black text-white">{title}</p>
      </div>
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-white/54">
        {count}
      </span>
    </div>
  );
}

function EmptyState({ q }: { q: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-black/24 px-4 py-6 text-center text-sm font-bold text-white/38">
      {q ? 'შედეგი ვერ მოიძებნა' : 'ჯერ ჩანაწერი არ არის'}
    </div>
  );
}

function ManagerCard({ profile, team, isMe }: { profile: ManagerRow; team: TeamRow; isMe?: boolean }) {
  return (
    <Link 
      href={`/playmanager/managers/${profile.id}`}
      className={`block rounded-2xl border p-3 transition-all ${
      isMe 
        ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-400/60' 
        : 'border-white/8 bg-white/[0.03] hover:border-emerald-300/26 hover:bg-emerald-300/[0.06]'
    }`}>
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.display_name ?? profile.username ?? 'Manager'} fill sizes="44px" className="object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-black text-white/70">
              {(profile.display_name ?? profile.username ?? 'M').slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-white flex items-center gap-1.5">
            <span className="truncate">{profile.display_name ?? profile.username ?? 'მენეჯერი'}</span>
            {isMe && <span className="shrink-0 text-[9px] text-emerald-400 font-extrabold uppercase">მე</span>}
          </p>
          <p className="truncate text-[11px] font-bold text-white/46">@{profile.username ?? 'manager'}</p>
        </div>
      </div>
      <p className="mt-3 truncate text-[11px] font-bold text-emerald-100/70">{team.name} · D{team.division_id}</p>
    </Link>
  );
}

function TeamCard({ team, isMine }: { team: TeamRow; isMine?: boolean }) {
  return (
    <Link 
      href={`/playmanager/teams/${team.id}`}
      className={`block rounded-2xl border p-3 transition-all hover:bg-white/[0.06] ${
        isMine 
          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
          : 'border-white/8 bg-white/[0.03]'
      }`}
    >
      <p className="flex items-center gap-1.5 text-sm font-black text-white">
        <span className="truncate">{team.name}</span>
        {isMine && <span className="shrink-0 text-[9px] text-emerald-400 font-extrabold uppercase">ჩემი</span>}
      </p>
      <p className="mt-2 truncate text-[11px] font-bold text-white/46">D{team.division_id}</p>
    </Link>
  );
}

function PlayerCard({ player, ownerTeamMap }: { player: PlayerRow; ownerTeamMap: Map<string, string> }) {
  const position = (player.primary_position ?? 'CM').toUpperCase();

  return (
    <Link
      href={`/playmanager/players/${player.id}`}
      className="group flex min-w-0 items-center gap-3 border-b border-white/8 py-3 transition hover:border-emerald-300/30 hover:bg-emerald-300/[0.035]"
    >
      <div className="h-[138px] w-[101px] shrink-0 overflow-visible">
        <div className="origin-top-left scale-[0.4]">
          <PlayerFutCard
            name={player.display_name}
            position={position}
            ovr={player.ovr_current}
            talent={player.talent}
            imageUrl={player.card_image_url}
            availability="ready"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-black text-white transition group-hover:text-emerald-100">{player.display_name}</p>
        <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.1em] text-white/44">
          {player.real_age ?? player.age} წლის · {player.owner_id ? ownerTeamMap.get(player.owner_id) ?? 'კლუბშია' : 'თავისუფალი აგენტი'}
        </p>
        <p className="mt-3 text-sm font-black text-emerald-100/86">
          {formatGel(player.current_transfer_value_gel)}
        </p>
      </div>
    </Link>
  );
}
