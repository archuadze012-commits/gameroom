import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Trophy } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PlayManagerLightShell } from '@/components/playmanager/playmanager-light-shell';
import { PmCard, PmCardHead, PmPill } from '@/components/playmanager/pm-cards';
import { getSession } from '@/lib/auth';
import { getTeam } from '@/lib/playmanager/team';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { processDueCupMatches } from '@/lib/playmanager/cups';

export const dynamic = 'force-dynamic';

function getCupPhoto(templateId: string): { src: string; position: string } {
  if (templateId === 'champions_cup') {
    return { src: '/playmanager/module-cards/arena/euro-cups.webp', position: '50% 50%' };
  }
  if (templateId === 'golden_eagle') {
    return { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '16% 50%' };
  }
  if (templateId === 'silver_arrow') {
    return { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '42% 50%' };
  }
  if (templateId === 'bronze_shield') {
    return { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '66% 50%' };
  }
  if (templateId === 'iron_boot') {
    return { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '88% 50%' };
  }
  return { src: '/playmanager/module-cards/arena/daily-cups.webp', position: '88% 50%' };
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  registration: { label: 'ღიაა', cls: 'border-emerald-300/26 bg-emerald-300/10 text-emerald-100' },
  in_progress: { label: 'მიმდინარე', cls: 'border-rose-400/26 bg-rose-400/10 text-rose-100' },
  completed: { label: 'დასრულებული', cls: 'border-white/12 bg-white/[0.05] text-white/55' },
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
        </PmCard>

        {cups.length === 0 ? (
          <PmCard className="text-center">
            <p className="text-sm font-bold text-white/50">ამჟამად ხელმისაწვდომი თასი არ არის.</p>
          </PmCard>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-3">
            {cups.map((cup) => {
              const photo = getCupPhoto(cup.templateId);
              const meta = STATUS_META[cup.status] ?? { label: 'თასი', cls: 'border-white/12 bg-white/5 text-white/70' };
              return (
                <Link
                  key={cup.id}
                  href={`/playmanager/cups/${cup.templateId}`}
                  className="pubg-loadout-link group block w-full"
                >
                  <div className="pubg-loadout-card relative aspect-[4/3] overflow-hidden">
                    <div className="absolute inset-[5px] overflow-hidden rounded-[12px]">
                      <Image
                        src={photo.src}
                        alt={cup.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        style={{ objectPosition: photo.position }}
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/40 to-transparent" />
                    </div>

                    <div className="absolute inset-[5px] z-10 flex h-[calc(100%-10px)] flex-col p-2.5 sm:p-4">
                      <div className="flex items-start justify-end">
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em] backdrop-blur-md ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </div>

                      <div className="mt-auto">
                        <h4 className="line-clamp-2 text-[12px] sm:text-[15px] font-black uppercase tracking-[0.04em] text-white drop-shadow-md leading-tight">
                          {cup.name}
                        </h4>
                        <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-[11px] font-bold text-white/70 drop-shadow">
                          საპრიზო {cup.prizePoolLabel}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PlayManagerLightShell>
  );
}
