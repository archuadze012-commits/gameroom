'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { joinCupAction } from '@/app/playmanager/actions';

export function JoinCupButton({ cupId, entryFeeLabel }: { cupId: string; entryFeeLabel: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const r = await joinCupAction(cupId);
        if (r.success) { toast.success(r.message ?? 'დარეგისტრირდი'); router.refresh(); }
        else toast.error(r.error ?? 'ვერ მოხერხდა');
      })}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300/24 bg-emerald-300/12 px-4 h-10 text-sm font-black text-emerald-50 transition hover:bg-emerald-300/18 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <UserPlus className="h-4 w-4" />
      {pending ? '...' : `მონაწილეობა · ${entryFeeLabel}`}
    </button>
  );
}
