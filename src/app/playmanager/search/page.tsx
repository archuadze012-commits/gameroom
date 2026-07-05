import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Search, Shield, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { PlayerFutCard } from '@/components/playmanager/player-fut-card';
import { buildPlayManagerPlayerCardLayout } from '@/lib/playmanager/player-card';
import type { PlayerCardStatsInput } from '@/lib/playmanager/player-card-stats';
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
  card_display_name: string | null;
  normalized_name: string;
  primary_position: string | null;
  nationality_code: string | null;
  card_image_url: string | null;
  card_stats: PlayerCardStatsInput | null;
  real_age: number | null;
  age: number;
  ovr_current: number;
  talent: number;
  current_transfer_value_gel: number;
  owner_id: string | null;
  card_sil_width: number | null;
  card_sil_height: number | null;
  card_sil_x: number | null;
  card_sil_y: number | null;
  card_sil_opacity: number | null;
  card_content_y: number | null;
  card_name_size: number | null;
  card_stats_scale: number | null;
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

  const admin = createSupabaseAdminClient();
  const searchTerm = q.replaceAll(',', ' ').replaceAll("'", '').trim();

  // Show welcome state if no query is entered and no explicit category tab is selected yet
  const showWelcome = !q && !params.type;

  let managerResults: Array<{ profile: ManagerRow; team: TeamRow }> = [];
  let teams: TeamRow[] = [];
  let players: PlayerRow[] = [];
  let totalCount = 0;
  let ownerTeamMap = new Map<string, string>();
  const hiddenOwnerTeams = new Set<string>();

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
        .select('id,display_name,card_display_name,normalized_name,primary_position,nationality_code,card_image_url,card_stats,real_age,age,ovr_current,talent,current_transfer_value_gel,owner_id,card_sil_width,card_sil_height,card_sil_x,card_sil_y,card_sil_opacity,card_content_y,card_name_size,card_stats_scale', { count: 'exact' })
        .order('ovr_current', { ascending: false });

      const res = await (searchTerm
        ? playerQuery.or(`display_name.ilike.%${searchTerm}%,normalized_name.ilike.%${searchTerm}%`).range(offset, offset + pageSize - 1)
        : playerQuery.range(offset, offset + pageSize - 1));

      players = (res.data ?? []) as PlayerRow[];
      totalCount = res.count ?? 0;

      if (players.length) {
        const ownerTeamIds = [...new Set(players.map((p: PlayerRow) => p.owner_id).filter((id: string | null): id is string => Boolean(id)))];
        if (ownerTeamIds.length) {
          const [{ data: ownerTeams }, { data: privacyRows }] = await Promise.all([
            admin.from('pm_teams').select('id,name').in('id', ownerTeamIds),
            admin.from('pm_team_privacy').select('team_id,hide_squad').in('team_id', ownerTeamIds),
          ]);
          // Teams that hide their squad (and aren't the viewer's own) get their
          // roster hidden here too: drop them from the name map (so the club name
          // falls back to a generic label) and collect them to mask player value.
          for (const p of (privacyRows ?? []) as Array<{ team_id: string; hide_squad: boolean }>) {
            if (p.hide_squad && p.team_id !== myTeam.id) hiddenOwnerTeams.add(p.team_id);
          }
          ownerTeamMap = new Map(
            ((ownerTeams ?? []) as Array<{ id: string; name: string }>)
              .filter((row) => !hiddenOwnerTeams.has(row.id))
              .map((row: { id: string; name: string }) => [row.id, row.name]),
          );
        }
      }
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1160px] space-y-4">
        <PmCard>
          <PmCardHead icon={Search} title="ძებნა" subtitle="მენეჯერები, გუნდები და ფეხბურთელები ერთ სივრცეში" />

          <form action="/playmanager/search" className="flex w-full flex-col gap-2 sm:flex-row">
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

          <div className="flex flex-wrap gap-2">
            {CATEGORY_ITEMS.map((item) => {
              const isActive = activeType === item.key;
              return (
                <Link
                  key={item.key}
                  href={`/playmanager/search?type=${item.key}&q=${q}`}
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-black transition-all ${
                    isActive
                      ? 'border-emerald-300/40 bg-emerald-300/20 text-emerald-50 shadow-[0_0_14px_rgba(52,211,153,0.28)]'
                      : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-emerald-300/14 hover:bg-[#071710] hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </PmCard>

        {showWelcome ? (
          <PmCard className="items-center py-16 text-center">
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
          </PmCard>
        ) : (
          <div className="space-y-4">
            {activeType === 'managers' && (
              <div>
                <SectionHeader icon={<Shield className="h-4 w-4" />} title="მენეჯერები" count={totalCount} />
                <div className={`mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 ${managerResults.length % 2 === 1 ? '[&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1' : ''}`}>
                  {managerResults.length ? managerResults.map(({ profile, team: managerTeam }) => (
                    <ManagerCard key={profile.id} profile={profile} team={managerTeam} isMe={profile.id === user.id} />
                  )) : <div className="col-span-full"><EmptyState q={q} /></div>}
                </div>
              </div>
            )}

            {activeType === 'teams' && (
              <div>
                <SectionHeader icon={<UsersRound className="h-4 w-4" />} title="გუნდები" count={totalCount} />
                <div className={`mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 ${teams.length % 2 === 1 ? '[&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1' : ''}`}>
                  {teams.length ? teams.map((row) => (
                    <TeamCard key={row.id} team={row} isMine={row.id === myTeam.id} />
                  )) : <div className="col-span-full"><EmptyState q={q} /></div>}
                </div>
              </div>
            )}

            {activeType === 'players' && (
              <div>
                <SectionHeader icon={<Search className="h-4 w-4" />} title="ფეხბურთელები" count={totalCount} />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {players.length ? players.map((player) => (
                    <PlayerCard key={player.id} player={player} ownerTeamMap={ownerTeamMap} valueHidden={Boolean(player.owner_id && hiddenOwnerTeams.has(player.owner_id))} />
                  )) : <EmptyState q={q} />}
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
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
    <Link href={`/playmanager/managers/${profile.id}`} className="block">
      <PmCard>
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
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-white flex items-center gap-1.5">
              <span className="truncate">{profile.display_name ?? profile.username ?? 'მენეჯერი'}</span>
              {isMe && <span className="shrink-0 text-[9px] text-emerald-400 font-extrabold uppercase">მე</span>}
            </p>
            <p className="truncate text-[11px] font-bold text-white/46">@{profile.username ?? 'manager'}</p>
          </div>
        </div>
        <div className="mt-auto">
          <PmPill tone={isMe ? 'green' : undefined}>{team.name} · D{team.division_id}</PmPill>
        </div>
      </PmCard>
    </Link>
  );
}

function TeamCard({ team, isMine }: { team: TeamRow; isMine?: boolean }) {
  return (
    <Link href={`/playmanager/teams/${team.id}`} className="block">
      <PmCard>
        <p className="flex items-center gap-1.5 text-sm font-black text-white">
          <span className="truncate">{team.name}</span>
          {isMine && <span className="shrink-0 text-[9px] text-emerald-400 font-extrabold uppercase">ჩემი</span>}
        </p>
        <div className="mt-auto">
          <PmPill tone={isMine ? 'green' : undefined}>D{team.division_id}</PmPill>
        </div>
      </PmCard>
    </Link>
  );
}

function PlayerCard({ player, ownerTeamMap, valueHidden }: { player: PlayerRow; ownerTeamMap: Map<string, string>; valueHidden: boolean }) {
  const position = (player.primary_position ?? 'CM').toUpperCase();

  return (
    <Link href={`/playmanager/players/${player.id}`} className="group block">
      <PmCard>
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-[138px] w-[101px] shrink-0 overflow-visible">
            <div className="origin-top-left scale-[0.4]">
              <PlayerFutCard
                name={player.display_name}
                labelOverride={player.card_display_name}
                position={position}
                ovr={player.ovr_current}
                talent={player.talent}
                stats={player.card_stats}
                imageUrl={player.card_image_url}
                nationalityCode={player.nationality_code}
                editorConfig={buildPlayManagerPlayerCardLayout(player)}
                availability="ready"
              />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-black text-white transition group-hover:text-emerald-100">{player.display_name}</p>
            <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.1em] text-white/44">
              {player.real_age ?? player.age} წლის · {player.owner_id ? ownerTeamMap.get(player.owner_id) ?? 'კლუბშია' : 'თავისუფალი აგენტი'}
            </p>
            <p className="mt-3">
              <PmPill tone="green">{valueHidden ? '🔒' : formatGel(player.current_transfer_value_gel)}</PmPill>
            </p>
          </div>
        </div>
      </PmCard>
    </Link>
  );
}
