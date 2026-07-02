import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Shield, Swords, UsersRound, CalendarDays, Award, User } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerAchievements, type AchievementMetrics } from '@/lib/playmanager/achievements';
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
  single: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
  maybeSingle: <T = unknown>() => Promise<{ data: T | null; error?: unknown }>;
};

type PlayManagerLooseDb = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  from: (table: string) => LooseQuery;
};

export default async function PlayManagerManagerPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id: managerId } = await props.params;
  const db = (await createSupabaseServerClient()) as unknown as PlayManagerLooseDb;

  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    redirect(`/auth/login?next=/playmanager/managers/${managerId}`);
  }

  const { data: profile } = await db
    .from('profiles')
    .select('id,display_name,username,avatar_url')
    .eq('id', managerId)
    .maybeSingle<ProfileRow>();

  if (!profile) {
    return <ManagerEmptyState />;
  }

  const { data: team } = await db
    .from('pm_teams')
    .select('id,name,division_id,user_id,created_at')
    .eq('user_id', managerId)
    .maybeSingle<TeamRow>();

  const isMe = managerId === userData.user.id;

  // Their metrics (drives the rating tile + head-to-head) and, when viewing
  // someone else, my own metrics so we can render a direct comparison.
  const theirMetrics = team ? (await getPlayManagerAchievements(team.id)).metrics : null;
  const myTeam = !isMe ? await getTeam(userData.user.id) : null;
  const myMetrics = myTeam ? (await getPlayManagerAchievements(myTeam.id)).metrics : null;
  const squadCount = theirMetrics?.squadSize ?? 0;

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <PmCard>
          <PmCardHead
            icon={User}
            title={profile.display_name ?? profile.username ?? 'უცნობი მენეჯერი'}
            subtitle={`@${profile.username ?? 'manager'} · მენეჯერი`}
            right={
              <div className="flex items-center gap-2">
                {isMe && <PmPill tone="green">ჩემი პროფილი</PmPill>}
                <Link
                  href="/playmanager/search?type=managers"
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/10 bg-black/44 px-4 text-sm font-black text-white/70 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  ძებნა
                </Link>
              </div>
            }
          />
        </PmCard>

        <PmCard>
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[28px] border-2 border-emerald-300/20 bg-white/5 shadow-2xl">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={profile.display_name ?? profile.username ?? 'Manager'} fill sizes="112px" className="object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-4xl font-black text-white/50">
                  {(profile.display_name ?? profile.username ?? 'M').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                {profile.display_name ?? profile.username ?? 'უცნობი მენეჯერი'}
              </h1>
              <p className="mt-2 text-sm font-bold text-white/50">
                @{profile.username ?? 'manager'}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
                <Link
                  href={`/profile/${profile.username}`}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black text-white transition hover:bg-white/10"
                >
                  <UsersRound className="mr-2 h-4 w-4 opacity-50" />
                  სოციალური პროფილი
                </Link>
              </div>
            </div>
          </div>
        </PmCard>

        {team ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile icon={<Shield className="h-4 w-4" />} label="გუნდი" value={team.name} hint={`დივიზიონი ${team.division_id}`} tone="green" />
            <StatTile icon={<Award className="h-4 w-4" />} label="დონე" value={`Lv ${theirMetrics?.level ?? 1}`} hint={`${(theirMetrics?.wins ?? 0).toLocaleString('ka-GE')} გამარჯვება`} />
            <StatTile icon={<UsersRound className="h-4 w-4" />} label="შემადგენლობა" value={String(squadCount)} hint={`საშ. OVR ${theirMetrics?.avgOvr ?? 0}`} />
            <StatTile
              icon={<CalendarDays className="h-4 w-4" />}
              label="დაარსება"
              value={new Date(team.created_at).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short' })}
              hint="რეგისტრაცია"
            />
          </div>
        ) : (
          <PmCard className="items-center py-10 text-center">
            <Shield className="mx-auto h-10 w-10 text-white/20" />
            <p className="mt-4 text-sm font-bold text-white/50">ამ მენეჯერს ჯერ არ შეუქმნია გუნდი.</p>
          </PmCard>
        )}

        {!isMe && team && theirMetrics && myMetrics ? (
          <HeadToHead theirName={profile.display_name ?? profile.username ?? 'მეტოქე'} mine={myMetrics} theirs={theirMetrics} />
        ) : null}
      </div>
    </PlayManagerLightShell>
  );
}

const H2H_ROWS: { label: string; key: keyof AchievementMetrics; fmt?: (v: number) => string }[] = [
  { label: 'დონე', key: 'level', fmt: (v) => `Lv ${v}` },
  { label: 'გამარჯვებები', key: 'wins' },
  { label: 'საშ. OVR', key: 'avgOvr' },
  { label: 'შემადგენლობა', key: 'squadSize' },
  { label: 'ბალანსი', key: 'balance', fmt: (v) => formatGel(v) },
  { label: 'დივიზიონი', key: 'divisionA', fmt: (v) => (v >= 1 ? 'A' : '—') },
];

function HeadToHead({ theirName, mine, theirs }: { theirName: string; mine: AchievementMetrics; theirs: AchievementMetrics }) {
  let meWins = 0;
  let themWins = 0;
  for (const row of H2H_ROWS) {
    const a = mine[row.key];
    const b = theirs[row.key];
    if (a > b) meWins += 1;
    else if (b > a) themWins += 1;
  }

  return (
    <PmCard>
      <PmCardHead
        icon={Swords}
        title="Head to Head"
        subtitle={`შენ vs ${theirName}`}
        right={<PmPill tone={meWins >= themWins ? 'green' : 'red'}>{meWins} : {themWins}</PmPill>}
      />
      <div className="space-y-1.5">
        {H2H_ROWS.map((row) => {
          const a = mine[row.key];
          const b = theirs[row.key];
          const fmt = row.fmt ?? ((v: number) => v.toLocaleString('ka-GE'));
          const meLeads = a > b;
          const themLead = b > a;
          return (
            <div key={row.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/8 bg-black/24 px-3 py-2.5">
              <p className={`text-right text-sm font-black tabular-nums ${meLeads ? 'text-emerald-300' : 'text-white/70'}`}>{fmt(a)}</p>
              <p className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{row.label}</p>
              <p className={`text-left text-sm font-black tabular-nums ${themLead ? 'text-emerald-300' : 'text-white/70'}`}>{fmt(b)}</p>
            </div>
          );
        })}
      </div>
    </PmCard>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  tone = 'grey',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: 'green' | 'grey';
}) {
  const border = tone === 'green' ? 'border-emerald-300/26' : 'border-white/8';
  const iconColor = tone === 'green' ? 'text-emerald-200/70' : 'text-white/40';
  return (
    <div className={`rounded-2xl border ${border} bg-black/40 p-4`}>
      <div className={`mb-2 flex items-center gap-2 ${iconColor}`}>
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <p className="truncate text-lg font-black text-white">{value}</p>
      <p className="mt-1 truncate text-xs font-bold text-white/30">{hint}</p>
    </div>
  );
}

function ManagerEmptyState() {
  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[900px]">
        <PmCard>
          <PmCardHead icon={User} title="მენეჯერი ვერ მოიძებნა" subtitle="მენეჯერის პროფილი" tone="red" />
          <p className="mx-auto max-w-xl text-center text-sm font-bold leading-7 text-white/50">
            ეს მენეჯერი ბაზაში არ არსებობს.
          </p>
          <Link
            href="/playmanager/search?type=managers"
            className="mx-auto inline-flex h-11 items-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-300/10 px-4 text-sm font-black text-emerald-100"
          >
            <ArrowLeft className="h-4 w-4" />
            ძებნაში დაბრუნება
          </Link>
        </PmCard>
      </div>
    </PlayManagerLightShell>
  );
}
