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
  CircleCheck,
  Coins,
  Shield,
  Sparkles,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react';
import { formatGel } from '@/lib/playmanager/economy';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';

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
  const slotsLeft = Math.max(0, template.max_teams - participantCount);
  const isRegistered = (participants || []).some((participant) => participant.team_id === teamData.id);
  const isFull = participantCount >= template.max_teams;
  const entryFeeLabel = template.entry_fee > 0 ? formatGel(template.entry_fee) : 'უფასო';
  const progressPercent = Math.min(100, Math.round((participantCount / Math.max(1, template.max_teams)) * 100));
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
      <section className="relative overflow-hidden rounded-xl bg-[#020806]/90 p-4 shadow-[0_28px_100px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(34,197,94,0.22),transparent_28%),radial-gradient(circle_at_88%_38%,rgba(127,29,29,0.28),transparent_34%),linear-gradient(135deg,rgba(2,18,10,0.98),rgba(0,0,0,0.98)_58%,rgba(23,7,7,0.9))]" />
          <div className="absolute inset-x-[8%] top-[19%] h-[58%] rounded-[28px] border border-emerald-200/10 bg-[repeating-linear-gradient(90deg,rgba(22,101,52,0.16)_0_58px,rgba(4,16,9,0.18)_58px_116px)] opacity-45 shadow-[inset_0_0_90px_rgba(0,0,0,0.55)] [transform:perspective(900px)_rotateX(64deg)]" />
        </div>

        <div className="relative z-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Link
                href="/playmanager"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-emerald-300/18 bg-black/44 text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/10"
                aria-label="უკან დაბრუნება"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-200/70">
                  Daily cup
                </p>
                <h1 className="mt-2 text-3xl font-black leading-none text-white sm:text-5xl">
                  {template.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-relaxed text-white/56">
                  უფასო ყოველდღიური ტურნირი სწრაფი bracket-ით. რეგისტრაციის დასრულებისას წყვილები ავტომატურად შეიქმნება და მატჩის გვერდზე ლაინაფის მომზადებას შეძლებ.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={instance.status} />
              {isRegistered ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/24 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100">
                  <CircleCheck className="h-4 w-4" />
                  დარეგისტრირებული
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <CupStat icon={<Trophy className="h-4 w-4" />} label="საპრიზო ფონდი" value={formatGel(template.prize_pool)} tone="gold" />
                <CupStat icon={<Coins className="h-4 w-4" />} label="შესვლა" value={entryFeeLabel} tone="green" />
                <CupStat icon={<UsersRound className="h-4 w-4" />} label="მონაწილეები" value={`${participantCount}/${template.max_teams}`} tone="green" />
                <CupStat icon={<CalendarClock className="h-4 w-4" />} label="ფორმატი" value={template.schedule_type === 'auto_fill' ? 'Auto-fill' : 'Daily'} tone="red" />
              </div>

              <div className="rounded-[22px] border border-emerald-300/14 bg-black/48 p-4 shadow-[inset_0_0_38px_rgba(34,197,94,0.07)]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/60">Registration meter</p>
                    <h2 className="mt-1 text-xl font-black text-white">
                      {isRegistration ? `${slotsLeft} ადგილი დარჩა` : 'რეგისტრაცია დასრულებულია'}
                    </h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-white/62">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-emerald-300 to-red-500 shadow-[0_0_24px_rgba(52,211,153,0.5)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {isRegistration ? (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <ParticipantsPanel participants={participants || []} maxTeams={template.max_teams} />
                  <div className="rounded-[22px] border border-emerald-300/14 bg-black/58 p-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-100">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h2 className="mt-4 text-xl font-black text-white">შესვლა თასზე</h2>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-white/50">
                      როგორც კი {template.max_teams} გუნდი შეიკრიბება, bracket ავტომატურად გაიხსნება. თუ თასი დიდხანს დარჩა ღია, სისტემა ბოტებით შეავსებს.
                    </p>
                    <form action={joinCurrentCup} className="mt-5">
                      <button
                        type="submit"
                        disabled={isRegistered || isFull}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200/28 bg-emerald-300 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/38"
                      >
                        {isRegistered ? 'უკვე დარეგისტრირებული ხარ' : isFull ? 'ადგილები შევსებულია' : `მონაწილეობა · ${entryFeeLabel}`}
                        {!isRegistered && !isFull ? <ArrowRight className="h-4 w-4" /> : null}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {userMatch && userOpponent ? (
                    <Link
                      href={`/playmanager/cups/${cupId}/matches/${userMatch.id}`}
                      className="group flex flex-col gap-4 rounded-[22px] border border-emerald-300/20 bg-emerald-300/10 p-4 transition hover:border-emerald-200/42 hover:bg-emerald-300/14 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200/70">
                          შენი შემდეგი მატჩი
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-white">
                          Round {userMatch.round} · {userOpponent.name}
                        </h2>
                        <p className="mt-1 text-sm font-bold text-white/52">
                          გახსენი scouting, ლაინაფი და ტაქტიკური preview.
                        </p>
                      </div>
                      <span className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-black text-black">
                        მატჩის გახსნა
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  ) : (
                    <div className="rounded-[22px] border border-white/10 bg-black/44 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-white/38">Next fixture</p>
                      <h2 className="mt-2 text-xl font-black text-white">
                        {nextMatch ? `Round ${nextMatch.round}` : 'მატჩი ჯერ არ არის მზად'}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-white/48">
                        შენი მატჩი გამოჩნდება მაშინ, როცა გუნდი ამ bracket-ში მოხვდება.
                      </p>
                    </div>
                  )}

                  <div className="rounded-[22px] border border-white/10 bg-black/58 p-3 sm:p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/60">Tournament bracket</p>
                        <h2 className="mt-1 text-xl font-black text-white">სატურნირო ბადე</h2>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-black text-white/48">
                        {completedMatches} დასრულდა · {readyMatches} მზადაა
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-emerald-300/10 bg-black/50 p-3">
                      <Bracket matches={bracketMatches} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-[22px] border border-red-400/18 bg-black/62 p-4 shadow-[inset_0_0_34px_rgba(127,29,29,0.12)]">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-red-300/18 bg-red-500/10 text-red-100">
                  <Shield className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-xl font-black text-white">თასის წესები</h2>
                <div className="mt-4 space-y-2">
                  <RuleRow label="ფორმატი" value="Single elimination" />
                  <RuleRow label="რაუნდი" value="10 წუთიანი cadence" />
                  <RuleRow label="საპრიზო" value={formatGel(template.prize_pool)} />
                  <RuleRow label="შესვლის ფასი" value={entryFeeLabel} />
                </div>
              </div>

              <div className="rounded-[22px] border border-emerald-300/14 bg-black/54 p-4">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/58">Manager checklist</p>
                <div className="mt-3 space-y-2">
                  <ChecklistItem done={isRegistered || !isRegistration} label="თასზე რეგისტრაცია" />
                  <ChecklistItem done={!isRegistration} label="წყვილების შექმნა" />
                  <ChecklistItem done={Boolean(userMatch)} label="მატჩის scouting გვერდი" />
                  <ChecklistItem done={completedMatches > 0} label="რაუნდის შედეგები" />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
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

function StatusPill({ status }: { status: CupInstanceRow['status'] }) {
  const copy = {
    registration: 'რეგისტრაცია',
    in_progress: 'მიმდინარეობს',
    completed: 'დასრულებულია',
  }[status];
  const className = {
    registration: 'border-emerald-300/24 bg-emerald-300/10 text-emerald-100',
    in_progress: 'border-red-300/24 bg-red-400/10 text-red-100',
    completed: 'border-white/12 bg-white/[0.05] text-white/58',
  }[status];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black ${className}`}>
      <Zap className="h-4 w-4" />
      {copy}
    </span>
  );
}

function CupStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'green' | 'red' | 'gold';
}) {
  const toneClass = {
    green: 'pm-dashboard-stat-green text-emerald-100',
    red: 'pm-dashboard-stat-red text-red-100',
    gold: 'pm-dashboard-stat-gold text-emerald-100',
  }[tone];

  return (
    <div className={`pm-dashboard-stat ${toneClass}`}>
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
        {icon}
        {label}
      </p>
      <strong className="mt-2 block truncate text-lg font-black text-white">{value}</strong>
    </div>
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

  return (
    <div className="rounded-[22px] border border-white/10 bg-black/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200/58">Teams</p>
          <h2 className="mt-1 text-xl font-black text-white">დარეგისტრირებული გუნდები</h2>
        </div>
        <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-black text-white/50">
          {participants.length}/{maxTeams}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {participants.map((participant, index) => (
          <div key={participant.team_id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.06] px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-emerald-300/12 text-xs font-black text-emerald-100">
              {index + 1}
            </span>
            <span className="truncate text-sm font-black text-white">{getParticipantName(participant.pm_teams)}</span>
          </div>
        ))}
        {emptySlots.map((_, index) => (
          <div key={`empty-${index}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-3 py-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-xs font-black text-white/24">
              {participants.length + index + 1}
            </span>
            <span className="text-sm font-black text-white/28">თავისუფალი ადგილი</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-white/34">{label}</span>
      <strong className="text-sm font-black text-white">{value}</strong>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl ${done ? 'bg-emerald-300 text-black' : 'bg-white/8 text-white/34'}`}>
        <CircleCheck className="h-4 w-4" />
      </span>
      <span className={`text-sm font-black ${done ? 'text-white' : 'text-white/38'}`}>{label}</span>
    </div>
  );
}
