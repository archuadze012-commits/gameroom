'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  sellPlayManagerPlayer,
  listPlayManagerPlayer,
  unlistPlayManagerPlayer,
} from '@/app/playmanager/actions';

interface PlayerTransferActionsProps {
  playerId: string;
  marketValue: number;
  activeListing: { id: string; asking_price: number } | null;
}

export function PlayerTransferActions({
  playerId,
  marketValue,
  activeListing,
}: PlayerTransferActionsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [listPrice, setListPrice] = useState<string>('');

  function handleQuickSell() {
    if (!confirm('ნამდვილად გსურთ ფეხბურთელის სწრაფი გაყიდვა?')) return;
    startTransition(async () => {
      const res = await sellPlayManagerPlayer(playerId);
      if (res.success) {
        toast.success(res.message ?? 'ფეხბურთელი წარმატებით გაიყიდა');
        router.refresh();
      } else {
        toast.error(res.message ?? 'გაყიდვა ვერ მოხერხდა');
      }
    });
  }

  function handleList() {
    const price = Math.floor(Number(listPrice || marketValue));
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('მიუთითეთ სწორი ფასი');
      return;
    }
    startTransition(async () => {
      const res = await listPlayManagerPlayer(playerId, price);
      if (res.success) {
        toast.success(res.message ?? 'განთავსდა სატრანსფერო ბაზარზე');
        setListPrice('');
        router.refresh();
      } else {
        toast.error(res.message ?? 'განთავსება ვერ მოხერხდა');
      }
    });
  }

  function handleUnlist(listingId: string) {
    startTransition(async () => {
      const res = await unlistPlayManagerPlayer(listingId);
      if (res.success) {
        toast.success(res.message ?? 'სატრანსფერო სიიდან მოიხსნა');
        router.refresh();
      } else {
        toast.error(res.message ?? 'მოხსნა ვერ მოხერხდა');
      }
    });
  }

  return (
    <div className="space-y-3">
      {activeListing ? (
        <div className="rounded-2xl border border-amber-300/24 bg-amber-300/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/62">status</p>
              <p className="mt-1 text-sm font-black text-white">სატრანსფერო ბაზარზეა</p>
              <p className="mt-0.5 text-xs font-bold text-white/54">
                ფასი: <span className="font-black text-amber-300">{activeListing.asking_price.toLocaleString('ka-GE')} ₾</span>
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => handleUnlist(activeListing.id)}
              className="rounded-lg border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-black text-white/80 transition hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? '...' : 'მოხსნა'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-black/24 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">market listing</p>
          <p className="mt-1 text-sm font-black text-white">ბაზარზე განთავსება</p>
          
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder={String(marketValue)}
              value={listPrice}
              onChange={(e) => setListPrice(e.target.value)}
              disabled={pending}
              className="flex-1 min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-black text-white outline-none focus:border-amber-300/30 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={pending}
              onClick={handleList}
              className="shrink-0 rounded-lg border border-amber-300/24 bg-amber-300/12 px-3 py-2 text-xs font-black text-amber-50 transition hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? '...' : 'განთავსება'}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={pending || !!activeListing}
        onClick={handleQuickSell}
        className="w-full rounded-2xl border border-red-900/30 bg-red-950/30 py-2.5 text-xs font-black text-red-200 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {pending ? 'მუშავდება...' : 'სწრაფი გაყიდვა (ღირებულების 85%)'}
      </button>
    </div>
  );
}
