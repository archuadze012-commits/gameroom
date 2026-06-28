import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { PackShopClient, type ShopPack } from './pack-shop-client';

export const dynamic = 'force-dynamic';

type LooseDb = {
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
  from: (table: string) => {
    select: (columns: string) => {
      order: (column: string, options?: { ascending?: boolean }) => {
        returns: <T>() => Promise<{ data: T | null }>;
      };
    };
  };
};

export default async function PlayManagerShopPage() {
  const db = (await createSupabaseServerClient()) as unknown as LooseDb;
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) {
    redirect('/auth/login?next=/playmanager/shop');
  }

  const team = await getTeam(userData.user.id);
  if (!team) {
    redirect('/playmanager');
  }

  const { data: packRows } = await db
    .from('pm_packs')
    .select('id,name,description,cost_pm,player_count,rarity_weights')
    .order('cost_pm', { ascending: true })
    .returns<ShopPack[]>();
  const packs = packRows ?? [];

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-4">
        <SpotlightCard
          fillHeight={false}
          className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,22,16,0.94),rgba(4,8,6,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/playmanager"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-4 w-4" />
              უკან
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-sm font-black text-amber-100">
              ბალანსი: {team.balance.toLocaleString('ka-GE')} ₾
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-300/24 bg-amber-300/12 text-amber-100">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">shop</p>
              <h1 className="text-3xl font-black text-white">ბარათების მაღაზია</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/50">
            გახსენი პაკები რეალური მოთამაშეების მოსაპოვებლად. Pro-კლასის ბარათები (ტალანტი 1–3) გამოიყენე
            მოთამაშეების OVR აფგრეიდის დასადასტურებლად.
          </p>
        </SpotlightCard>

        {packs.length === 0 ? (
          <SpotlightCard
            fillHeight={false}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-center"
          >
            <p className="text-sm font-bold text-white/50">პაკები ჯერ ხელმისაწვდომი არ არის.</p>
          </SpotlightCard>
        ) : (
          <PackShopClient packs={packs} balance={team.balance} />
        )}
      </div>
    </PlayManagerLightShell>
  );
}
