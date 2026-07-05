import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { Bracket } from '@/components/tournament/bracket';
import type { BracketMatch } from '@/lib/tournament/generate-bracket';
import { joinCupAction } from '@/app/playmanager/actions/competition-actions';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import {
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  Coins,
  Shield,
  Sparkles,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { formatGel } from '@/lib/playmanager/economy';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead } from '@/components/playmanager/pm-cards';

export const dynamic = 'force-dynamic';

type TeamRef = {
  id: string;
  name: string;
} | null;

type CupTemplateRow = {
  id: string;
  name: string;
  prize_pool: number;
  entry_fee: number;
  max_teams: number;
  schedule_type: string | null;
};

type CupInstanceRow = {
  id: string;
  status: 'registration' | 'in_progress' | 'completed';
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type CupParticipantRow = {
  team_id: string;
  pm_teams: { name: string } | Array<{ name: string }> | null;
};

type CupMatchListRow = {
  id: string;
  round: number;
  position: number;
  score1: number | null;
  score2: number | null;
  status: string;
  start_time: string | null;
  winner_id: string | null;
  team1: TeamRef | TeamRef[];
  team2: TeamRef | TeamRef[];
};

export default async function CupPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cupId = params.id;
  await processDueCupMatches();

  const db = await createSupabaseServerClient();

  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    redirect('/auth/login');
  }

  const teamData = await getTeam(userData.user.id);
  if (!teamData) {
    redirect('/playmanager');
  }

  // Fetch the cup template
  const { data: templateRow } = await db
    .from('pm_cup_templates')
    .select('*')
    .eq('id', cupId)
    .single();
  const template = templateRow as CupTemplateRow | null;

  if (!template) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center text-white/50">
        <Trophy className="mb-4 h-12 w-12 opacity-50" />
        <h1 className="text-xl font-black">თასი ვერ მოიძებნა</h1>
        <Link href="/playmanager" className="mt-4 text-emerald-400 hover:underline">
          უკან დაბრუნება
        </Link>
      </div>
    );
  }

  // Fetch the most recent instance for this cup
  const { data: instanceList } = await db
    .from('pm_cup_instances')
    .select('*')
    .eq('template_id', cupId)
    .order('created_at', { ascending: false })
    .limit(1)
    .returns<CupInstanceRow[]>();

  const instance = instanceList?.[0];

  if (!instance) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center text-white/50">
        <Trophy className="mb-4 h-12 w-12 opacity-50" />
        <h1 className="text-xl font-black">{template.name}</h1>
        <p className="mt-2 text-sm">აქტიური ტურნირი არ არის.</p>
        <Link href="/playmanager" className="mt-4 text-emerald-400 hover:underline">
          უკან დაბრუნება
        </Link>
      </div>
    );
  }

  // Fetch participants
  const { data: participants } = await db
    .from('pm_cup_participants')
    .select('team_id, pm_teams(name)')
    .eq('cup_instance_id', instance.id)
    .returns<CupParticipantRow[]>();

  // Fetch matches
  const { data: dbMatches } = await db
    .from('pm_cup_matches')
    .select(`
      id, round, position, score1, score2, status, start_time, winner_id,
      team1:pm_teams!team1_id(id, name),
      team2:pm_teams!team2_id(id, name)
    `)
    .eq('cup_instance_id', instance.id)
    .order('round', { ascending: true })
    .order('position', { ascending: true })
    .returns<CupMatchListRow[]>();

  const bracketMatches: BracketMatch[] = (dbMatches || []).map((m) => {
    const team1 = normalizeTeamRef(m.team1);
    const team2 = normalizeTeamRef(m.team2);
    const player1 = team1 ? { id: team1.id, name: team1.name, seed: m.position * 2 - 1 } : null;
    const player2 = team2 ? { id: team2.id, name: team2.name, seed: m.position * 2 } : null;
    const winner =
      m.winner_id && player1?.id === m.winner_id
        ? player1
        : m.winner_id && player2?.id === m.winner_id
          ? player2
          : null;

    return {
    round: m.round,
    position: m.position,
    player1,
    player2,
    winner,
    score1: m.score1 ?? undefined,
    score2: m.score2 ?? undefined,
    status: m.status as BracketMatch['status'],
    };
  });

  const isRegistration = instance.status === 'registration';
  const participantCount = participants?.length ?? 0;
  const isRegistered = (participants || []).some((participant) => participant.team_id === teamData.id);
  const isFull = participantCount >= template.max_teams;
  const entryFeeLabel = template.entry_fee > 0 ? formatGel(template.entry_fee) : 'უფასო';
  const readyMatches = (dbMatches || []).filter((match) => match.status === 'ready').length;
  const completedMatches = (dbMatches || []).filter((match) => match.status === 'completed').length;
  const nextMatch = (dbMatches || []).find((match) => {
    const team1 = normalizeTeamRef(match.team1);
    const team2 = normalizeTeamRef(match.team2);
    return match.status !== 'completed' && team1 && team2;
  });
  const userMatch = (dbMatches || []).find((match) => {
    const team1 = normalizeTeamRef(match.team1);
    const team2 = normalizeTeamRef(match.team2);
    if (match.status === 'completed' || !team1 || !team2) return false;
    return team1.id === teamData.id || team2.id === teamData.id;
  });
  const userMatchTeam1 = normalizeTeamRef(userMatch?.team1 ?? null);
  const userMatchTeam2 = normalizeTeamRef(userMatch?.team2 ?? null);
  const userOpponent = userMatchTeam1?.id === teamData.id ? userMatchTeam2 : userMatchTeam1;
  const joinCurrentCup = async () => {
    'use server';
    await joinCupAction(instance.id);
    revalidatePath('/playmanager');
    revalidatePath(`/playmanager/cups/${cupId}`);
  };

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-4 px-4 sm:px-0">
        {/* Header Card */}
        <PmCard className="!p-4 sm:!p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/playmanager/cups"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]"
            >
              <ChevronLeft className="h-4 w-4" /> უკან
            </Link>
          </div>
          <PmCardHead icon={Trophy} title={template.name} subtitle="ტურნირის დეტალები" tone="green" />
        </PmCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CupStat icon={<Trophy className="h-4 w-4" />} label="საპრიზო ფონდი" value={formatGel(template.prize_pool)} tone="gold" />
              <CupStat icon={<Coins className="h-4 w-4" />} label="შესვლა" value={entryFeeLabel} tone="green" />
              <CupStat icon={<UsersRound className="h-4 w-4" />} label="მონაწილეები" value={`${participantCount}/${template.max_teams}`} tone="green" />
              <CupStat icon={<CalendarClock className="h-4 w-4" />} label="ფორმატი" value={template.schedule_type === 'auto_fill' ? 'Auto-fill' : 'Daily'} tone="red" />
            </div>

            {isRegistration ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                {/* Join Cup Card */}
                <PmCard className="flex flex-col justify-between !p-4 sm:!p-6 text-center">
                  <div className="flex flex-col items-center">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-black text-white">შესვლა თასზე</h3>
                  </div>
                  <form action={joinCurrentCup} className="mt-6">
                    <button
                      type="submit"
                      disabled={isRegistered || isFull}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200/28 bg-emerald-300 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/38"
                    >
                      {isRegistered ? 'რეგისტრირებული ხარ' : isFull ? 'შევსებულია' : `მონაწილეობა · ${entryFeeLabel}`}
                      {!isRegistered && !isFull && <ArrowRight className="h-4 w-4" />}
                    </button>
                  </form>
                </PmCard>

                <ParticipantsPanel participants={participants || []} maxTeams={template.max_teams} />
              </div>
            ) : (
              <div className="space-y-4">
                {userMatch && userOpponent ? (
                  <Link
                    href={`/playmanager/cups/${cupId}/matches/${userMatch.id}`}
                    className="group flex flex-col gap-4 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 transition hover:border-emerald-200/42 hover:bg-emerald-300/14 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200/70">
                        შენი შემდეგი მატჩი
                      </p>
                      <h2 className="mt-2 text-xl font-black text-white">
                        Round {userMatch.round} · {userOpponent.name}
                      </h2>
                    </div>
                    <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-300 px-5 py-3 text-sm font-black text-black">
                      მატჩის გახსნა
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ) : (
                  <PmCard className="!p-4 sm:!p-6">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-white/38">შემდეგი მატჩი</p>
                    <h2 className="mt-2 text-lg font-black text-white">
                      {nextMatch ? `Round ${nextMatch.round}` : 'მატჩი ჯერ არ არის მზად'}
                    </h2>
                  </PmCard>
                )}

                <PmCard className="!p-4 sm:!p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-black text-white">სატურნირო ბადე</h2>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/48">
                      {completedMatches} დასრულდა · {readyMatches} მზადაა
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-white/5 bg-black/20 p-3 scrollbar-none">
                    <Bracket matches={bracketMatches} />
                  </div>
                </PmCard>
              </div>
            )}
          </div>

          <aside className="space-y-3">
            <PmCard className="!p-3 sm:!p-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-white">
                <Shield className="h-4 w-4 text-emerald-400" /> თასის წესები
              </h3>
              <div className="mt-3 space-y-1">
                <RuleRow label="ფორმატი" value="Single elimination" />
                <RuleRow label="რაუნდი" value="10 წუთიანი cadence" />
                <RuleRow label="საპრიზო" value={formatGel(template.prize_pool)} />
                <RuleRow label="შესვლა" value={entryFeeLabel} />
              </div>
            </PmCard>

          </aside>
        </div>
      </div>
    </PlayManagerLightShell>
  );
}

function normalizeTeamRef(team: TeamRef | TeamRef[] | undefined | null) {
  return Array.isArray(team) ? team[0] ?? null : team ?? null;
}

function getParticipantName(team: CupParticipantRow['pm_teams']) {
  if (Array.isArray(team)) return team[0]?.name ?? 'უცნობი';
  return team?.name ?? 'უცნობი';
}



function CupStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  // `tone` is accepted by callers but not yet used for styling.
  tone?: 'green' | 'red' | 'gold';
}) {
  return (
    <PmCard className="flex flex-col justify-center items-center !p-3 sm:!p-5 text-center min-h-[84px]">
      <p className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
        {icon}
        {label}
      </p>
      <strong className="mt-1.5 block w-full truncate text-base font-black text-white">{value}</strong>
    </PmCard>
  );
}

function ParticipantsPanel({
  participants,
  maxTeams,
}: {
  participants: CupParticipantRow[];
  maxTeams: number;
}) {
  const emptySlots = Array.from({ length: Math.max(0, maxTeams - participants.length) });

  const progressPercent = Math.min(100, Math.round((participants.length / Math.max(1, maxTeams)) * 100));
  return (
    <PmCard className="flex-1 !p-4 sm:!p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-white">დარეგისტრირებული</h3>
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/50">
          {participants.length}/{maxTeams}
        </span>
      </div>

      <div className="mb-4">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {participants.map((participant, index) => (
          <div key={participant.team_id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xs font-black text-white/70">
              {index + 1}
            </span>
            <span className="truncate text-sm font-black text-white">{getParticipantName(participant.pm_teams)}</span>
          </div>
        ))}
        {emptySlots.map((_, index) => (
          <div key={`empty-${index}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] px-3 py-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-white/[0.03] text-xs font-black text-white/24">
              {participants.length + index + 1}
            </span>
            <span className="text-sm font-black text-white/28">თავისუფალი</span>
          </div>
        ))}
      </div>
    </PmCard>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.01] px-2 py-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/34">{label}</span>
      <strong className="text-xs font-black text-white">{value}</strong>
    </div>
  );
}

