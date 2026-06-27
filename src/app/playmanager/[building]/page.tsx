import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth';
import { getDevelopmentFallbackTeam, getTeam } from '@/lib/playmanager/team';
import { formatGel } from '@/lib/playmanager/economy';
import { getTeamFacilities } from '@/lib/playmanager/facilities';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { getCombinedClubEffects, getManagerProgression } from '@/lib/playmanager/progression';
import { MarketStudio } from '@/components/playmanager/market-studio';
import { BuildingPageClient } from './building-page-client';

export const dynamic = 'force-dynamic';

const BUILDING_META: Record<string, { label: string; description: string; status: string }> = {
  arena:     { label: 'მთავარი არენა',      description: 'მატჩები, ბილეთები, ფანების ენერგია',             status: 'აქტიური' },
  market:    { label: 'მარკეტი',           description: 'სკაუტინგი, აუქციონი, კონტრაქტები',              status: 'მალე'    },
  academy:   { label: 'აკადემია',           description: 'ახალგაზრდები და OVR პროგრესი',                  status: 'მალე'    },
  training:  { label: 'საწვრთნელი ბაზა',   description: 'ფორმა, ფიტნესი, ტაქტიკა',                       status: 'მალე'    },
  finance:   { label: 'ოფისი',             description: 'ტრანსფერები, აგენტები, აკადემია, ბალანსი, ხელფასები',  status: 'აქტიური' },
  league:    { label: 'ლიგის ცენტრი',      description: 'ცხრილი, კალენდარი, მეტოქეები',                   status: 'მალე'    },
  media:     { label: 'კომუნიკაციები',       description: 'ჩატი, მესენჯერი, განცხადებები და მოლაპარაკებები', status: 'მალე'    },
  medical:   { label: 'სამედიცინო ცენტრი', description: 'მოთამაშეების გამოჯანმრთელება, ტრავმების შემცირება', status: 'მალე' },
  residence: { label: 'საცხოვრებელი ბაზა', description: 'გუნდი, აკადემია და მოთამაშეების განთავსება',     status: 'მალე'    },
};

const BUILDING_SCALE: Record<string, { anchorX: number; anchorY: number; scale: number; tone: 'green' | 'red' | 'gold' }> = {
  arena:     { anchorX: 0.695, anchorY: 0.705, scale: 1.86, tone: 'green' },
  market:    { anchorX: 0.215, anchorY: 0.49,  scale: 1.32, tone: 'red'   },
  academy:   { anchorX: 0.27,  anchorY: 0.94,  scale: 1.67, tone: 'green' },
  training:  { anchorX: 0.975, anchorY: 0.26,  scale: 1.72, tone: 'green' },
  finance:   { anchorX: 0.6,   anchorY: 0.92,  scale: 1.1,  tone: 'gold'  },
  league:    { anchorX: 0.935, anchorY: 0.595, scale: 1.3,  tone: 'red'   },
  media:     { anchorX: 0.93,  anchorY: 0.925, scale: 1.27, tone: 'green' },
  medical:   { anchorX: 0.48,  anchorY: 0.22,  scale: 1.2,  tone: 'green' },
  residence: { anchorX: 0.18,  anchorY: 0.18,  scale: 1.3,  tone: 'green' },
};

// The page renders a synchronous shell (background) and pushes ALL data fetching
// into <BuildingData>, wrapped in <Suspense>. The shell paints instantly together
// with the persistent left nav (from the layout), so navigating between buildings
// streams only the inner content — the full-page skeleton never appears.
export default function BuildingPage({ params }: { params: Promise<{ building: string }> }) {
  return (
    <div className="relative min-h-screen w-full bg-[#020806]">
      <Suspense fallback={<BuildingContentSkeleton />}>
        <BuildingData params={params} />
      </Suspense>
    </div>
  );
}

async function BuildingData({ params }: { params: Promise<{ building: string }> }) {
  const { building: buildingKey } = await params;
  if (buildingKey === 'finance') {
    redirect('/playmanager/office');
  }
  const resolvedKey = buildingKey === 'office' ? 'finance' : buildingKey;
  const meta = BUILDING_META[resolvedKey];
  if (!meta) notFound();

  const user = await getSession();
  const isDevBypass = process.env.NODE_ENV === 'development';
  if (!user && !isDevBypass) redirect(`/auth/login?next=/playmanager/${resolvedKey}`);

  const team = user ? await getTeam(user.id) : await getDevelopmentFallbackTeam();
  if (!team) redirect('/playmanager/create-team');

  // The transfer market is its own dedicated, paginated experience — it does NOT
  // need the (heavy) city snapshot, so we render it directly and skip that fetch.
  if (resolvedKey === 'market') {
    const profileClient = user ? await createSupabaseServerClient() : createSupabaseAdminClient();
    const { data: marketProfile } = await profileClient
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', team.user_id)
      .maybeSingle();
    const marketManagerName =
      marketProfile?.display_name ||
      marketProfile?.username ||
      (user?.user_metadata?.display_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      user?.email?.split('@')[0] ||
      'Manager';
    return (
      <MarketStudio
        team={{ name: team.name, balanceLabel: formatGel(team.balance), divisionLabel: `D${team.division_id}` }}
        manager={{
          name: marketManagerName,
          avatarUrl: marketProfile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined) || null,
        }}
      />
    );
  }

  const snapshotMode: 'light' | undefined = resolvedKey === 'media' ? 'light' : undefined;

  // Fetch facilities, the city snapshot and the manager profile concurrently —
  // the profile query no longer waits for the snapshot to resolve first.
  const [facilities, citySnapshot, profileResult] = await Promise.all([
    getTeamFacilities(team.id),
    getPlayManagerCitySnapshot(team.id, snapshotMode ? { mode: snapshotMode } : undefined),
    (async () => {
      const profileClient = user ? await createSupabaseServerClient() : createSupabaseAdminClient();
      return profileClient
        .from('profiles')
        .select('username, display_name, avatar_url, xp')
        .eq('id', team.user_id)
        .maybeSingle();
    })(),
  ]);
  const profile = profileResult.data;

  const managerName =
    profile?.display_name ||
    profile?.username ||
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Manager';
  const managerUsername =
    profile?.username ||
    (user?.user_metadata?.username as string | undefined) ||
    user?.email?.split('@')[0] ||
    'manager';
  const managerAvatarUrl =
    profile?.avatar_url ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    null;

  const managerProgression = getManagerProgression(profile?.xp ?? 0);
  const clubEffects = getCombinedClubEffects(managerProgression, facilities);
  const pos = BUILDING_SCALE[resolvedKey] ?? { anchorX: 0.5, anchorY: 0.5, scale: 1, tone: 'green' as const };

  const building = {
    label: meta.label,
    description: meta.description,
    status: meta.status,
    spriteKey: resolvedKey,
    spriteUrl: `/playmanager/city/buildings/${resolvedKey}.webp`,
    anchorX: pos.anchorX,
    anchorY: pos.anchorY,
    scale: pos.scale,
    tone: pos.tone,
  };

  return (
    <BuildingPageClient
      building={building}
      initialFacilities={facilities}
      manager={{
        name: managerName,
        username: managerUsername,
        avatarUrl: managerAvatarUrl,
        xp: managerProgression.xp,
        level: managerProgression.level,
        title: managerProgression.title,
        progressPercent: managerProgression.progressPercent,
        xpToNextLevel: managerProgression.xpToNextLevel,
        perks: managerProgression.perks,
      }}
      team={{
        name: team.name,
        balanceLabel: formatGel(team.balance),
        divisionId: team.division_id,
        divisionLabel: `D${team.division_id}`,
        formPercent: citySnapshot.formPercent,
      }}
      clubEffects={clubEffects}
      citySnapshot={citySnapshot}
    />
  );
}

// Content-only skeleton (the shell + persistent nav are already painted). A calm,
// building-agnostic "header + list & side panel" shimmer that reads correctly for
// any module (chat, market, finance, announcements…).
function BuildingContentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-8 w-56 animate-pulse rounded-full bg-white/10" />
          <div className="mt-2.5 h-3 w-40 animate-pulse rounded-full bg-white/[0.07]" />
        </div>
        <div className="h-12 w-44 animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>

      <div className="mt-5 rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(9,18,15,0.92),rgba(3,8,6,0.96))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-5 w-44 animate-pulse rounded-full bg-white/10" />
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-xl bg-white/[0.06]" />
            <div className="h-9 w-24 animate-pulse rounded-xl bg-white/[0.06]" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                <div className="mt-3 h-6 w-28 animate-pulse rounded-full bg-white/[0.08]" />
                <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                <div className="h-11 w-11 flex-none animate-pulse rounded-xl bg-white/10" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-1/3 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-white/[0.07]" />
                </div>
                <div className="h-8 w-16 flex-none animate-pulse rounded-lg bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
