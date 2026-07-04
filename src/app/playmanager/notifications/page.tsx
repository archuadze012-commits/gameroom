import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  Bell,
  Coins,
  GraduationCap,
  Megaphone,
  ShieldCheck,
  Trophy,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { getTeam } from '@/lib/playmanager/team';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getPlayManagerNotifications,
  markPlayManagerNotificationsSeen,
  type NotificationCategory,
} from '@/lib/playmanager/notifications';

export const dynamic = 'force-dynamic';

const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
  match: Trophy,
  medical: Stethoscope,
  finance: Coins,
  academy: GraduationCap,
  media: Megaphone,
  board: ShieldCheck,
  system: Activity,
};

const ACCENT_STYLE: Record<'green' | 'red' | 'gold', string> = {
  green: 'border-emerald-300/22 bg-emerald-300/10 text-emerald-100',
  red: 'border-red-300/22 bg-red-300/10 text-red-100',
  gold: 'border-amber-300/22 bg-amber-300/10 text-amber-100',
};

export default async function PlayManagerNotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager/notifications');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  // Compute unread state against the current seen-at, THEN mark seen so this
  // visit clears the badge but still shows what was new.
  const { items, unreadCount } = await getPlayManagerNotifications(team.id);
  await markPlayManagerNotificationsSeen(team.id);

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[900px] space-y-4">
        <PmCard>
          <PmCardHead
            icon={Bell}
            title="შეტყობინებები"
            subtitle="მატჩები, ტრანსფერები, აკადემია და კლუბის მოვლენები"
            right={unreadCount > 0 ? <PmPill tone="green">{unreadCount} ახალი</PmPill> : <PmPill>ყველა ნანახია</PmPill>}
          />
        </PmCard>

        <PmCard>
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm font-bold text-white/40">ჯერ შეტყობინებები არ არის.</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((n) => {
                const Icon = CATEGORY_ICON[n.category] ?? Activity;
                const className = `flex items-start gap-3 rounded-2xl border px-3 py-2.5 transition ${
                  n.unread ? 'border-emerald-300/28 bg-emerald-300/[0.06]' : 'border-white/8 bg-black/24'
                } ${n.href ? 'hover:border-emerald-300/40 hover:bg-emerald-300/[0.09]' : ''}`;
                const content = (
                  <>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${ACCENT_STYLE[n.accent] ?? ACCENT_STYLE.green}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-start gap-2 text-[13px] font-black leading-tight text-white">
                        <span className="min-w-0 break-words">{n.title}</span>
                        {n.unread ? <span className="mt-0.5 shrink-0 rounded-full bg-emerald-400/90 px-1.5 py-px text-[8px] font-black uppercase tracking-wide text-black">new</span> : null}
                      </p>
                      {n.detail ? <p className="mt-0.5 text-[11px] font-bold leading-4 text-white/55">{n.detail}</p> : null}
                    </div>
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
                      კვ {n.weekNo} · დღე {n.dayNo}
                    </span>
                  </>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id} className={className}>
                    {content}
                  </div>
                );
              })}
            </div>
          )}
        </PmCard>
      </div>
    </PlayManagerLightShell>
  );
}
