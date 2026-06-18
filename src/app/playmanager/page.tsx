import {
  Banknote,
  Dumbbell,
  Home,
  Landmark,
  RadioTower,
  Stethoscope,
  Store,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { redirect } from 'next/navigation';
import type { ComponentType } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getTeam } from '@/lib/playmanager/team';
import { formatGel } from '@/lib/playmanager/economy';
import { getTeamFacilities } from '@/lib/playmanager/facilities';
import { getPlayManagerCitySnapshot } from '@/lib/playmanager/city-data';
import { getCombinedClubEffects, getManagerProgression } from '@/lib/playmanager/progression';
import { PlayManagerCityEditor } from '@/components/playmanager/playmanager-city-editor';

export const dynamic = 'force-dynamic';

type CityBuilding = {
  label: string;
  description: string;
  status: string;
  spriteKey: string;
  anchorX: number;
  anchorY: number;
  scale: number;
  tone: 'green' | 'red' | 'gold';
  icon: ComponentType<{ className?: string }>;
};

const cityBuildings: CityBuilding[] = [
  {
    label: 'მთავარი არენა',
    description: 'მატჩები, ბილეთები, ფანების ენერგია',
    status: 'აქტიური',
    spriteKey: 'arena',
    anchorX: 0.695,
    anchorY: 0.705,
    scale: 1.86,
    tone: 'green',
    icon: Trophy,
  },
  {
    label: 'სატრანსფერო ჰაბი',
    description: 'სკაუტინგი, აუქციონი, კონტრაქტები',
    status: 'მალე',
    spriteKey: 'market',
    anchorX: 0.215,
    anchorY: 0.49,
    scale: 1.32,
    tone: 'red',
    icon: Store,
  },
  {
    label: 'აკადემია',
    description: 'ახალგაზრდები და OVR პროგრესი',
    status: 'მალე',
    spriteKey: 'academy',
    anchorX: 0.27,
    anchorY: 0.94,
    scale: 1.67,
    tone: 'green',
    icon: UsersRound,
  },
  {
    label: 'საწვრთნელი ბაზა',
    description: 'ფორმა, ფიტნესი, ტაქტიკა',
    status: 'მალე',
    spriteKey: 'training',
    anchorX: 0.975,
    anchorY: 0.26,
    scale: 1.72,
    tone: 'green',
    icon: Dumbbell,
  },
  {
    label: 'ფინანსური ოფისი',
    description: 'ბალანსი, ხელფასები, სპონსორები',
    status: 'აქტიური',
    spriteKey: 'finance',
    anchorX: 0.6,
    anchorY: 0.92,
    scale: 1.1,
    tone: 'gold',
    icon: Banknote,
  },
  {
    label: 'ლიგის ცენტრი',
    description: 'ცხრილი, კალენდარი, მეტოქეები',
    status: 'მალე',
    spriteKey: 'league',
    anchorX: 0.935,
    anchorY: 0.595,
    scale: 1.3,
    tone: 'red',
    icon: Landmark,
  },
  {
    label: 'მედია თაუერი',
    description: 'სიახლეები და ფანების რეაქცია',
    status: 'მალე',
    spriteKey: 'media',
    anchorX: 0.93,
    anchorY: 0.925,
    scale: 1.27,
    tone: 'green',
    icon: RadioTower,
  },
  {
    label: 'სამედიცინო ცენტრი',
    description: 'მოთამაშეების გამოჯანმრთელება, ტრავმების შემცირება',
    status: 'მალე',
    spriteKey: 'medical',
    anchorX: 0.48,
    anchorY: 0.22,
    scale: 1.2,
    tone: 'green',
    icon: Stethoscope,
  },
  {
    label: 'საცხოვრებელი ბაზა',
    description: 'გუნდის ზომის ლიმიტი, მოთამაშეების განთავსება',
    status: 'მალე',
    spriteKey: 'residence',
    anchorX: 0.18,
    anchorY: 0.18,
    scale: 1.3,
    tone: 'green',
    icon: Home,
  },
];

export default async function PlayManagerDashboard() {
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

  function buildingSpriteUrl(spriteKey: string): string {
    return `/playmanager/city/buildings/${spriteKey}.webp`;
  }
  const editorStateKey = JSON.stringify({
    facilities,
    formPercent: citySnapshot.formPercent,
    transactionCount: citySnapshot.transactions.length,
    matchCount: citySnapshot.matchHistory.length,
    eventCount: citySnapshot.eventFeed.length,
    clock: citySnapshot.clock,
    finance: citySnapshot.finance,
    nextMatchLabel: citySnapshot.nextMatchLabel,
    cupMatch: citySnapshot.upcomingCupMatch,
    marketCount: citySnapshot.market.length,
    staffCount: citySnapshot.staff.members.filter((member) => member.isHired).length,
    squadCount: citySnapshot.squad.length,
    matchSettings: citySnapshot.matchSettings,
    lineupSignature: citySnapshot.squad.map((player) => `${player.id}:${player.lineupSlot ?? 'x'}:${player.role}`).join('|'),
  });
  return (
    <>
      <link
        rel="preload"
        as="image"
        href="/playmanager/city/environment/football-city-background.webp"
        fetchPriority="high"
      />
    <div className="text-white">
      <section>
        <div className="pm-neon-frame pm-playmanager-frame relative overflow-hidden bg-[#020806] shadow-[0_28px_100px_rgba(0,0,0,0.62)]">


          <div className="pm-playmanager-game-shell">
            <PlayManagerCityEditor
              key={editorStateKey}
              initialBuildings={cityBuildings.map(({ label, description, status, spriteKey, anchorX, anchorY, scale, tone }) => ({
                label,
                description,
                status,
                spriteKey,
                spriteUrl: buildingSpriteUrl(spriteKey),
                anchorX,
                anchorY,
                scale,
                tone,
              }))}
              backgroundUrl="/playmanager/city/environment/football-city-background.webp"
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
              initialFacilities={facilities}
              citySnapshot={citySnapshot}
            />
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
