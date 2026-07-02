'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  GraduationCap,
  Handshake,
  Store,
  Ticket,
  TrendingUp,
  Trophy,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { PlayManagerSidebar } from '@/components/playmanager/playmanager-side-nav';
import { PlayManagerBottomNav } from '@/components/playmanager/playmanager-bottom-nav';
import {
  negotiatePlayManagerSponsor,
  savePlayManagerTicketPrice,
  type PlayManagerPlayerActionResult,
} from '@/app/playmanager/actions';
import {
  formatGel,
  getPlayerWeeklyWageGel,
  getProjectedAttendance,
  getProjectedMatchdayIncome,
  getStadiumCapacity,
} from '@/lib/playmanager/economy';
import { getFacilityUpgradeCostGel, type CityActionKey } from '@/lib/playmanager/gameplay';
import type { PlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import type { ClubEffectsSummary, ManagerPerk } from '@/lib/playmanager/progression';
import type { EditableCityBuilding } from '@/components/playmanager/playmanager-city-editor';

// ── Props (mirrors what BuildingPageClient hands BuildingWorkspace) ───────────

type OfficeManager = {
  name: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  title: string;
  progressPercent: number;
  xpToNextLevel: number;
  perks: ManagerPerk[];
};

type OfficeTeam = {
  name: string;
  balanceLabel: string;
  divisionId: number;
  divisionLabel: string;
  formPercent: number;
};

export type PlayManagerOfficeProps = {
  building: EditableCityBuilding;
  manager: OfficeManager;
  team: OfficeTeam;
  snapshot: PlayManagerCitySnapshot;
  clubEffects: ClubEffectsSummary;
  facilities: Record<string, { level: number }>;
  pendingAction: string | null;
  actionMessage: string | null;
  onRunAction: (spriteKey: string, action: CityActionKey) => void;
  onRunPlayerAction: (actionId: string, action: () => Promise<PlayManagerPlayerActionResult>) => void;
};

type Tone = 'green' | 'red';

const DIVISION_LABELS = ['', 'A', 'B', 'C', 'D'];

const SPONSOR_TIERS: Record<PlayManagerCitySnapshot['finance']['sponsorTier'], string> = {
  local: 'ლოკალური',
  regional: 'რეგიონული',
  global: 'გლობალური',
};

// ── Post-card primitives (PlayGame feed language: .pubg-loadout-*) ────────────

function OfficeCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="pubg-loadout-link group block h-full">
      <div className={`pubg-loadout-card relative flex h-full flex-col overflow-hidden p-5 sm:p-6 ${className}`}>
        <span aria-hidden className="pubg-loadout-field absolute inset-0 z-0 opacity-80" />
        <div className="relative z-[1] flex h-full flex-col space-y-4">{children}</div>
      </div>
    </div>
  );
}

function DepartmentCard({
  icon: Icon,
  title,
  photo,
  pill,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  photo: string;
  pill: string;
  tone: Tone;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="pubg-loadout-link group block w-full text-left">
      <div className="pubg-loadout-card relative aspect-[4/3] overflow-hidden">
        {/* Photo inset from the edge so the neon frame is never covered. */}
        <div className="absolute inset-[5px] overflow-hidden rounded-[12px]">
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/28 to-black/10" />
        </div>
        {/* Content */}
        <div className="relative z-[1] flex h-full flex-col justify-between p-4">
          <span className={`pm-office-ava self-start ${tone === 'red' ? 'pm-office-ava--red' : ''}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className={`pm-office-title text-[15px] leading-tight ${tone === 'red' ? 'pm-office-title--red' : ''}`}>{title}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <StatPill tone={tone}>{pill}</StatPill>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/60 transition-colors group-hover:text-emerald-300">
                გახსნა <TrendingUp className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function CardHead({
  icon: Icon,
  title,
  subtitle,
  tone = 'green',
  right,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: Tone;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <span className={`pm-office-ava ${tone === 'red' ? 'pm-office-ava--red' : ''}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`pm-office-title truncate text-[15px] leading-tight ${tone === 'red' ? 'pm-office-title--red' : ''}`}>
          {title}
        </p>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

function StatPill({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`pm-office-pill ${tone === 'green' ? 'pm-office-pill--green' : tone === 'red' ? 'pm-office-pill--red' : ''}`}>
      {children}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PlayManagerOffice(props: PlayManagerOfficeProps) {
  const { manager, team, snapshot, facilities, pendingAction, actionMessage, onRunAction, onRunPlayerAction } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleKey = searchParams.get('module');

  const [ticketPriceDraft, setTicketPriceDraft] = useState(snapshot.finance.ticketPrice);

  const departments = [
    { key: 'transfer_market', icon: Store, title: 'სატრანსფერო ბაზარი', photo: '/playmanager/module-cards/market/transfer-market.webp', pill: 'ბაზარი', tone: 'green' as Tone, href: '/playmanager/market?module=transfer_market' },
    { key: 'free_agents', icon: UsersRound, title: 'თავისუფალი აგენტები', photo: '/playmanager/module-cards/market/free-agents.webp', pill: 'ყოველდღე', tone: 'green' as Tone, href: '/playmanager/market?module=free_agents' },
    { key: 'academy_intake', icon: GraduationCap, title: 'აკადემია', photo: '/playmanager/city/buildings/academy.webp', pill: 'youth', tone: 'green' as Tone, href: '/playmanager/academy' },
    { key: 'wages', icon: Coins, title: 'ხელფასების უწყისი', photo: '/playmanager/module-cards/staff/finance-manager.webp', pill: snapshot.finance.weeklyWagesLabel, tone: 'red' as Tone },
    { key: 'tickets', icon: Trophy, title: 'სტადიონის მენეჯმენტი', photo: '/playmanager/module-cards/arena/stadium-economy.webp', pill: snapshot.finance.stadiumCapacityLabel, tone: 'green' as Tone },
  ];

  function openModule(key: string, href?: string) {
    if (href) {
      router.push(href, { scroll: false });
      return;
    }
    router.push(`/playmanager/office?module=${key}`, { scroll: false });
  }

  // ── Live financials ──
  const sponsorIn = snapshot.finance.sponsorWeeklyAmount;
  const wagesOut = snapshot.finance.weeklyWages;
  const netWeekly = sponsorIn - wagesOut;

  const stadiumLevel = facilities.arena?.level ?? snapshot.finance.stadiumLevel;
  const stadiumCapacity = getStadiumCapacity(stadiumLevel);
  const projectedAttendance = getProjectedAttendance({
    formPercent: snapshot.formPercent,
    readiness: snapshot.matchSettings.readiness,
    ticketPrice: ticketPriceDraft,
    stadiumLevel,
  });
  const baseIncome = getProjectedMatchdayIncome({ attendance: projectedAttendance, ticketPrice: ticketPriceDraft });
  const incomePct = snapshot.staff.bonuses.projectedIncomePct ?? 0;
  const projectedIncome = Math.round(baseIncome * (1 + incomePct / 100));
  const occupancyPct = Math.min(100, Math.round((projectedAttendance / stadiumCapacity) * 100));
  const priceMood =
    ticketPriceDraft <= 24
      ? 'დასწრება იზრდება, ერთ გულშემატკივარზე შემოსავალი დაბალია.'
      : ticketPriceDraft >= 56
        ? 'ფასი მაღალია: შემოსავალი დიდია, დასწრების ვარდნის რისკით.'
        : 'ბალანსიანი ფასი — დასწრება და შემოსავალი სტაბილურ ზონაშია.';

  const stadiumUpgradeCost = getFacilityUpgradeCostGel('arena', stadiumLevel);
  const stadiumCanUpgrade = manager.level >= stadiumLevel + 1;
  const stadiumUpgradePending = pendingAction === 'arena:facility_upgrade';
  const ticketPending = pendingAction === 'ticket:save';
  const sponsorPending = pendingAction === 'sponsor:negotiate';

  return (
    <main className="pm-office pm-feedskin pm-hq-shell min-h-screen overflow-x-hidden bg-[#05070a] pb-24 text-white xl:pb-0">
      <PlayManagerSidebar />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1160px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        {actionMessage ? (
          <div className="mb-3 rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
            {actionMessage}
          </div>
        ) : null}

        {moduleKey === 'wages' ? (
          <WagesView snapshot={snapshot} onBack={() => router.push('/playmanager/office', { scroll: false })} />
        ) : moduleKey === 'tickets' ? (
          <TicketsView
            stadiumLevel={stadiumLevel}
            stadiumCapacity={stadiumCapacity}
            projectedAttendance={projectedAttendance}
            projectedIncome={projectedIncome}
            occupancyPct={occupancyPct}
            ticketPriceDraft={ticketPriceDraft}
            setTicketPriceDraft={setTicketPriceDraft}
            priceMood={priceMood}
            ticketPending={ticketPending}
            stadiumCanUpgrade={stadiumCanUpgrade}
            stadiumUpgradeCost={stadiumUpgradeCost}
            stadiumUpgradePending={stadiumUpgradePending}
            onSaveTicket={() => onRunPlayerAction('ticket:save', () => savePlayManagerTicketPrice(ticketPriceDraft))}
            onUpgradeStadium={() => onRunAction('arena', 'facility_upgrade')}
            onBack={() => router.push('/playmanager/office', { scroll: false })}
          />
        ) : (
          <div className="space-y-4">
            {/* ── CLUB CARD (pinned post) ── */}
            <OfficeCard>
              <CardHead
                icon={Wallet}
                title={team.name}
                subtitle={`მენეჯერის ოფისი · ${manager.name} · Lvl ${manager.level}`}
                right={
                  <span className="pm-office-pill pm-office-pill--green shrink-0">
                    {DIVISION_LABELS[team.divisionId] ?? team.divisionLabel} დივიზიონი
                  </span>
                }
              />
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">კლუბის ბალანსი</p>
                  <p className="pm-office-title mt-1 text-3xl sm:text-4xl">{team.balanceLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatPill tone="green">
                    <ArrowUpRight className="h-3.5 w-3.5" /> {formatGel(sponsorIn)}
                  </StatPill>
                  <StatPill tone="red">
                    <ArrowDownRight className="h-3.5 w-3.5" /> {formatGel(wagesOut)}
                  </StatPill>
                  <StatPill tone={netWeekly >= 0 ? 'green' : 'red'}>
                    NET {netWeekly >= 0 ? '+' : ''}{formatGel(netWeekly)} / კვირა
                  </StatPill>
                </div>
              </div>
            </OfficeCard>

            {/* ── DEPARTMENTS (photo feed cards) ── */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((dep) => (
                <DepartmentCard
                  key={dep.key}
                  icon={dep.icon}
                  title={dep.title}
                  photo={dep.photo}
                  pill={dep.pill}
                  tone={dep.tone}
                  onClick={() => openModule(dep.key, dep.href)}
                />
              ))}
            </div>

            {/* ── SPONSOR + REVENUE ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <OfficeCard>
                <CardHead
                  icon={Handshake}
                  title="სპონსორის კონტრაქტი"
                  subtitle="Partners"
                  right={<span className="pm-office-pill pm-office-pill--green shrink-0">{SPONSOR_TIERS[snapshot.finance.sponsorTier]}</span>}
                />
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="pm-office-title text-2xl">{snapshot.finance.sponsorWeeklyAmountLabel}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-emerald-100/60">ყოველ კვირა</p>
                  </div>
                  <button
                    type="button"
                    disabled={sponsorPending}
                    onClick={() => onRunPlayerAction('sponsor:negotiate', () => negotiatePlayManagerSponsor())}
                    className="pm-office-act pm-office-act--green"
                  >
                    {sponsorPending ? 'მუშავდება...' : 'მოლაპარაკება'}
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
                  <StatPill tone="green">IN {formatGel(sponsorIn)}</StatPill>
                  <StatPill tone="red">OUT {formatGel(wagesOut)}</StatPill>
                  <StatPill tone={netWeekly >= 0 ? 'green' : 'red'}>NET {formatGel(netWeekly)}</StatPill>
                </div>
              </OfficeCard>

              <OfficeCard>
                <CardHead icon={Ticket} title="შემოსავლის სიმულატორი" subtitle="Arena revenue" />
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="pm-office-title text-2xl">{ticketPriceDraft} ₾</p>
                    <p className="mt-0.5 text-[11px] font-bold text-white/50">ბილეთის ფასი</p>
                  </div>
                  <div className="text-right">
                    <p className="pm-office-title text-xl">{formatGel(projectedIncome)}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-white/50">მატჩის შემოსავალი</p>
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={1}
                  value={ticketPriceDraft}
                  onChange={(event) => setTicketPriceDraft(Number(event.currentTarget.value))}
                  className="h-2 w-full cursor-pointer accent-emerald-400"
                />
                <div>
                  <div className="flex items-center justify-between text-[11px] font-black text-white/55">
                    <span>შევსება</span>
                    <span>{occupancyPct}% · {stadiumCapacity.toLocaleString('en-US')}</span>
                  </div>
                  <div className="pm-office-gauge mt-1.5">
                    <div className="pm-office-gauge-fill" style={{ width: `${occupancyPct}%` }} />
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 pt-3">
                  <p className="text-[11px] font-bold leading-4 text-white/45">{priceMood}</p>
                  <button
                    type="button"
                    disabled={ticketPending}
                    onClick={() => onRunPlayerAction('ticket:save', () => savePlayManagerTicketPrice(ticketPriceDraft))}
                    className="pm-office-act pm-office-act--green shrink-0"
                  >
                    {ticketPending ? 'ინახება...' : 'შენახვა'}
                  </button>
                </div>
              </OfficeCard>
            </div>

            {/* ── TRANSACTIONS ── */}
            <OfficeCard>
              <CardHead icon={Coins} title="ბოლო ტრანზაქციები" subtitle="Cashflow" />
              {snapshot.transactions.length === 0 ? (
                <p className="py-4 text-center text-sm font-bold text-white/40">ტრანზაქციები ჯერ არ არის.</p>
              ) : (
                <div className="space-y-2">
                  {snapshot.transactions.slice(0, 6).map((tx) => {
                    const positive = tx.amount >= 0;
                    return (
                      <div key={`${tx.reason}-${tx.createdAt}`} className="flex items-center gap-3">
                        <StatPill tone={positive ? 'green' : 'red'}>
                          {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        </StatPill>
                        <span className="min-w-0 flex-1 truncate text-sm font-black text-white/80">{tx.reason}</span>
                        <span className={`text-sm font-black tabular-nums ${positive ? 'text-emerald-300' : 'text-red-300'}`}>
                          {tx.amountLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </OfficeCard>
          </div>
        )}
      </div>

      <PlayManagerBottomNav />
    </main>
  );
}

// ── Wages module ─────────────────────────────────────────────────────────────

function WagesView({ snapshot, onBack }: { snapshot: PlayManagerCitySnapshot; onBack: () => void }) {
  const payroll = [...snapshot.squad]
    .map((p) => ({ p, wage: getPlayerWeeklyWageGel({ ovrCurrent: p.ovrCurrent, age: p.age, lineupSlot: p.lineupSlot }) }))
    .sort((a, b) => b.wage - a.wage);
  const playersSubtotal = payroll.reduce((sum, x) => sum + x.wage, 0);
  const weeklyOut = snapshot.finance.weeklyWages;
  const net = snapshot.finance.sponsorWeeklyAmount - weeklyOut;
  const roleLabel: Record<'starter' | 'bench' | 'reserve', string> = {
    starter: 'საბაზო XI',
    bench: 'სათადარიგო',
    reserve: 'რეზერვი',
  };

  return (
    <div className="space-y-4">
      <BackBar title="ხელფასების უწყისი" onBack={onBack} />
      <OfficeCard>
        <CardHead icon={Coins} title="კვირეული ხელფასები" subtitle="Payroll" tone="red" />
        <div className="flex flex-wrap items-center gap-2">
          <StatPill tone="red">მოთამაშეები {formatGel(playersSubtotal)}</StatPill>
          <StatPill tone="red">სრული {formatGel(weeklyOut)}</StatPill>
          <StatPill tone={net >= 0 ? 'green' : 'red'}>NET {formatGel(net)}</StatPill>
        </div>
        <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 border-b border-white/8 pb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
          <span>#</span>
          <span>მოთამაშე</span>
          <span className="text-right">OVR · ასაკი</span>
          <span className="text-right">კვირეული</span>
        </div>
        <div className="max-h-[440px] overflow-y-auto">
          {payroll.length === 0 ? (
            <p className="py-6 text-center text-sm font-bold text-white/40">გუნდში მოთამაშეები არ არის.</p>
          ) : (
            payroll.map(({ p, wage }) => (
              <div key={p.id} className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-b-0">
                <span className="text-center text-xs font-black text-white/45 tabular-nums">{p.squadNumber ?? '–'}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{p.cardDisplayName?.trim() || p.name}</p>
                  <p className="text-[11px] font-bold text-white/40">
                    {p.position} ·{' '}
                    <span className={p.role === 'starter' ? 'text-emerald-300' : p.role === 'bench' ? 'text-red-300' : 'text-white/45'}>
                      {roleLabel[p.role]}
                    </span>
                  </p>
                </div>
                <span className="text-right text-xs font-bold text-white/60 tabular-nums">{p.ovrCurrent} · {p.age}</span>
                <span className="text-right text-sm font-black tabular-nums text-white">{formatGel(wage)}</span>
              </div>
            ))
          )}
        </div>
      </OfficeCard>
    </div>
  );
}

// ── Tickets / stadium module ─────────────────────────────────────────────────

function TicketsView(props: {
  stadiumLevel: number;
  stadiumCapacity: number;
  projectedAttendance: number;
  projectedIncome: number;
  occupancyPct: number;
  ticketPriceDraft: number;
  setTicketPriceDraft: (v: number) => void;
  priceMood: string;
  ticketPending: boolean;
  stadiumCanUpgrade: boolean;
  stadiumUpgradeCost: number;
  stadiumUpgradePending: boolean;
  onSaveTicket: () => void;
  onUpgradeStadium: () => void;
  onBack: () => void;
}) {
  const {
    stadiumLevel, stadiumCapacity, projectedAttendance, projectedIncome, occupancyPct,
    ticketPriceDraft, setTicketPriceDraft, priceMood, ticketPending,
    stadiumCanUpgrade, stadiumUpgradeCost, stadiumUpgradePending, onSaveTicket, onUpgradeStadium, onBack,
  } = props;

  return (
    <div className="space-y-4">
      <BackBar title={`სტადიონი · Level ${stadiumLevel}`} onBack={onBack} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OfficeCard>
          <CardHead icon={Ticket} title="შემოსავლის სიმულატორი" subtitle="Ticket desk" />
          <div className="flex items-end justify-between gap-3">
            <p className="pm-office-title text-4xl">{ticketPriceDraft} ₾</p>
            <p className="pm-office-title text-2xl">{formatGel(projectedIncome)}</p>
          </div>
          <input
            type="range"
            min={10}
            max={80}
            step={1}
            value={ticketPriceDraft}
            onChange={(event) => setTicketPriceDraft(Number(event.currentTarget.value))}
            className="h-2 w-full cursor-pointer accent-emerald-400"
          />
          <div>
            <div className="flex items-center justify-between text-[11px] font-black text-white/55">
              <span>შევსება</span>
              <span>{occupancyPct}% · {projectedAttendance.toLocaleString('en-US')}</span>
            </div>
            <div className="pm-office-gauge mt-1.5">
              <div className="pm-office-gauge-fill" style={{ width: `${occupancyPct}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-3">
            <p className="text-[11px] font-bold leading-4 text-white/45">{priceMood}</p>
            <button type="button" disabled={ticketPending} onClick={onSaveTicket} className="pm-office-act pm-office-act--green shrink-0">
              {ticketPending ? 'ინახება...' : 'შენახვა'}
            </button>
          </div>
        </OfficeCard>

        <OfficeCard>
          <CardHead icon={Trophy} title="სტადიონის გაფართოება" subtitle="Infrastructure" />
          <p className="text-xs font-bold leading-5 text-white/54">
            ერთჯერადი ინფრასტრუქტურული upgrade — ზრდის ტევადობას, საშინაო ზეწოლას და matchday შემოსავლის ჭერს.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatPill tone="green">ტევადობა {stadiumCapacity.toLocaleString('en-US')}</StatPill>
            <StatPill>შემდეგი LVL {stadiumLevel + 1}</StatPill>
            <StatPill tone="red">ღირებ. {formatGel(stadiumUpgradeCost)}</StatPill>
          </div>
          {stadiumCanUpgrade ? (
            <button type="button" disabled={stadiumUpgradePending} onClick={onUpgradeStadium} className="pm-office-act pm-office-act--green mt-auto w-full justify-center">
              {stadiumUpgradePending ? 'მუშავდება...' : 'გაუმჯობესება'}
            </button>
          ) : (
            <div className="mt-auto rounded-full border border-white/8 bg-black/26 px-4 py-2.5 text-center text-xs font-black text-white/44">
              🔒 საჭიროა Manager Level {stadiumLevel + 1}
            </div>
          )}
        </OfficeCard>
      </div>
    </div>
  );
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-black text-white/70 transition hover:bg-white/10"
      >
        ← ოფისი
      </button>
      <h2 className="pm-office-title text-lg">{title}</h2>
    </div>
  );
}
