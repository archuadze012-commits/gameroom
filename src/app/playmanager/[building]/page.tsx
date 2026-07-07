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

// arena and academy have dedicated route dirs (src/app/playmanager/arena, .../academy)
// that win over this [building] catch-all, so they are never served here — no entry needed.
// Every building below renders real, working modules (see the spriteKey branches
// in playmanager-city-editor), so all are marked აქტიური — the old "მალე" badges
// mislabelled functional pages as coming-soon.
const BUILDING_META: Record<string, { label: string; description: string; status: string }> = {
  market:    { label: 'მარკეტი',           description: 'სკაუტინგი, აუქციონი, კონტრაქტები',              status: 'აქტიური' },
  training:  { label: 'საწვრთნელი ბაზა',   description: 'ფორმა, ფიტნესი, ტაქტიკა',                       status: 'აქტიური' },
  finance:   { label: 'ოფისი',             description: 'ტრანსფერები, აგენტები, აკადემია, ბალანსი, ხელფასები',  status: 'აქტიური' },
  league:    { label: 'ლიგის ცენტრი',      description: 'ცხრილი, კალენდარი, მეტოქეები',                   status: 'აქტიური' },
  media:     { label: 'კომუნიკაციები',       description: 'ჩატი, მესენჯერი, განცხადებები და მოლაპარაკებები', status: 'აქტიური' },
  medical:   { label: 'სამედიცინო ცენტრი', description: 'მოთამაშეების გამოჯანმრთელება, ტრავმების შემცირება', status: 'აქტიური' },
  residence: { label: 'საცხოვრებელი ბაზა', description: 'გუნდი, აკადემია და მოთამაშეების განთავსება',     status: 'აქტიური' },
};

const BUILDING_SCALE: Record<string, { anchorX: number; anchorY: number; scale: number; tone: 'green' | 'red' | 'gold' }> = {
  market:    { anchorX: 0.215, anchorY: 0.49,  scale: 1.32, tone: 'red'   },
  training:  { anchorX: 0.975, anchorY: 0.26,  scale: 1.72, tone: 'green' },
  finance:   { anchorX: 0.6,   anchorY: 0.92,  scale: 1.1,  tone: 'gold'  },
  league:    { anchorX: 0.935, anchorY: 0.595, scale: 1.3,  tone: 'red'   },
  media:     { anchorX: 0.93,  anchorY: 0.925, scale: 1.27, tone: 'green' },
  medical:   { anchorX: 0.48,  anchorY: 0.22,  scale: 1.2,  tone: 'green' },
  residence: { anchorX: 0.18,  anchorY: 0.18,  scale: 1.3,  tone: 'green' },
};

const BUILDING_SPRITE_SRC: Record<string, string> = {
  market: '/playmanager/city/buildings/gamestore.webp',
  training: '/playmanager/city/buildings/training.webp',
  finance: '/playmanager/city/buildings/headquarters.webp',
  league: '/playmanager/city/buildings/trophy_hall.webp',
  media: '/playmanager/city/buildings/fountain.webp',
  medical: '/playmanager/city/buildings/medical.webp',
  residence: '/playmanager/city/buildings/tower.webp',
};

// The page awaits its data directly (no inner <Suspense> streaming). The nearest
// loading.tsx ([building]/loading.tsx — a bare background) covers the fetch, so
// there's a single, fast, animation-free fallback instead of a streamed skeleton
// that could get stuck in a hidden buffer during hydration.
export default async function BuildingPage({ params }: { params: Promise<{ building: string }> }) {
  return (
    <div className="relative min-h-screen w-full bg-[#020806]">
      <BuildingData params={params} />
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
  // team.user_id is nullable in the schema (bot teams have none); prefer the
  // actual authenticated id when we have one, since that's always the same
  // value for a real manager anyway.
  const managerId = user?.id ?? team.user_id;

  // The transfer market is its own dedicated, paginated experience — it does NOT
  // need the (heavy) city snapshot, so we render it directly and skip that fetch.
  if (resolvedKey === 'market') {
    const profileClient = user ? await createSupabaseServerClient() : createSupabaseAdminClient();
    const { data: marketProfile } = managerId
      ? await profileClient
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', managerId)
          .maybeSingle()
      : { data: null };
    const marketManagerName =
      marketProfile?.display_name ||
      marketProfile?.username ||
      (user?.user_metadata?.display_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      user?.email?.split('@')[0] ||
      'Manager';
    return (
      <MarketStudio
        team={{ id: team.id, name: team.name, balanceLabel: formatGel(team.balance), divisionLabel: `D${team.division_id}` }}
        manager={{
          name: marketManagerName,
          avatarUrl: marketProfile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined) || null,
        }}
      />
    );
  }

  const snapshotMode: 'light' | 'residence' | undefined =
    resolvedKey === 'media' ? 'light' : resolvedKey === 'residence' ? 'residence' : undefined;

  // Fetch facilities, the city snapshot and the manager profile concurrently —
  // the profile query no longer waits for the snapshot to resolve first.
  const [facilities, citySnapshot, profileResult] = await Promise.all([
    getTeamFacilities(team.id),
    getPlayManagerCitySnapshot(team.id, snapshotMode ? { mode: snapshotMode } : undefined),
    (async () => {
      if (!managerId) return { data: null };
      const profileClient = user ? await createSupabaseServerClient() : createSupabaseAdminClient();
      return profileClient
        .from('profiles')
        .select('username, display_name, avatar_url, xp')
        .eq('id', managerId)
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
    spriteUrl: BUILDING_SPRITE_SRC[resolvedKey] ?? `/playmanager/city/buildings/${resolvedKey}.webp`,
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

