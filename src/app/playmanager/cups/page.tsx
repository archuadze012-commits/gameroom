import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
import { getSession } from '@/lib/auth';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import { JoinCupButton } from './cups-client';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; tone: string }> = {
  registration: { label: 'რეგისტრაცია', tone: 'border-emerald-300/24 bg-emerald-300/10 text-emerald-100' },
  in_progress: { label: 'მიმდინარე', tone: 'border-amber-300/24 bg-amber-300/10 text-amber-100' },
  completed: { label: 'დასრულდა', tone: 'border-white/14 bg-white/[0.05] text-white/60' },
};

export default async function PlayManagerCupsPage() {
  // Lazy: start stale cups (real teams only) and play due fixtures.
  await processDueCupMatches();

  const user = await getSession();
  if (!user) redirect('/auth/login?next=/playmanager/cups');
  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const snapshot = await getPlayManagerCitySnapshot(team.id);
  const cups = snapshot.cups;

  return (
    <PlayManagerLightShell>
      <div className="mx-auto w-full max-w-[1100px] space-y-4">
        <SpotlightCard fillHeight={false} className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(8,22,16,0.94),rgba(4,8,6,0.98))] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/playmanager/arena?module=matchday" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]">
              <ArrowLeft className="h-4 w-4" /> უკან
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-sm font-black text-emerald-100">
              {team.name} · D{team.division_id}
            </span>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-300/24 bg-amber-300/12 text-amber-100">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/62">cups</p>
              <h1 className="text-3xl font-black text-white">ყოველდღიური თასები</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/50">
            ნოკ-აუტ თასები რეალურ მენეჯერებთან. დარეგისტრირდი — თასი იწყება როცა საკმარისი გუნდი შეიკრიბება.
          </p>
        </SpotlightCard>

        {cups.length === 0 ? (
          <SpotlightCard fillHeight={false} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-8 text-center">
            <p className="text-sm font-bold text-white/50">ამჟამად ხელმისაწვდომი თასი არ არის.</p>
          </SpotlightCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cups.map((cup) => {
              const meta = STATUS_META[cup.status];
              return (
                <SpotlightCard key={cup.id} fillHeight={false} className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-white">{cup.name}</h2>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                        საპრიზო {cup.prizePoolLabel} · შესვლა {cup.entryFeeLabel}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${meta.tone}`}>{meta.label}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-black text-white/70">
                      {cup.participantCount} / {cup.maxTeams} გუნდი
                    </span>
                    <div className="flex items-center gap-2">
                      {cup.status === 'registration' && !cup.isRegistered ? (
                        <JoinCupButton cupId={cup.id} entryFeeLabel={cup.entryFeeLabel} />
                      ) : cup.isRegistered && cup.status === 'registration' ? (
                        <span className="rounded-xl border border-emerald-300/24 bg-emerald-300/10 px-4 h-10 inline-flex items-center text-sm font-black text-emerald-100">დარეგისტრირებული</span>
                      ) : null}
                      <Link
                        href={`/playmanager/cups/${cup.templateId}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-black text-white/80 transition hover:bg-black/50"
                      >
                        ნახვა
                      </Link>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        )}
      </div>
    </PlayManagerLightShell>
  );
}
