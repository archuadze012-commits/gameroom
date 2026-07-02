'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Play, UserPlus } from 'lucide-react';
import { PmCard } from '@/components/playmanager/pm-cards';
import {
  createPlayManagerLeague,
  joinPlayManagerLeague,
  startPlayManagerLeague,
} from '@/app/playmanager/actions';

function errText(error?: string): string {
  switch (error) {
    case 'registration_closed': return 'რეგისტრაცია დახურულია';
    case 'league_full': return 'ლიგა სავსეა';
    case 'already_registered': return 'უკვე დარეგისტრირებული ხარ';
    case 'not_enough_teams': return 'მინ. 2 გუნდი სჭირდება';
    case 'already_started': return 'უკვე დაწყებულია';
    case 'forbidden': return 'მხოლოდ ადმინს შეუძლია';
    case 'team_missing': return 'ჯერ გუნდი შექმენი';
    default: return 'ვერ მოხერხდა';
  }
}

export function JoinLeagueButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const r = await joinPlayManagerLeague(leagueId);
        if (r.success) { toast.success('დარეგისტრირდი'); router.refresh(); }
        else toast.error(errText(r.error));
      })}
      className="pm-office-act pm-office-act--green disabled:cursor-not-allowed disabled:opacity-50"
    >
      <UserPlus className="h-4 w-4" />
      {pending ? '...' : 'რეგისტრაცია'}
    </button>
  );
}

export function StartLeagueButton({ leagueId }: { leagueId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const r = await startPlayManagerLeague(leagueId);
        if (r.success) { toast.success('ლიგა დაიწყო'); router.refresh(); }
        else toast.error(errText(r.error));
      })}
      className="pm-office-act pm-office-act--green disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Play className="h-4 w-4" />
      {pending ? '...' : 'დაწყება'}
    </button>
  );
}

export function CreateLeagueForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'round_robin' | 'knockout'>('round_robin');
  const [divisionLevel, setDivisionLevel] = useState(4);
  const [maxTeams, setMaxTeams] = useState(8);
  const [prizePool, setPrizePool] = useState(500000);

  return (
    <PmCard>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">admin</p>
        <p className="mt-1 text-lg font-black text-white">ახალი ჩემპიონატის შექმნა</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="სახელი (მაგ. D დივიზიონი — სეზონი 1)"
          className="sm:col-span-2 rounded-xl border border-white/10 bg-black/30 px-3 h-10 text-sm font-bold text-white outline-none focus:border-emerald-400/40"
        />
        <label className="sm:col-span-2 flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/24 px-3 h-10 text-xs font-black text-white/60">
          ფორმატი
          <select value={format} onChange={(e) => setFormat(e.target.value as 'round_robin' | 'knockout')} className="bg-transparent text-white outline-none">
            <option value="round_robin">ჩემპიონატი (round-robin)</option>
            <option value="knockout">ევრო ტურნირი (knockout)</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/24 px-3 h-10 text-xs font-black text-white/60">
          დივიზიონი
          <select value={divisionLevel} onChange={(e) => setDivisionLevel(Number(e.target.value))} className="bg-transparent text-white outline-none">
            <option value={1}>A (1)</option>
            <option value={2}>B (2)</option>
            <option value={3}>C (3)</option>
            <option value={4}>D (4)</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/24 px-3 h-10 text-xs font-black text-white/60">
          მაქს. გუნდი
          <input type="number" min={2} max={20} value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} className="w-16 bg-transparent text-right text-white outline-none" />
        </label>
        <label className="sm:col-span-2 flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/24 px-3 h-10 text-xs font-black text-white/60">
          პრიზი (₾)
          <input type="number" min={0} step={50000} value={prizePool} onChange={(e) => setPrizePool(Number(e.target.value))} className="w-32 bg-transparent text-right text-white outline-none" />
        </label>
      </div>
      <button
        type="button"
        disabled={pending || !name.trim()}
        onClick={() => startTransition(async () => {
          const r = await createPlayManagerLeague({ name: name.trim(), divisionLevel, maxTeams, prizePool, format });
          if (r.success) { toast.success('ჩემპიონატი შეიქმნა'); setName(''); router.refresh(); }
          else toast.error(errText(r.error));
        })}
        className="pm-office-act pm-office-act--green disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {pending ? '...' : 'შექმნა'}
      </button>
    </PmCard>
  );
}
