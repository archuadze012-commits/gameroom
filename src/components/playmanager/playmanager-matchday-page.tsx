'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ChevronRight,
  Dumbbell,
  History,
  Home,
  Medal,
  Megaphone,
  Play,
  ShoppingCart,
  Swords,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { runPlayManagerCityAction, type MatchResult } from '@/app/playmanager/actions';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { Dock } from '@/components/react-bits/dock';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import CountUp from '@/components/CountUp';
import { getTrait } from '@/lib/playmanager/traits';

type Tactics = {
  tacticalStyle: 'balanced' | 'pressing' | 'possession' | 'counter';
  defensiveLine: 'low' | 'mid' | 'high';
  tempo: 'controlled' | 'balanced' | 'direct';
  focusSide: 'left' | 'center' | 'right';
};

type FormEntry = { result: 'W' | 'D' | 'L'; score: string; opponent: string; venue: 'Home' | 'Away' };

type MatchdayPageProps = {
  teamName: string;
  divisionLabel: string;
  managerName: string;
  managerAvatarUrl: string | null;
  balanceLabel: string;
  weekLabel: string;
  nextMatchLabel: string;
  nextOpponentName: string;
  competitionLabel: string;
  roundLabel: string | null;
  isHome: boolean;
  teamRating: number;
  opponentRating: number;
  readiness: number;
  formPercent: number;
  avgMorale: number;
  availableCount: number;
  injuredCount: number;
  startersCount: number;
  tactics: Tactics;
  activeCupName: string | null;
  cupsCount: number;
  activeCup: { name: string; prizePoolLabel: string; participantCount: number; maxTeams: number } | null;
  recentForm: FormEntry[];
};

const STYLE_KA: Record<Tactics['tacticalStyle'], string> = {
  balanced: 'ბალანსი',
  pressing: 'პრესინგი',
  possession: 'ფლობა',
  counter: 'კონტრა',
};
const LINE_KA: Record<Tactics['defensiveLine'], string> = { low: 'დაბალი', mid: 'საშუალო', high: 'მაღალი' };
const TEMPO_KA: Record<Tactics['tempo'], string> = { controlled: 'კონტროლი', balanced: 'ბალანსი', direct: 'პირდაპირი' };

const dockItems = [
  { label: 'მთავარი', icon: Home, href: '/playmanager' },
  { label: 'მატჩი', icon: Trophy, href: '/playmanager/arena?module=matchday', active: true },
  { label: 'გუნდი', icon: UsersRound, href: '/playmanager/residence' },
  { label: 'მარკეტი', icon: ShoppingCart, href: '/playmanager/market' },
  { label: 'მეტი', icon: Megaphone, href: '/playmanager/announcements' },
];

export function PlayManagerMatchdayPage(props: MatchdayPageProps) {
  const {
    teamName,
    divisionLabel,
    managerName,
    managerAvatarUrl,
    balanceLabel,
    weekLabel,
    nextMatchLabel,
    nextOpponentName,
    competitionLabel,
    roundLabel,
    isHome,
    teamRating,
    opponentRating,
    readiness,
    formPercent,
    avgMorale,
    availableCount,
    injuredCount,
    startersCount,
    tactics,
    activeCupName,
    cupsCount,
    activeCup,
    recentForm,
  } = props;

  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const xiReady = startersCount === 11;

  async function startMatch() {
    if (!xiReady) return;
    setPending(true);
    setMessage(null);
    const result = await runPlayManagerCityAction({ spriteKey: 'league', action: 'league_sim' });
    setPending(false);

    if (!result.success) {
      setMessage('მატჩის გაშვება ვერ მოხერხდა');
      return;
    }
    if (result.matchResult) {
      setMatchResult(result.matchResult);
      return;
    }
    setMessage(result.detail ?? 'მატჩი განახლდა');
    router.refresh();
  }

  return (
    <main className="pm-hq-home relative min-h-screen overflow-x-hidden bg-[#03070c] text-white">
      <NavRail />

      <div className="mx-auto w-full max-w-[1280px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 xl:pb-10 xl:pl-[96px]">
        <TopStrip
          teamName={teamName}
          divisionLabel={divisionLabel}
          weekLabel={weekLabel}
          competitionLabel={competitionLabel}
          managerName={managerName}
          managerAvatarUrl={managerAvatarUrl}
          balanceLabel={balanceLabel}
        />

        {/* ── CINEMATIC FIXTURE STAGE ── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-4 overflow-hidden rounded-[34px] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
        >
          <Image src="/playmanager/module-cards/arena/matchday-stadium.webp" alt="" fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_-10%,rgba(3,7,12,0.5),rgba(3,7,12,0.92))]" />
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(80%_90%_at_15%_50%,rgba(16,185,129,0.28),transparent_70%)]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(80%_90%_at_85%_50%,rgba(244,63,94,0.22),transparent_70%)]" />
          <motion.div
            aria-hidden
            initial={{ x: '-130%' }}
            animate={{ x: '130%' }}
            transition={{ duration: 6.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
          />

          <div className="relative flex flex-col p-5 sm:p-7 lg:p-9">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StageChip tone="amber"><Trophy className="h-3.5 w-3.5" />{competitionLabel}</StageChip>
                {roundLabel ? <StageChip tone="plain">{roundLabel}</StageChip> : null}
              </div>
              <div className="flex items-center gap-2">
                <StageChip tone="emerald">{isHome ? 'საშინაო' : 'სტუმრად'}</StageChip>
                <StageChip tone="live"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />{weekLabel}</StageChip>
              </div>
            </div>

            <div className="mt-6 grid items-center gap-5 sm:mt-8 md:grid-cols-[1fr_auto_1fr]">
              <TeamColumn name={teamName} rating={teamRating} tone="emerald" side="home" form={recentForm} />

              <KickoffMedallion
                ready={xiReady}
                pending={pending}
                startersCount={startersCount}
                label={nextMatchLabel}
                onStart={startMatch}
              />

              <TeamColumn name={nextOpponentName} rating={opponentRating} tone="rose" side="away" />
            </div>
          </div>
        </motion.section>

        {message ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-2xl border border-emerald-300/18 bg-emerald-950/45 px-4 py-3 text-sm font-black text-emerald-100"
          >
            {message}
          </motion.div>
        ) : null}

        {/* ── BRIEFING RAIL ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mt-4"
        >
          <SpotlightCard className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,16,26,0.9),rgba(4,8,14,0.95))] p-4 sm:p-5">
            <div className="grid items-center gap-4 lg:grid-cols-[auto_1fr_auto]">
              <ReadinessRing value={readiness} />

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <BriefingCell label="ფორმა" value={formPercent} suffix="%" />
                <BriefingCell label="მორალი" value={avgMorale} suffix="%" />
                <BriefingCell label="ხელმისაწვდომი" value={availableCount} caption={injuredCount > 0 ? `${injuredCount} დაშავ.` : 'სრული'} />
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/40">
                    <Swords className="h-3 w-3 text-emerald-300" /> ტაქტიკა
                  </p>
                  <p className="mt-1 truncate text-base font-black text-white">{STYLE_KA[tactics.tacticalStyle]}</p>
                  <p className="truncate text-[11px] font-bold text-white/45">
                    {LINE_KA[tactics.defensiveLine]} · {TEMPO_KA[tactics.tempo]}
                  </p>
                </div>
              </div>

              <Link
                href="/playmanager/arena/lineup"
                className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-emerald-200/25 bg-emerald-300/10 px-5 text-sm font-black text-emerald-50 transition hover:border-emerald-200/45 hover:bg-emerald-300/18"
              >
                <Dumbbell className="h-4 w-4" />
                <span className="flex flex-col items-start leading-tight">
                  შემადგენლობა
                  <span className="text-[10px] font-bold text-emerald-200/60">XI {startersCount}/11 · ტაქტიკა</span>
                </span>
                <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* ── SHORTCUTS ── */}
        <section className="mt-4 grid gap-3 sm:grid-cols-3">
          <Shortcut
            href={cupsCount > 0 ? '/playmanager/league' : '/playmanager/arena?module=matchday'}
            icon={<Trophy className="h-5 w-5" />}
            title="ტურნირები"
            sub={activeCup ? `${activeCup.participantCount}/${activeCup.maxTeams} · ${activeCup.prizePoolLabel}` : activeCupName ?? 'ღია თასები'}
            tone="amber"
            index={0}
          />
          <Shortcut
            href="/playmanager/history"
            icon={<History className="h-5 w-5" />}
            title="ისტორია"
            sub={recentForm.length > 0 ? `ფორმა: ${recentForm.map((entry) => entry.result).join(' ')}` : 'ბოლო მატჩები'}
            tone="emerald"
            index={1}
          />
          <Shortcut
            href="/playmanager/museum"
            icon={<Medal className="h-5 w-5" />}
            title="მუზეუმი"
            sub="ტროფეები და ტიტულები"
            tone="amber"
            index={2}
          />
        </section>
      </div>

      <Dock
        items={dockItems.map((item) => {
          const Icon = item.icon;
          return {
            label: item.label,
            icon: <Icon className="h-5 w-5" />,
            onClick: () => router.push(item.href),
            className: item.active ? 'bg-emerald-300/18 text-emerald-100' : 'text-white/62',
          };
        })}
      />

      <AnimatePresence>
        {matchResult ? (
          <MatchResultModal result={matchResult} onClose={() => { setMatchResult(null); router.refresh(); }} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function NavRail() {
  return <PlayManagerSidebar />;
}

function TopStrip({
  teamName,
  divisionLabel,
  weekLabel,
  competitionLabel,
  managerName,
  managerAvatarUrl,
  balanceLabel,
}: {
  teamName: string;
  divisionLabel: string;
  weekLabel: string;
  competitionLabel: string;
  managerName: string;
  managerAvatarUrl: string | null;
  balanceLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/60">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Matchday · {competitionLabel}
        </p>
        <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-black leading-none sm:text-[28px]">
          {teamName}
          <span className="rounded-full bg-emerald-300/14 px-2 py-0.5 text-[11px] font-black text-emerald-200">{divisionLabel}</span>
        </h1>
        <p className="mt-1 truncate text-[12px] font-bold text-white/40">{weekLabel} · ბალანსი {balanceLabel}</p>
      </div>

      <div className="flex flex-none items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">
        <div className="hidden text-right sm:block">
          <p className="text-[10px] font-black text-white/38">მენეჯერი</p>
          <p className="max-w-[150px] truncate text-[14px] font-black text-amber-100">{managerName}</p>
        </div>
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/10">
          {managerAvatarUrl ? (
            <Image src={managerAvatarUrl} alt={managerName} fill sizes="40px" className="object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-black text-white/70">{managerName.slice(0, 1).toUpperCase()}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StageChip({ children, tone }: { children: React.ReactNode; tone: 'amber' | 'emerald' | 'plain' | 'live' }) {
  const cls =
    tone === 'amber'
      ? 'border-amber-300/24 bg-amber-300/10 text-amber-100/90'
      : tone === 'emerald'
        ? 'border-emerald-300/22 bg-emerald-300/10 text-emerald-100/85'
        : tone === 'live'
          ? 'border-white/12 bg-black/40 text-white/70'
          : 'border-white/10 bg-white/[0.05] text-white/65';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] backdrop-blur-md ${cls}`}>
      {children}
    </span>
  );
}

function TeamColumn({
  name,
  rating,
  tone,
  side,
  form,
}: {
  name: string;
  rating: number;
  tone: 'emerald' | 'rose';
  side: 'home' | 'away';
  form?: FormEntry[];
}) {
  const accent =
    tone === 'emerald'
      ? { ring: 'border-emerald-300/45', glow: 'from-emerald-400/35', text: 'text-emerald-200', bar: 'from-emerald-400 to-lime-300' }
      : { ring: 'border-rose-300/45', glow: 'from-rose-400/28', text: 'text-rose-200', bar: 'from-rose-400 to-amber-300' };
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'home' ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
      className="flex flex-col items-center text-center"
    >
      <div className={`relative grid h-24 w-24 place-items-center rounded-[26px] border ${accent.ring} bg-black/40 shadow-[0_18px_50px_rgba(0,0,0,0.45)] sm:h-28 sm:w-28`}>
        <div className={`absolute inset-0 rounded-[26px] bg-gradient-to-br ${accent.glow} to-transparent`} />
        <span className="relative text-4xl font-black text-white sm:text-5xl">{name.slice(0, 1).toUpperCase()}</span>
      </div>
      <p className="mt-3 max-w-[180px] truncate text-lg font-black text-white sm:text-xl">{name}</p>
      <p className={`mt-0.5 text-4xl font-black tabular-nums ${accent.text}`}>
        <CountUp to={rating} duration={1.4} />
      </p>
      <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, rating))}%` }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${accent.bar}`}
        />
      </div>
      {form && form.length > 0 ? (
        <div className="mt-3 flex items-center gap-1">
          {form.slice(0, 5).map((entry, index) => (
            <span
              key={`${entry.opponent}-${index}`}
              title={`${entry.result} · ${entry.score} vs ${entry.opponent}`}
              className={`grid h-5 w-5 place-items-center rounded-md text-[9px] font-black ${
                entry.result === 'W'
                  ? 'bg-emerald-400/20 text-emerald-100'
                  : entry.result === 'D'
                    ? 'bg-amber-300/18 text-amber-100'
                    : 'bg-rose-500/20 text-rose-100'
              }`}
            >
              {entry.result}
            </span>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

function KickoffMedallion({
  ready,
  pending,
  startersCount,
  label,
  onStart,
}: {
  ready: boolean;
  pending: boolean;
  startersCount: number;
  label: string;
  onStart: () => void;
}) {
  const content = (
    <>
      {ready
        ? [0, 1].map((ring) => (
            <motion.span
              key={ring}
              aria-hidden
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity, delay: ring * 1.1, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full border border-emerald-300/50"
            />
          ))
        : null}
      <span className="relative z-10 grid place-items-center">
        {ready ? (
          <>
            <Play className="h-7 w-7 fill-current" />
            <span className="mt-1 text-[11px] font-black">{pending ? 'მიმდინარეობს…' : 'მატჩის დაწყება'}</span>
          </>
        ) : (
          <>
            <span className="text-2xl font-black tabular-nums">{startersCount}/11</span>
            <span className="mt-0.5 text-[10px] font-black opacity-80">შეავსე XI</span>
          </>
        )}
      </span>
    </>
  );

  const baseCls =
    'relative grid h-32 w-32 place-items-center rounded-full text-center transition sm:h-36 sm:w-36';

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 16, delay: 0.25 }}
      >
        {ready ? (
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className={`${baseCls} border-2 border-emerald-200/50 bg-[radial-gradient(120%_120%_at_50%_0%,#6ee7b7,#10b981_60%,#047857)] text-emerald-950 shadow-[0_0_50px_rgba(16,185,129,0.5)] hover:brightness-110 disabled:opacity-80`}
          >
            {content}
          </button>
        ) : (
          <Link
            href="/playmanager/arena/lineup"
            className={`${baseCls} border-2 border-amber-200/45 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(253,224,71,0.25),rgba(0,0,0,0.5))] text-amber-50 shadow-[0_0_40px_rgba(251,191,36,0.3)] hover:brightness-110`}
          >
            {content}
          </Link>
        )}
      </motion.div>
      <p className="mt-3 max-w-[180px] text-center text-[11px] font-black uppercase tracking-[0.12em] text-white/45">{label}</p>
    </div>
  );
}

function ReadinessRing({ value }: { value: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-[88px] w-[88px] place-items-center">
        <svg viewBox="0 0 72 72" className="h-[88px] w-[88px] -rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <motion.circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="url(#pm-md-ready)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="pm-md-ready" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute grid place-items-center">
          <span className="text-xl font-black tabular-nums text-emerald-100">
            <CountUp to={clamped} duration={1.3} />
          </span>
        </div>
      </div>
      <div>
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
          <Activity className="h-3.5 w-3.5 text-emerald-300" /> მზადყოფნა
        </p>
        <p className="mt-0.5 text-sm font-black text-white/70">გუნდის მდგომარეობა</p>
      </div>
    </div>
  );
}

function BriefingCell({ label, value, suffix = '', caption }: { label: string; value: number; suffix?: string; caption?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-white">
        <CountUp to={value} duration={1.4} />
        {suffix}
      </p>
      {caption ? <p className="truncate text-[11px] font-bold text-white/45">{caption}</p> : null}
    </div>
  );
}

function Shortcut({
  href,
  icon,
  title,
  sub,
  tone,
  index,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone: 'emerald' | 'amber';
  index: number;
}) {
  const accent =
    tone === 'amber'
      ? 'border-amber-300/16 hover:border-amber-300/35 text-amber-200'
      : 'border-emerald-300/16 hover:border-emerald-300/35 text-emerald-200';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
    >
      <Link
        href={href}
        className={`group flex items-center gap-3 rounded-[22px] border bg-white/[0.03] p-4 transition hover:bg-white/[0.06] ${accent}`}
      >
        <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl border border-white/10 bg-black/40">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-white">{title}</p>
          <p className="truncate text-[12px] font-bold text-white/50">{sub}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
      </Link>
    </motion.div>
  );
}

function MatchResultModal({ result, onClose }: { result: MatchResult; onClose: () => void }) {
  const isWin = result.result === 'W';
  const isDraw = result.result === 'D';
  const resultColor = isWin ? 'text-emerald-400' : isDraw ? 'text-yellow-400' : 'text-red-400';
  const resultBorder = isWin ? 'border-emerald-500/30' : isDraw ? 'border-yellow-500/30' : 'border-red-500/30';
  const resultLabel = isWin ? 'გამარჯვება' : isDraw ? 'ფრე' : 'დამარცხება';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 18 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-md rounded-[24px] border ${resultBorder} bg-[#030b07] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.6)]`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">ლიგა · {result.round} ტური</p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className={`text-6xl font-black tracking-tight ${resultColor}`}>{result.score}</p>
          <div className="text-right">
            <span className={`inline-block rounded-full border px-4 py-1.5 text-lg font-black ${resultBorder} ${resultColor}`}>{resultLabel}</span>
            <p className="mt-1.5 text-sm font-bold text-white/60">vs {result.opponent}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <ModalStat label="დასწრება" value={result.attendance} caption="სტადიონი" />
          <ModalStat label="შემოსავალი" value={result.income} caption="მატჩის დღე" />
          <ModalStat label="ფორმა" value={result.formPercent} suffix="%" caption="განახლდა" />
        </div>
        {result.matchEngine && <MatchEngineBadge me={result.matchEngine} />}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-white/12 bg-white/[0.05] py-3 text-sm font-black text-white transition hover:bg-white/10"
        >
          დახურვა
        </button>
      </motion.div>
    </motion.div>
  );
}

function ModalStat({ label, value, suffix = '', caption }: { label: string; value: number; suffix?: string; caption: string }) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/[0.045] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-1.5 text-2xl font-black tabular-nums text-white">
        <CountUp to={value} duration={1.5} separator="," />
        {suffix}
      </p>
      <p className="mt-1 text-[11px] font-bold text-white/52">{caption}</p>
    </div>
  );
}

const styleLabels: Record<string, string> = {
  pressing: 'პრესინგი',
  possession: 'ფლობა',
  counter: 'კონტრი',
  balanced: 'ბალანსი',
};

function MatchEngineBadge({ me }: { me: NonNullable<MatchResult['matchEngine']> }) {
  const { homeXg, awayXg, tactics } = me;
  const autoSubs = me.profile?.autoSubs ?? [];
  const teamTraits = me.profile?.traits ?? [];
  const goalscorers = me.playerEvents?.goalscorers ?? [];
  const ratings = me.playerEvents?.ratings ?? [];
  const topRatings = ratings.slice(0, 3);
  const totalXg = homeXg + awayXg;
  const homeW = totalXg > 0 ? (homeXg / totalXg) * 100 : 50;
  const matchupPos = tactics.styleMatchup > 0;
  const matchupNeg = tactics.styleMatchup < 0;
  const matchupColor = matchupPos ? 'text-emerald-400' : matchupNeg ? 'text-red-400' : 'text-white/40';
  const matchupSign = matchupPos ? '+' : '';

  return (
    <div className="mt-3 rounded-[18px] border border-white/8 bg-white/[0.03] p-4 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">ტაქტიკური ანალიზი</p>

      {/* xG bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-black tabular-nums">
          <span className="text-white">{homeXg.toFixed(2)} xG</span>
          <span className="text-white/40">vs</span>
          <span className="text-white/60">{awayXg.toFixed(2)} xG</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${homeW}%` }}
          />
        </div>
      </div>

      {/* Style matchup */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-black text-white">{styleLabels[tactics.homeStyle] ?? tactics.homeStyle}</span>
          <span className="text-white/30 text-[10px]">→</span>
          <span className="text-[11px] font-bold text-white/55">{styleLabels[tactics.opponentStyle] ?? tactics.opponentStyle}</span>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <span className={`text-[11px] font-black ${matchupColor}`}>
            {tactics.styleMatchup !== 0 && `${matchupSign}${tactics.styleMatchup.toFixed(2)}`}
            {tactics.styleMatchup === 0 && '–'}
          </span>
          <span className="text-[10px] font-bold text-white/35">ფიტი {tactics.styleFit.toFixed(2)}</span>
        </div>
      </div>

      {/* Chips row */}
      <div className="flex gap-2 flex-wrap">
        <Chip label="შეტ" value={`${tactics.attackMod > 0 ? '+' : ''}${tactics.attackMod.toFixed(2)}`} positive={tactics.attackMod > 0} />
        <Chip label="მცვ" value={`${tactics.concedeMod > 0 ? '+' : ''}${tactics.concedeMod.toFixed(2)}`} positive={tactics.concedeMod < 0} />
        <Chip label="TAC" value={tactics.teamTac.toFixed(1)} neutral />
        {typeof tactics.positionFit === 'number' && (
          <Chip
            label="პოზიცია"
            value={`${Math.round(tactics.positionFit * 100)}%`}
            positive={tactics.positionFit >= 0.97}
            neutral={tactics.positionFit < 0.97 && tactics.positionFit >= 0.9}
          />
        )}
      </div>
      {typeof tactics.positionFit === 'number' && tactics.positionFit < 0.9 && (
        <p className="text-[10px] font-bold leading-4 text-red-300/70">
          მოთამაშეები არასწორ პოზიციებზე თამაშობენ — შემადგენლობის თავსებადობა დაბალია.
        </p>
      )}

      {goalscorers.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/8 pt-3">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">⚽ გოლები</span>
          {goalscorers.map((g) => (
            <span key={g.playerId} className="text-[11px] font-bold text-white">
              {g.name}
              {g.goals > 1 && <span className="text-emerald-300"> ×{g.goals}</span>}
            </span>
          ))}
        </div>
      )}

      {topRatings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">⭐ საუკ. შეფასება</span>
          {topRatings.map((r) => {
            const tone = r.rating >= 8 ? 'text-emerald-300' : r.rating >= 7 ? 'text-white' : 'text-white/55';
            return (
              <span key={r.playerId} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold">
                <span className="text-white/55">{r.position}</span>
                <span className="text-white/80">{r.name}</span>
                <span className={`font-black tabular-nums ${tone}`}>{r.rating.toFixed(1)}</span>
              </span>
            );
          })}
        </div>
      )}

      {teamTraits.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-3">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">თვისებები</span>
          {teamTraits.map((t) => {
            const trait = getTrait(t.key);
            if (!trait) return null;
            return (
              <span
                key={t.key}
                title={trait.blurb}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${trait.bg} ${trait.border} ${trait.color}`}
              >
                <span aria-hidden>{trait.icon}</span>
                {trait.label}
                {t.count > 1 && <span className="text-white/50">×{t.count}</span>}
              </span>
            );
          })}
        </div>
      )}

      {autoSubs.length > 0 && (
        <div className="space-y-1.5 border-t border-white/8 pt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200/55">
            ავტომატური ცვლები
          </p>
          {autoSubs.map((sub, i) => (
            <div key={`${sub.out}-${sub.in}-${i}`} className="flex items-center gap-2 text-[11px] font-bold">
              <span className="flex h-4 w-7 shrink-0 items-center justify-center rounded bg-white/8 text-[9px] font-black text-white/45">
                {sub.slot}
              </span>
              <span className="truncate text-red-300/80">{sub.out}</span>
              <span className="text-white/30">→</span>
              <span className="truncate text-emerald-300/85">{sub.in}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, positive, neutral }: { label: string; value: string; positive?: boolean; neutral?: boolean }) {
  const color = neutral ? 'text-white/55' : positive ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/35">{label}</span>
      <span className={`text-[11px] font-black tabular-nums ${color}`}>{value}</span>
    </div>
  );
}
