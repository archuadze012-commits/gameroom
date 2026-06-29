'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUpCircle, ExternalLink, GraduationCap, Sparkles, Users } from 'lucide-react';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import { TalentClassBadge } from '@/components/playmanager/talent-class-badge';
import { runPlayManagerCityAction, signPlayManagerAcademyProspect, hirePlayManagerStaff, upgradePlayManagerStaff } from '@/app/playmanager/actions';

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
    <div className="mx-auto w-full max-w-[1100px] space-y-4">
      {/* Header */}
      <SpotlightCard fillHeight={false} className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,22,16,0.94),rgba(4,8,6,0.98))] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/playmanager" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]">
            <ArrowLeft className="h-4 w-4" /> უკან
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-black text-emerald-100">
            {teamName} · {divisionLabel} · {balanceLabel}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-300/24 bg-emerald-300/12 text-emerald-100">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">academy</p>
            <h1 className="text-3xl font-black text-white">აკადემია</h1>
          </div>
        </div>
      </SpotlightCard>

      {/* 1 — BUILDING OPERATIONS (top) */}
      <SpotlightCard fillHeight={false} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">building operations</p>
        <h2 className="mt-1 text-xl font-black text-white">შენობის ოპერაციები</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <OpStat label="აკადემიის დონე" value={`LVL ${academyLevel}`} sub="რაოდენობა + სიჩქარე" />
          <OpStat label="ტალანტების ლიმიტი" value={`${prospects.length} / ${prospectTarget}`} sub="2 + დონე" />
          <OpStat label="ხარისხის ჭერი" value={`≤ ${talentCap}`} sub={`აკად. სკაუტი LVL ${youthScoutLevel}`} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-amber-300/18 bg-amber-300/[0.05] p-4">
          <div className="min-w-0">
            <p className="text-sm font-black text-white">აკადემიის გაუმჯობესება</p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-white/52">
              მომდევნო დონე → {nextLevelPreview.count} ტალანტი + უფრო სწრაფი განვითარება. ხარისხის ჭერი აკადემიის სკაუტზეა (პერსონალი).
            </p>
          </div>
          {canUpgrade ? (
            <button
              type="button"
              onClick={upgrade}
              disabled={busy}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/16 px-4 text-sm font-black text-amber-50 transition hover:bg-amber-300/24 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUpCircle className="h-4 w-4" />
              {busyId === 'upgrade' && busy ? '...' : `გაუმჯობესება · ${upgradeCostLabel}`}
            </button>
          ) : (
            <span className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 h-11 inline-flex items-center text-sm font-black text-white/55">მაქს. დონე</span>
          )}
        </div>
      </SpotlightCard>

      {/* 2 — TALENTS (below operations) */}
      <SpotlightCard fillHeight={false} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-200" />
          <h2 className="text-xl font-black text-white">ტალანტები</h2>
        </div>
        <p className="mt-2 text-[11px] font-bold leading-5 text-white/52">
          ნამდვილი ახალგაზრდები (real ასაკი ≤19), აკადემიაში 15 წლის ასაკით. <b className="text-white/75">აკადემიის სკაუტი</b> განსაზღვრავს ხარისხს (ჭერი ≤{talentCap}),
          <b className="text-white/75"> აკადემიის დონე</b> — რაოდენობას და განვითარების სიჩქარეს. ხელმოწერა მოთამაშეს პირდაპირ გუნდში გადაიყვანს.
        </p>

        {prospects.length === 0 ? (
          <p className="mt-5 text-sm font-bold text-white/50">ამჟამად ტალანტი არ არის — დაელოდე ან გააუმჯობესე აკადემია.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prospects.map((p) => {
              const matured = p.ovr >= p.potential;
              const devPct = p.potential > p.ovr ? Math.round(((p.ovr - 40) / Math.max(1, p.potential - 40)) * 100) : 100;
              return (
                <div key={p.id} className="rounded-[20px] border border-white/8 bg-black/24 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-black text-white">{p.name}</p>
                    {matured ? (
                      <span className="rounded-full border border-emerald-300/30 bg-emerald-300/12 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">მზად</span>
                    ) : null}
                  </div>
                  <div className="mt-2"><TalentClassBadge talent={p.talent} showValue /></div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniBox label="POS" value={p.position} />
                    <MiniBox label="OVR" value={String(p.ovr)} />
                    <MiniBox label="POT" value={String(p.potential)} />
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.12em] text-white/35">
                      <span>განვითარება</span>
                      <span>{p.ovr} → {p.potential}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${matured ? 'bg-emerald-400' : 'bg-[linear-gradient(90deg,#22c55e,#f59e0b)]'}`} style={{ width: `${Math.max(0, Math.min(100, devPct))}%` }} />
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] font-bold text-white/48">{p.age} წლის · {matured ? 'მზადაა მთავარ გუნდში' : 'ვითარდება'}</p>
                  <button
                    type="button"
                    onClick={() => sign(p.id)}
                    disabled={busy}
                    className="mt-3 w-full rounded-xl border border-emerald-300/18 bg-emerald-300/10 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-300/16 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {busyId === p.id && busy ? 'მუშავდება...' : `ხელმოწერა ${p.signingCostLabel}`}
                  </button>
                  {p.playerId ? (
                    <Link
                      href={`/playmanager/players/${p.playerId}`}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-black text-white/70 transition hover:border-emerald-300/20 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> პროფილი
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </SpotlightCard>

      {/* 3 — ACADEMY SCOUT (very bottom) — hire/upgrade without leaving the page */}
      {scout ? (
        <SpotlightCard fillHeight={false} className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(56,189,248,0.08),rgba(255,255,255,0.02))] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/62">academy scout</p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">
                აკადემიის სკაუტი
                {scout.isHired ? <span className="ml-2 text-sm text-white/45">LVL {scout.level}/{scout.maxLevel}</span> : null}
              </h2>
              <p className="mt-1 text-[11px] font-bold leading-5 text-white/52">
                {scout.benefitLabel} · ხელფასი {scout.weeklyWageLabel}/კვ. სკაუტი ზრდის აკადემიის ტალანტების <b className="text-white/75">ხარისხის ჭერს</b>.
              </p>
            </div>
            {!scout.isHired ? (
              <button
                type="button"
                onClick={() => scoutAction('hire')}
                disabled={busy}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/14 px-4 text-sm font-black text-sky-50 transition hover:bg-sky-300/22 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {busyId === 'scout' && busy ? '...' : `დაქირავება · ${scout.hireCostLabel}`}
              </button>
            ) : scout.level < scout.maxLevel && scout.upgradeCostLabel ? (
              <button
                type="button"
                onClick={() => scoutAction('upgrade')}
                disabled={busy}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/14 px-4 text-sm font-black text-sky-50 transition hover:bg-sky-300/22 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {busyId === 'scout' && busy ? '...' : `გაუმჯობესება · ${scout.upgradeCostLabel}`}
              </button>
            ) : (
              <span className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-4 h-11 inline-flex items-center text-sm font-black text-white/55">მაქს. დონე</span>
            )}
          </div>
        </SpotlightCard>
      ) : null}
    </div>
  );
}

function OpStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/24 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-1.5 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-white/45">{sub}</p>
    </div>
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-2 py-1.5">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-0.5 text-sm font-black text-white">{value}</p>
    </div>
  );
}
