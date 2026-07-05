'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { renewPlayManagerCareer, releasePlayManagerCareer } from '@/app/playmanager/actions/career-actions';

export function CareerDecisionButtons({ playerId }: { playerId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: 'renew' | 'release') {
    startTransition(async () => {
      const result = action === 'renew'
        ? await renewPlayManagerCareer(playerId)
        : await releasePlayManagerCareer(playerId);
      if (result.success) {
        toast.success(result.message ?? 'შესრულდა');
        router.refresh();
      } else {
        toast.error(result.error === 'insufficient_funds' ? 'საკმარისი თანხა არ არის' : 'ვერ მოხერხდა');
      }
    });
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => run('renew')}
        disabled={pending}
        className="h-9 flex-1 rounded-lg border border-emerald-300/24 bg-emerald-300/12 px-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-300/18 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '...' : 'გაგრძელება (½ ფასი)'}
      </button>
      <button
        type="button"
        onClick={() => run('release')}
        disabled={pending}
        className="h-9 flex-1 rounded-lg border border-white/12 bg-white/[0.05] px-3 text-xs font-black text-white/75 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '...' : 'დამშვიდობება (⅓)'}
      </button>
    </div>
  );
}
