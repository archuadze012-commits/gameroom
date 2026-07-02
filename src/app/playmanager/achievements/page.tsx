import { redirect } from 'next/navigation';
import { Award, CheckCircle2, Coins, TrendingUp, Trophy, UsersRound, type LucideIcon } from 'lucide-react';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill, PmGauge } from '@/components/playmanager/pm-cards';
import { NestedMiniBox } from '@/components/playmanager/panel-primitives';
import { getTeam } from '@/lib/playmanager/team';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  getPlayManagerAchievements,
  type AchievementCategory,
  type AchievementProgress,
} from '@/lib/playmanager/achievements';

export const dynamic = 'force-dynamic';

const CATEGORY_ICON: Record<AchievementCategory, LucideIcon> = {
  match: Trophy,
  squad: UsersRound,
  economy: Coins,
  progress: TrendingUp,
};

const CATEGORY_ORDER: AchievementCategory[] = ['match', 'squad', 'economy', 'progress'];

function formatMetric(a: AchievementProgress): string {
  if (a.metric === 'balance') return `${a.current.toLocaleString('ka-GE')} / ${a.goal.toLocaleString('ka-GE')} ₾`;
  if (a.metric === 'hasLegend' || a.metric === 'divisionA') return a.unlocked ? 'შესრულებულია' : 'ჯერ არა';
  return `${a.current.toLocaleString('ka-GE')} / ${a.goal.toLocaleString('ka-GE')}`;
}

export default async function PlayManagerAchievementsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager/achievements');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const { achievements, unlockedCount, total } = await getPlayManagerAchievements(team.id);
  const completionPct = total ? Math.round((unlockedCount / total) * 100) : 0;

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1160px] space-y-4">
        {/* ── SUMMARY ── */}
        <PmCard>
          <PmCardHead
            icon={Award}
            title="მიღწევები"
            subtitle="შენი კლუბის პროგრესის ლადერი"
            right={<PmPill tone="green">{unlockedCount}/{total}</PmPill>}
          />
          <div className="grid grid-cols-3 gap-2">
            <NestedMiniBox label="გახსნილი" value={`${unlockedCount}/${total}`} />
            <NestedMiniBox label="დასრულება" value={`${completionPct}%`} />
            <NestedMiniBox label="დარჩენილი" value={String(total - unlockedCount)} />
          </div>
          <PmGauge percent={completionPct} className="mt-1" />
        </PmCard>

        {/* ── CATEGORIES ── */}
        {CATEGORY_ORDER.map((category) => {
          const items = achievements.filter((a) => a.category === category);
          if (items.length === 0) return null;
          const Icon = CATEGORY_ICON[category];
          const done = items.filter((a) => a.unlocked).length;
          return (
            <PmCard key={category}>
              <PmCardHead
                icon={Icon}
                title={ACHIEVEMENT_CATEGORY_LABELS[category]}
                subtitle={`${done}/${items.length} გახსნილი`}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-2xl border p-3.5 transition ${
                      a.unlocked
                        ? 'border-emerald-300/28 bg-emerald-300/[0.06]'
                        : 'border-white/8 bg-black/24'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate text-sm font-black text-white">
                          {a.unlocked ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> : null}
                          {a.title}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold leading-4 text-white/48">{a.description}</p>
                      </div>
                      {a.unlocked ? (
                        <PmPill tone="green">✓</PmPill>
                      ) : (
                        <span className="shrink-0 text-[11px] font-black tabular-nums text-white/40">{a.pct}%</span>
                      )}
                    </div>
                    <div className="mt-3">
                      <PmGauge percent={a.pct} />
                      <p className="mt-1.5 text-right text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                        {formatMetric(a)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </PmCard>
          );
        })}
      </div>
    </PlayManagerLightShell>
  );
}
