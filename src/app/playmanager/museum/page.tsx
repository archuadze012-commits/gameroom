import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Trophy, Star, Sparkles } from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerTrophyRoom, type Trophy as TrophyItem } from '@/lib/playmanager/archive';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';

export const dynamic = 'force-dynamic';

export default async function MuseumPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager/museum');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const trophies = await getPlayManagerTrophyRoom(team.id);
  const cupCount = trophies.filter((t) => t.kind === 'cup').length;
  const leagueCount = trophies.filter((t) => t.kind === 'league').length;

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-4">
        <PmCard>
          <PmCardHead
            icon={Trophy}
            title="ტროფეების მუზეუმი"
            subtitle={`${team.name} · მოგებული თასები და ტიტულები`}
            right={
              <div className="flex items-center gap-2">
                <PmPill tone="green">{cupCount} თასი</PmPill>
                <PmPill tone="green">{leagueCount} ტიტული</PmPill>
                <Link
                  href="/playmanager/arena"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-300/18 bg-black/44 text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/10"
                  aria-label="უკან არენაზე"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </div>
            }
          />
        </PmCard>

        {trophies.length > 0 ? (
          <div className={`grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4 ${trophies.length % 2 === 1 ? '[&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1' : ''}`}>
            {trophies.map((trophy) => (
              <TrophyCard key={trophy.id} trophy={trophy} />
            ))}
          </div>
        ) : (
          <PmCard className="items-center py-16 text-center">
            <Trophy className="mb-3 h-12 w-12 text-emerald-300/30" />
            <p className="text-lg font-black text-white/70">მუზეუმი ჯერ ცარიელია</p>
            <p className="mt-1 max-w-md text-sm font-bold text-white/38">
              მოიგე თასი ან ლიგის ტიტული და შენი პირველი ტროფი აქ გამოიფინება.
            </p>
            <Link
              href="/playmanager/league"
              className="mt-5 inline-flex items-center gap-2 self-center rounded-2xl border border-emerald-200/28 bg-emerald-300 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-200"
            >
              <Sparkles className="h-4 w-4" />
              ტურნირზე გადასვლა
            </Link>
          </PmCard>
        )}
      </div>
    </PlayManagerLightShell>
  );
}

function TrophyCard({ trophy }: { trophy: TrophyItem }) {
  return (
    <PmCard>
      <PmCardHead
        icon={trophy.kind === 'cup' ? Trophy : Star}
        title={trophy.title}
        subtitle={trophy.subtitle}
        tone="green"
      />
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <PmPill>{trophy.date || '—'}</PmPill>
        {trophy.prizeLabel ? <PmPill tone="green">{trophy.prizeLabel}</PmPill> : null}
      </div>
    </PmCard>
  );
}
