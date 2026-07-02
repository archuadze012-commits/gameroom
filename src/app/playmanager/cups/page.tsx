import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { getSession } from '@/lib/auth';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { processDueCupMatches } from '@/lib/playmanager/cups';
import { JoinCupButton } from './cups-client';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; tone: 'green' | 'red' | undefined }> = {
  registration: { label: 'რეგისტრაცია', tone: 'green' },
  in_progress: { label: 'მიმდინარე', tone: 'red' },
  completed: { label: 'დასრულდა', tone: undefined },
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
        <PmCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/playmanager/arena?module=matchday" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-black text-white/88 transition hover:bg-white/[0.08]">
              <ArrowLeft className="h-4 w-4" /> უკან
            </Link>
            <PmPill tone="green">{team.name} · D{team.division_id}</PmPill>
          </div>
          <PmCardHead icon={Trophy} title="ყოველდღიური თასები" subtitle="cups" tone="green" />
          <p className="max-w-2xl text-sm font-bold leading-6 text-white/50">
            ნოკ-აუტ თასები რეალურ მენეჯერებთან. დარეგისტრირდი — თასი იწყება როცა საკმარისი გუნდი შეიკრიბება.
          </p>
        </PmCard>

        {cups.length === 0 ? (
          <PmCard className="text-center">
            <p className="text-sm font-bold text-white/50">ამჟამად ხელმისაწვდომი თასი არ არის.</p>
          </PmCard>
        ) : (
          // Cup cards are text-dense (title + fee stats + register/view buttons) —
          // too narrow to survive a 2-up mobile grid, unlike simple photo/stat tiles.
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {cups.map((cup) => {
              const meta = STATUS_META[cup.status];
              return (
                <PmCard key={cup.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-white">{cup.name}</h2>
                      <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/42">
                        საპრიზო {cup.prizePoolLabel} · შესვლა {cup.entryFeeLabel}
                      </p>
                    </div>
                    <PmPill tone={meta.tone}>{meta.label}</PmPill>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <PmPill>{cup.participantCount} / {cup.maxTeams} გუნდი</PmPill>
                    <div className="flex items-center gap-2">
                      {cup.status === 'registration' && !cup.isRegistered ? (
                        <JoinCupButton cupId={cup.id} entryFeeLabel={cup.entryFeeLabel} />
                      ) : cup.isRegistered && cup.status === 'registration' ? (
                        <PmPill tone="green">დარეგისტრირებული</PmPill>
                      ) : null}
                      <Link
                        href={`/playmanager/cups/${cup.templateId}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 px-4 text-sm font-black text-white/80 transition hover:bg-black/50"
                      >
                        ნახვა
                      </Link>
                    </div>
                  </div>
                </PmCard>
              );
            })}
          </div>
        )}
      </div>
    </PlayManagerLightShell>
  );
}
