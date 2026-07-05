'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUpCircle, ExternalLink, GraduationCap, Search, Sparkles, Users } from 'lucide-react';
import { PmCard, PmCardHead, PmPill, PmAction, PmGauge } from '@/components/playmanager/pm-cards';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import { runPlayManagerCityAction } from '@/app/playmanager/actions/city-action';
import { signPlayManagerAcademyProspect } from '@/app/playmanager/actions/market-actions';
import { hirePlayManagerStaff, upgradePlayManagerStaff } from '@/app/playmanager/actions/staff-actions';

export type AcademyScout = {
  isHired: boolean;
  level: number;
  maxLevel: number;
  hireCostLabel: string;
  upgradeCostLabel: string | null;
  weeklyWageLabel: string;
  benefitLabel: string;
};

export type AcademyProspect = {
  id: string;
  playerId: string | null;
  name: string;
  position: string;
  age: number;
  talent: number;
  ovr: number;
  potential: number;
  signingCostLabel: string;
};

type Props = {
  teamName: string;
  divisionLabel: string;
  balanceLabel: string;
  academyLevel: number;
  youthScoutLevel: number;
  prospectTarget: number;
  talentCap: number;
  upgradeCostLabel: string;
  canUpgrade: boolean;
  nextLevelPreview: { count: number };
  prospects: AcademyProspect[];
  scout: AcademyScout | null;
};

export function AcademyClient({
  teamName,
  divisionLabel,
  balanceLabel,
  academyLevel,
  youthScoutLevel,
  prospectTarget,
  talentCap,
  upgradeCostLabel,
  canUpgrade,
  nextLevelPreview,
  prospects,
  scout,
}: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function upgrade() {
    setBusyId('upgrade');
    startTransition(async () => {
      const r = await runPlayManagerCityAction({ spriteKey: 'academy', action: 'facility_upgrade' });
      setBusyId(null);
      if (r.success) { toast.success('აკადემია გაუმჯობესდა'); router.refresh(); }
      else toast.error(r.error === 'insufficient_funds' ? 'საკმარისი თანხა არ არის' : 'ვერ მოხერხდა');
    });
  }

  function sign(prospectId: string) {
    setBusyId(prospectId);
    startTransition(async () => {
      const r = await signPlayManagerAcademyProspect(prospectId);
      setBusyId(null);
      if (r.success) { toast.success(r.message ?? 'ხელი მოეწერა'); router.refresh(); }
      else toast.error(r.error === 'insufficient_funds' ? 'საკმარისი თანხა არ არის' : 'ვერ მოხერხდა');
    });
  }

  function scoutAction(kind: 'hire' | 'upgrade') {
    setBusyId('scout');
    startTransition(async () => {
      const r = kind === 'hire'
        ? await hirePlayManagerStaff('youth_scout')
        : await upgradePlayManagerStaff('youth_scout');
      setBusyId(null);
      if (r.success) { toast.success(r.message ?? (kind === 'hire' ? 'სკაუტი დაქირავდა' : 'სკაუტი გაუმჯობესდა')); router.refresh(); }
      else toast.error(r.error === 'insufficient_funds' ? 'საკმარისი თანხა არ არის' : 'ვერ მოხერხდა');
    });
  }

  return (
    <div className="pm-feedskin mx-auto w-full max-w-[1100px] space-y-4">
      {/* Header */}
      <PmCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/playmanager" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]">
            <ArrowLeft className="h-4 w-4" /> უკან
          </Link>
          <PmPill tone="green">{teamName} · {divisionLabel} · {balanceLabel}</PmPill>
        </div>
        <PmCardHead icon={GraduationCap} title="აკადემია" subtitle="academy" />
      </PmCard>

      {/* 1 — BUILDING OPERATIONS (top) */}
      <PmCard>
        <PmCardHead icon={ArrowUpCircle} title="შენობის ოპერაციები" subtitle="building operations" />

        <div className="flex flex-wrap gap-2">
          <PmPill tone="green">აკადემიის დონე · LVL {academyLevel}</PmPill>
          <PmPill tone="green">ტალანტების ლიმიტი · {prospects.length} / {prospectTarget}</PmPill>
          <PmPill tone="green">ხარისხის ჭერი · ≤ {talentCap}</PmPill>
          <PmPill>აკად. სკაუტი LVL {youthScoutLevel}</PmPill>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-emerald-300/18 bg-emerald-300/[0.05] p-4">
          <div className="min-w-0">
            <p className="text-sm font-black text-white">აკადემიის გაუმჯობესება</p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-white/52">
              მომდევნო დონე → {nextLevelPreview.count} ტალანტი + უფრო სწრაფი განვითარება. ხარისხის ჭერი აკადემიის სკაუტზეა (პერსონალი).
            </p>
          </div>
          {canUpgrade ? (
            <PmAction tone="green" onClick={upgrade} disabled={busy}>
              <ArrowUpCircle className="h-4 w-4" />
              {busyId === 'upgrade' && busy ? '...' : `გაუმჯობესება · ${upgradeCostLabel}`}
            </PmAction>
          ) : (
            <span className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 h-11 inline-flex items-center text-sm font-black text-white/55">მაქს. დონე</span>
          )}
        </div>
      </PmCard>

      {/* 2 — TALENTS (below operations) */}
      <PmCard>
        <PmCardHead icon={Users} title="ტალანტები" subtitle="talents" />
        <p className="text-[11px] font-bold leading-5 text-white/52">
          ნამდვილი ახალგაზრდები (real ასაკი ≤19), აკადემიაში 15 წლის ასაკით. Pro-კლასი (≤3) გამორიცხულია — ის მხოლოდ fodder-ია. <b className="text-white/75">აკადემიის სკაუტი</b> განსაზღვრავს ხარისხს (ჭერი 4–{talentCap}),
          <b className="text-white/75"> აკადემიის დონე</b> — რაოდენობას და განვითარების სიჩქარეს. ხელმოწერა მოთამაშეს პირდაპირ გუნდში გადაიყვანს.
        </p>

        {prospects.length === 0 ? (
          <p className="text-sm font-bold text-white/50">ამჟამად ტალანტი არ არის — დაელოდე ან გააუმჯობესე აკადემია.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prospects.map((p) => {
              const matured = p.ovr >= p.potential;
              const devPct = p.potential > p.ovr ? Math.round(((p.ovr - 40) / Math.max(1, p.potential - 40)) * 100) : 100;
              return (
                <PmCard key={p.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-white">{p.name}</p>
                    {matured ? <PmPill tone="green">მზად</PmPill> : null}
                  </div>
                  <div><TalentClassBadge talent={p.talent} showValue /></div>
                  <div className="flex flex-wrap gap-2">
                    <PmPill>POS {p.position}</PmPill>
                    <PmPill tone="green">OVR {p.ovr}</PmPill>
                    <PmPill tone="green">POT {p.potential}</PmPill>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.12em] text-white/35">
                      <span>განვითარება</span>
                      <span>{p.ovr} → {p.potential}</span>
                    </div>
                    <PmGauge percent={devPct} />
                  </div>
                  <p className="text-[11px] font-bold text-white/48">{p.age} წლის · {matured ? 'მზადაა მთავარ გუნდში' : 'ვითარდება'}</p>
                  <div className="mt-auto space-y-2">
                    <PmAction tone="green" onClick={() => sign(p.id)} disabled={busy} className="w-full">
                      {busyId === p.id && busy ? 'მუშავდება...' : `ხელმოწერა ${p.signingCostLabel}`}
                    </PmAction>
                    {p.playerId ? (
                      <Link
                        href={`/playmanager/players/${p.playerId}`}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/70 transition hover:border-emerald-300/20 hover:text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> პროფილი
                      </Link>
                    ) : null}
                  </div>
                </PmCard>
              );
            })}
          </div>
        )}
      </PmCard>

      {/* 3 — ACADEMY SCOUT (very bottom) — hire/upgrade without leaving the page */}
      {scout ? (
        <PmCard>
          <PmCardHead
            icon={Search}
            title="აკადემიის სკაუტი"
            subtitle="academy scout"
            right={scout.isHired ? <PmPill tone="green">LVL {scout.level}/{scout.maxLevel}</PmPill> : undefined}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-[11px] font-bold leading-5 text-white/52">
              {scout.benefitLabel} · ხელფასი {scout.weeklyWageLabel}/კვ. სკაუტი ზრდის აკადემიის ტალანტების <b className="text-white/75">ხარისხის ჭერს</b>.
            </p>
            {!scout.isHired ? (
              <PmAction tone="green" onClick={() => scoutAction('hire')} disabled={busy}>
                <Sparkles className="h-4 w-4" />
                {busyId === 'scout' && busy ? '...' : `დაქირავება · ${scout.hireCostLabel}`}
              </PmAction>
            ) : scout.level < scout.maxLevel && scout.upgradeCostLabel ? (
              <PmAction tone="green" onClick={() => scoutAction('upgrade')} disabled={busy}>
                <Sparkles className="h-4 w-4" />
                {busyId === 'scout' && busy ? '...' : `გაუმჯობესება · ${scout.upgradeCostLabel}`}
              </PmAction>
            ) : (
              <span className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 h-11 inline-flex items-center text-sm font-black text-white/55">მაქს. დონე</span>
            )}
          </div>
        </PmCard>
      ) : null}
    </div>
  );
}
