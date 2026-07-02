import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
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
      <div className="pm-feedskin mx-auto w-full max-w-[1100px] space-y-4">
        <PmCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/playmanager"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-4 w-4" />
              უკან
            </Link>
            <PmPill tone="green">ბალანსი: {team.balance.toLocaleString('ka-GE')} ₾</PmPill>
          </div>

          <PmCardHead
            icon={Store}
            title="ბარათების მაღაზია"
            subtitle="shop"
          />
          <p className="max-w-2xl text-sm font-bold leading-6 text-white/50">
            გახსენი პაკები რეალური მოთამაშეების მოსაპოვებლად. Pro-კლასის ბარათები (ტალანტი 1–3) გამოიყენე
            მოთამაშეების OVR აფგრეიდის დასადასტურებლად.
          </p>
        </PmCard>

        {packs.length === 0 ? (
          <PmCard className="text-center">
            <p className="text-sm font-bold text-white/50">პაკები ჯერ ხელმისაწვდომი არ არის.</p>
          </PmCard>
        ) : (
          <PackShopClient packs={packs} balance={team.balance} />
        )}
      </div>
    </PlayManagerLightShell>
  );
}
