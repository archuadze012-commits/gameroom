import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { formatGel } from '@/lib/playmanager/economy';
import { getTeamFacilities } from '@/lib/playmanager/facilities';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { getCombinedClubEffects, getManagerProgression } from '@/lib/playmanager/progression';
import { BuildingPageClient } from './building-page-client';

export const dynamic = 'force-dynamic';

const BUILDING_META: Record<string, { label: string; description: string; status: string }> = {
  arena:     { label: 'მთავარი არენა',      description: 'მატჩები, ბილეთები, ფანების ენერგია',             status: 'აქტიური' },
  market:    { label: 'სატრანსფერო ჰაბი',  description: 'სკაუტინგი, აუქციონი, კონტრაქტები',              status: 'მალე'    },
  academy:   { label: 'აკადემია',           description: 'ახალგაზრდები და OVR პროგრესი',                  status: 'მალე'    },
  training:  { label: 'საწვრთნელი ბაზა',   description: 'ფორმა, ფიტნესი, ტაქტიკა',                       status: 'მალე'    },
  finance:   { label: 'ფინანსური ოფისი',   description: 'ბალანსი, ხელფასები, სპონსორები',                 status: 'აქტიური' },
  league:    { label: 'ლიგის ცენტრი',      description: 'ცხრილი, კალენდარი, მეტოქეები',                   status: 'მალე'    },
  media:     { label: 'მედია თაუერი',       description: 'სიახლეები და ფანების რეაქცია',                   status: 'მალე'    },
  medical:   { label: 'სამედიცინო ცენტრი', description: 'მოთამაშეების გამოჯანმრთელება, ტრავმების შემცირება', status: 'მალე' },
  residence: { label: 'საცხოვრებელი ბაზა', description: 'გუნდის ზომის ლიმიტი, მოთამაშეების განთავსება',  status: 'მალე'    },
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

export default async function BuildingPage({
  params,
}: {
  params: Promise<{ building: string }>;
}) {
  const { building: buildingKey } = await params;
  const meta = BUILDING_META[buildingKey];
  if (!meta) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/playmanager');

  const team = await getTeam(user.id);
  if (!team) redirect('/playmanager/create-team');

  const [facilities, citySnapshot] = await Promise.all([
    getTeamFacilities(team.id),
    getPlayManagerCitySnapshot(team.id),
  ]);

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url, xp')
    .eq('id', user.id)
    .single();

  const managerName =
    profile?.display_name ||
    profile?.username ||
    (user.user_metadata?.display_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split('@')[0] ||
    'Manager';
  const managerUsername =
    profile?.username ||
    (user.user_metadata?.username as string | undefined) ||
    user.email?.split('@')[0] ||
    'manager';
  const managerAvatarUrl =
    profile?.avatar_url ||
    (user.user_metadata?.avatar_url as string | undefined) ||
    null;

  const managerProgression = getManagerProgression(profile?.xp ?? 0);
  const clubEffects = getCombinedClubEffects(managerProgression, facilities);
  const pos = BUILDING_SCALE[buildingKey] ?? { anchorX: 0.5, anchorY: 0.5, scale: 1, tone: 'green' as const };

  const building = {
    label: meta.label,
    description: meta.description,
    status: meta.status,
    spriteKey: buildingKey,
    spriteUrl: `/playmanager/city/buildings/${buildingKey}.webp`,
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
