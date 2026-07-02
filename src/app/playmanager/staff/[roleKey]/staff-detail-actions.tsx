'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PmAction, PmPill } from '@/components/playmanager/pm-cards';
import { hirePlayManagerStaff, upgradePlayManagerStaff } from '@/app/playmanager/actions';

export function StaffDetailActions({
  roleKey,
  isHired,
  canUpgrade,
  capReached,
  hireCostLabel,
  upgradeCostLabel,
}: {
  roleKey: string;
  isHired: boolean;
  canUpgrade: boolean;
  capReached: boolean;
  hireCostLabel: string;
  upgradeCostLabel: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<{ success: boolean; message?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(result.message ?? (result.success ? 'შესრულდა' : 'ვერ შესრულდა'));
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t border-white/8 pt-4">
      {message ? (
        <div className="rounded-2xl border border-emerald-300/22 bg-emerald-300/[0.08] px-4 py-2.5 text-xs font-black text-emerald-100">
          {message}
        </div>
      ) : null}

      {!isHired ? (
        <PmAction tone="green" disabled={pending} onClick={() => run(() => hirePlayManagerStaff(roleKey))} className="w-full justify-center">
          {pending ? 'მუშავდება...' : `დაქირავება · ${hireCostLabel}`}
        </PmAction>
      ) : canUpgrade ? (
        <PmAction tone="green" disabled={pending} onClick={() => run(() => upgradePlayManagerStaff(roleKey))} className="w-full justify-center">
          {pending ? 'მუშავდება...' : `აფგრეიდი · ${upgradeCostLabel}`}
        </PmAction>
      ) : (
        <div className="flex items-center justify-center">
          <PmPill>{capReached ? 'მაქსიმალურ დონეზეა' : 'დაქირავებულია'}</PmPill>
        </div>
      )}
    </div>
  );
}
